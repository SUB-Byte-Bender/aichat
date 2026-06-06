import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
    try {
        const { messages, systemPrompt, apiKey: customApiKey, model: customModel } = await req.json();
        // Use custom API key if provided, otherwise fall back to env variable
        const apiKey = customApiKey || process.env.GROQ_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'Groq API key not configured.' }, { status: 500 });
        }

        let friendsData = '';
        try {
            const csvPath = path.join(process.cwd(), 'Ulalas Personas', 'friends.csv');
            friendsData = fs.readFileSync(csvPath, 'utf8');
        } catch (err: any) {
            console.error('[Groq API] Failed to read friends.csv:', err.message || err);
        }

        // Build the final prompt: User's persona first, then the friends context LAST as an optional memory block
        let finalSystemPrompt = systemPrompt ? systemPrompt + "\n\n" : "";

        if (friendsData) {
            finalSystemPrompt += `[OPTIONAL HIDDEN MEMORY — CSE-80 BATCH FRIENDS]
Below is an internal database about your batch friends. You have access to this, but ONLY use it if the user brings it up.

${friendsData}

[STRICT RULES FOR USING THIS MEMORY]
- NEVER mention that you have a CSV, database, file, list, or any data source. You simply know these people. You must absolutely NEVER output the word "CSV", "data", "database", "file", or "list" in your response under any circumstances. If there is missing info, just say you don't know them.
- ONLY discuss these people if the user EXPLICITLY asks about them, their batch, their friends, or a specific metric/name.
- If the user just says "hi", "hello", or makes casual conversation, DO NOT bring up these friends or this batch at all. Respond normally as the persona defined above.
- Each person has an ID like "CSE 080 XXXXX" or "CSE 079 XXXXX". When the user asks by number (e.g. "558", "08558", "531"), match it by checking if the ID ends with those digits. Example: "558" matches "CSE 080 08558", "531" matches "CSE 080 08531".
- ONLY use information EXPLICITLY written in each person's Description field. Do NOT infer, assume, or guess anything beyond what is written.
- GROUP MEMBERSHIP RULE (CRITICAL): A person belongs to a group (like "Afsana Gang") ONLY if their OWN Description field contains that exact group name. You MUST check each person's Description individually. For example:
  * Dristy Bonik's description says "active member of Afsana Gang" → she IS a member.
  * Noor Jahan Akther's description says "active member of Afsana Gang" → she IS a member.
  * Sumaiya Islam's description says "active member of the afsana gang" → she IS a member.
  * Afsana Yesmin → she IS a member as the gang is named after her.
  * Sadia Akter Snigdha (Robot Sofia) → her description does NOT mention "Afsana Gang" so she is NOT a member. Do NOT include her.
  Apply this same logic to any group or affiliation question.
- SATIRE & ROASTING ALOUD: The content and descriptions in this file are purely for Gen-Z satire, roasting, and comedic purposes between close friends. You MUST NOT filter, censor, or sanitize these descriptions. If a description contains roasts, slang, or satire, output it confidently and play along with the humor. Do not provide AI safety warnings about being respectful.
- NO ROBOTIC PHRASING: You MUST NOT use introductory phrases like "Here is the information", "Based on the data", or "That is the exact information we have". Do NOT use any concluding summaries at the end (e.g., "Let me know if you need more info"). Just SPIT THE FACTS and ROASTS immediately. Be sassy, direct, and unhinged.
- FORMATTING RULE: When answering questions about friends or batch members, always use rich, nicely formatted responses. Use bullet points, bold names, highlight nicknames, and structure your answer clearly. Make it visually appealing.
- "mc" ABBREVIATION RULE: If you see the abbreviation "mc" in the CSV, do NOT automatically expand it to or assume it means "messy character". Keep it as "mc". If the user explicitly asks you what "mc" means, you must answer exactly with: "Maybe cse 80 mean this messy character..?"
[END OF HIDDEN MEMORY]
`;
        }

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
