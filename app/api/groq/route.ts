import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { messages, systemPrompt, apiKey: customApiKey, model: customModel } = await req.json();
        // Use custom API key if provided, otherwise fall back to env variable
        const apiKey = customApiKey || process.env.GROQ_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'Groq API key not configured.' }, { status: 500 });
        }

        const finalSystemPrompt = systemPrompt || "";

        // Convert messages to OpenAI/Groq format
        // Combine sequential messages of same role if any, and convert 'assistant' to 'model' mapped back to 'assistant'
        const formattedMessages = messages.map((m: any) => ({
            role: m.role === 'model' ? 'assistant' : m.role,
            content: m.content
        }));

        if (finalSystemPrompt) {
            formattedMessages.unshift({
                role: 'system',
                content: finalSystemPrompt
            });
        }

        // Ordered fallback model list
        const FALLBACK_MODELS = [
            'meta-llama/llama-4-scout-17b-16e-instruct',
            'llama-3.3-70b-versatile',
            'openai/gpt-oss-120b',
            'openai/gpt-oss-20b',
            'openai/gpt-oss-safeguard-20b',
            'llama-3.1-8b-instant',
            'groq/compound',
            'qwen/qwen3-32b',
        ];

        const requestedModel = (customModel || process.env.NEXT_PUBLIC_DEFAULT_GROQ_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct').trim();
        console.log('[Groq API] Requested model:', requestedModel);
        console.log('[Groq API] API Key present:', !!apiKey, 'length:', apiKey?.length);

        // Build ordered list: start from requested model, then cycle through the rest
        const startIdx = FALLBACK_MODELS.indexOf(requestedModel);
        let modelsToTry: string[];
        if (startIdx !== -1) {
            modelsToTry = [
                ...FALLBACK_MODELS.slice(startIdx),
                ...FALLBACK_MODELS.slice(0, startIdx)
            ];
        } else {
            // Custom model not in our list — try it first, then all fallbacks
            modelsToTry = [requestedModel, ...FALLBACK_MODELS];
        }

        let lastError = '';
        let usedModel = requestedModel;

        for (const tryModel of modelsToTry) {
            console.log('[Groq API] Trying model:', tryModel);

            const payload = {
                model: tryModel,
                messages: formattedMessages,
                temperature: 0.7,
                stream: true
            };

            const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (resp.ok) {
                usedModel = tryModel;
                console.log('[Groq API] Success with model:', usedModel);

                // Pass the SSE stream directly back to the client
                const stream = new ReadableStream({
                    async start(controller) {
                        if (!resp.body) {
                            controller.close();
                            return;
                        }
                        const reader = resp.body.getReader();

                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            controller.enqueue(value);
                        }
                        controller.close();
                    }
                });

                return new Response(stream, {
                    headers: {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                        'X-Groq-Model-Used': usedModel,
                        'X-Groq-Requested-Model': requestedModel,
                    },
                });
            }

            // Handle non-rate-limit errors immediately (don't fallback)
            const errorText = await resp.text();
            console.error(`[Groq API] Model ${tryModel} failed:`, resp.status, errorText);

            if (resp.status === 401) {
                return NextResponse.json({ error: 'Invalid Groq API Key.', status: 401 }, { status: 401 });
            }

            // Only fallback on rate limit (429) or server errors (5xx)
            if (resp.status !== 429 && resp.status < 500) {
                return NextResponse.json({
                    error: `Model "${tryModel}" error: ${errorText}`,
                    status: resp.status,
                    details: errorText
                }, { status: resp.status });
            }

            lastError = errorText;
            console.log(`[Groq API] Rate limited on ${tryModel}, trying next model...`);
        }

        // All models exhausted
        return NextResponse.json({
            error: 'All Groq models are currently rate-limited. Please wait a minute and try again.',
            status: 429,
            details: lastError
        }, { status: 429 });

    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
    }
}
