// ---------------------------------------------------------------------------
// Shared Groq API helpers with automatic model fallback
// Extracted from app/api/groq/route.ts for reuse across /api/chat & /api/metadata
// ---------------------------------------------------------------------------

// Ordered fallback model list
export const FALLBACK_MODELS = [
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'llama-3.3-70b-versatile',
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'openai/gpt-oss-safeguard-20b',
    'llama-3.1-8b-instant',
    'groq/compound',
    'qwen/qwen3-32b',
];

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface GroqMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface GroqCallOptions {
    messages: GroqMessage[];
    model?: string;
    apiKey?: string;
    temperature?: number;
}

/**
 * Returns an ordered list of models to try, starting from the requested model
 * and cycling through fallbacks.
 */
export function getOrderedModels(requestedModel: string): string[] {
    const startIdx = FALLBACK_MODELS.indexOf(requestedModel);
    if (startIdx !== -1) {
        return [
            ...FALLBACK_MODELS.slice(startIdx),
            ...FALLBACK_MODELS.slice(0, startIdx),
        ];
    }
    // Custom model not in list — try it first, then all fallbacks
    return [requestedModel, ...FALLBACK_MODELS];
}

/**
 * Resolves the API key to use: custom > env var.
 * Throws if none available.
 */
function resolveApiKey(customKey?: string): string {
    const key = customKey || process.env.GROQ_API_KEY;
    if (!key) {
        throw new Error('Groq API key not configured.');
    }
    return key;
}

/**
 * Calls Groq with streaming enabled. Tries the requested model first,
 * then falls back through FALLBACK_MODELS on 429/5xx errors.
 *
 * Returns the raw Response object on success (for SSE streaming).
 * Throws on unrecoverable errors (401, 4xx non-rate-limit).
 */
export async function callGroqStreaming(opts: GroqCallOptions): Promise<{ response: Response; usedModel: string }> {
    const apiKey = resolveApiKey(opts.apiKey);
    const defaultModel = process.env.NEXT_PUBLIC_DEFAULT_GROQ_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
    const requestedModel = (opts.model || defaultModel).trim();
    const modelsToTry = getOrderedModels(requestedModel);

    let lastError = '';

    for (const tryModel of modelsToTry) {
        console.log('[Groq Streaming] Trying model:', tryModel);

        const resp = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: tryModel,
                messages: opts.messages,
                temperature: opts.temperature ?? 0.5,
                stream: true,
            }),
        });

        if (resp.ok) {
            console.log('[Groq Streaming] Success with model:', tryModel);
            return { response: resp, usedModel: tryModel };
        }

        const errorText = await resp.text();
        console.error(`[Groq Streaming] Model ${tryModel} failed:`, resp.status, errorText);

        if (resp.status === 401) {
            throw new Error('Invalid Groq API Key.');
        }

        // Only fallback on rate limit (429) or server errors (5xx)
        if (resp.status !== 429 && resp.status < 500) {
            throw new Error(`Model "${tryModel}" error (${resp.status}): ${errorText}`);
        }

        lastError = errorText;
        console.log(`[Groq Streaming] Rate limited on ${tryModel}, trying next model...`);
    }

    throw new Error(`All Groq models are currently rate-limited. Please wait a minute and try again. Last error: ${lastError}`);
}

/**
 * Calls Groq without streaming. Used for metadata generation.
 * Same model fallback logic as callGroqStreaming.
 *
 * Returns the parsed content string from the LLM response.
 */
export async function callGroqNonStreaming(opts: GroqCallOptions): Promise<{ content: string; usedModel: string }> {
    const apiKey = resolveApiKey(opts.apiKey);
    const defaultModel = process.env.NEXT_PUBLIC_DEFAULT_GROQ_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
    const requestedModel = (opts.model || defaultModel).trim();
    const modelsToTry = getOrderedModels(requestedModel);

    let lastError = '';

    for (const tryModel of modelsToTry) {
        console.log('[Groq NonStreaming] Trying model:', tryModel);

        const resp = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: tryModel,
                messages: opts.messages,
                temperature: opts.temperature ?? 0.5,
                stream: false,
            }),
        });

        if (resp.ok) {
            const data = await resp.json();
            const content = data.choices?.[0]?.message?.content || '';
            console.log('[Groq NonStreaming] Success with model:', tryModel);
            return { content, usedModel: tryModel };
        }

        const errorText = await resp.text();
        console.error(`[Groq NonStreaming] Model ${tryModel} failed:`, resp.status, errorText);

        if (resp.status === 401) {
            throw new Error('Invalid Groq API Key.');
        }

        if (resp.status !== 429 && resp.status < 500) {
            throw new Error(`Model "${tryModel}" error (${resp.status}): ${errorText}`);
        }

        lastError = errorText;
    }

    throw new Error(`All Groq models are currently rate-limited. Last error: ${lastError}`);
}
