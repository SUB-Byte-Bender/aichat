import { generateEmbedding } from '@/lib/embeddings';
import { searchDocuments } from '@/lib/supabase';
import { callGroqStreaming, type GroqMessage } from '@/lib/groq';

// ---------------------------------------------------------------------------
// POST /api/chat — Main RAG pipeline
//
// 1. Embed user message → 384-dim vector
// 2. Search Supabase pgvector → top 3 matching chunks
// 3. Build system prompt with context + history
// 4. Stream Groq LLM response back as text/plain
// ---------------------------------------------------------------------------

interface ChatRequestBody {
    message: string;
    session_id: string;
    history?: { role: 'user' | 'assistant'; content: string }[];
    api_key?: string;
    model?: string;
}

export async function POST(req: Request) {
    try {
        const body: ChatRequestBody = await req.json();
        const { message, history = [], api_key, model } = body;

        if (!message || typeof message !== 'string') {
            return new Response(JSON.stringify({ error: 'Message is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // ----- Step 1: Generate embedding -----
        console.log('[/api/chat] Generating embedding...');
        const embedding = await generateEmbedding(message);

        // ----- Step 2: Search for relevant context -----
        console.log('[/api/chat] Searching documents...');
        const docs = await searchDocuments(embedding, 3);
        const context = docs.length > 0
            ? docs.map(d => d.content).join('\n')
            : 'No relevant documents found.';

        console.log(`[/api/chat] Found ${docs.length} relevant chunks`);

        // ----- Step 3: Format history (last 4 messages) -----
        const recentHistory = history.slice(-4);
        const historyText = recentHistory.length > 0
            ? recentHistory.map(m =>
                `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`
            ).join('\n')
            : '';

        // ----- Step 4: Build system prompt (from original backend) -----
        const systemPrompt = `You are a helpful AI assistant. Use the following context to answer the user's question.

Context:
${context}

Previous Conversation:
${historyText}

User: ${message}
AI:`;

        // ----- Step 5: Call Groq with streaming -----
        const messages: GroqMessage[] = [
            { role: 'user', content: systemPrompt },
        ];

        const { response: groqResponse } = await callGroqStreaming({
            messages,
            model,
            apiKey: api_key,
            temperature: 0.5,
        });

        // ----- Step 6: Parse SSE stream → plain text stream -----
        const stream = new ReadableStream({
            async start(controller) {
                const reader = groqResponse.body?.getReader();
                if (!reader) {
                    controller.close();
                    return;
                }

                const decoder = new TextDecoder('utf-8');
                let buffer = '';

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });

                        // Process complete SSE lines
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || ''; // Keep incomplete line in buffer

                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed || !trimmed.startsWith('data: ')) continue;

                            const data = trimmed.slice(6); // Remove 'data: ' prefix
                            if (data === '[DONE]') continue;

                            try {
                                const parsed = JSON.parse(data);
                                const content = parsed.choices?.[0]?.delta?.content;
                                if (content) {
                                    controller.enqueue(new TextEncoder().encode(content));
                                }
                            } catch {
                                // Skip malformed JSON chunks
                            }
                        }
                    }
                } catch (err) {
                    console.error('[/api/chat] Stream processing error:', err);
                } finally {
                    reader.releaseLock();
                    controller.close();
                }
            },
        });

        // Return as text/plain stream — matches the old backend's StreamingResponse
        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[/api/chat] Error:', message);
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
