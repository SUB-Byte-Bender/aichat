import { callGroqNonStreaming } from '@/lib/groq';

// ---------------------------------------------------------------------------
// POST /api/metadata — Title & keyword generation for new chats
//
// Calls Groq (non-streaming) to generate a short title and a physical object
// keyword from the user's first message. The keyword is resolved to a Lucide
// icon name on the client side via Fuse.js.
// ---------------------------------------------------------------------------

interface MetadataRequestBody {
    message: string;
    api_key?: string;
    model?: string;
}

export async function POST(req: Request) {
    try {
        const body: MetadataRequestBody = await req.json();
        const { message, api_key, model } = body;

        if (!message || typeof message !== 'string') {
            return Response.json(
                { title: 'New Chat', keyword: 'message-square' },
                { status: 200 },
            );
        }

        // Prompt from the original backend (verbatim)
        const prompt = `Analyze the conversation and provide a JSON response with two fields:
1. 'title': a short max 5 word title.
2. 'keyword': a single highly common, physical object noun representing the topic (e.g. 'rocket', 'droplet', 'calculator', 'camera'). Do NOT use abstract concepts or verbs like 'greeting' or 'addition'.
Do not wrap in markdown blocks, return ONLY valid JSON like: {"title": "Title", "keyword": "car"}

Conversation/Message: ${message}`;

        const { content } = await callGroqNonStreaming({
            messages: [{ role: 'user', content: prompt }],
            model,
            apiKey: api_key,
            temperature: 0.5,
        });

        // Parse the LLM response
        try {
            // Strip markdown json blocks if the LLM adds them (safety catch)
            const cleaned = content
                .replace(/```json\s*/gi, '')
                .replace(/```\s*/g, '')
                .trim();

            const parsed = JSON.parse(cleaned);
            return Response.json({
                title: typeof parsed.title === 'string' ? parsed.title : 'New Chat',
                keyword: typeof parsed.keyword === 'string' ? parsed.keyword : 'message-square',
            });
        } catch {
            console.error('[/api/metadata] Failed to parse LLM response:', content);
            return Response.json({ title: 'New Chat', keyword: 'message-square' });
        }

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[/api/metadata] Error:', message);
        return Response.json({ title: 'New Chat', keyword: 'message-square' });
    }
}
