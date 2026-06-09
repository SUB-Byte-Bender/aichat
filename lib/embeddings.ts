// ---------------------------------------------------------------------------
// Embedding generation via HuggingFace Inference API
//
// Uses the sentence-transformers/all-MiniLM-L6-v2 model (384-dim vectors).
// The Inference API handles mean pooling automatically for sentence-transformers
// models, producing the same output as the Python sentence_transformers library.
//
// Vercel-friendly: zero local dependencies, just a fetch() call.
// ---------------------------------------------------------------------------

const HF_INFERENCE_URL =
    'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2';

/**
 * Generates a 384-dimensional embedding vector for the given text.
 * Uses the HuggingFace Inference API (free tier).
 *
 * Falls back gracefully — returns an empty array if the API is unavailable,
 * which causes the chat to work without RAG context.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const response = await fetch(HF_INFERENCE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // HuggingFace API key is optional for public models but
                // helps with rate limits
                ...(process.env.HF_API_TOKEN
                    ? { Authorization: `Bearer ${process.env.HF_API_TOKEN}` }
                    : {}),
            },
            body: JSON.stringify({
                inputs: text,
                options: {
                    wait_for_model: true,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Embeddings] HuggingFace API error (${response.status}):`, errorText);
            return [];
        }

        const data = await response.json();

        // Handle different response formats:
        // 1. Flat array: [0.1, 0.2, ...] — direct sentence embedding (384 floats)
        // 2. Nested array: [[0.1, 0.2, ...]] — batch response with 1 input
        // 3. Token-level: [[tok1], [tok2], ...] — raw token embeddings (need pooling)
        const embedding = extractEmbedding(data);

        if (embedding.length === 0) {
            console.error('[Embeddings] Could not extract valid embedding from response. Shape:', describeShape(data));
        } else {
            console.log(`[Embeddings] Generated ${embedding.length}-dim vector`);
        }

        return embedding;
    } catch (err) {
        console.error('[Embeddings] Failed to generate embedding:', err);
        return [];
    }
}

/**
 * Extracts a single 384-dim embedding from the API response,
 * handling all known response formats.
 */
function extractEmbedding(data: unknown): number[] {
    if (!Array.isArray(data)) return [];

    // Case 1: Flat array of numbers — [0.1, 0.2, ...] (384 floats)
    if (data.length > 0 && typeof data[0] === 'number') {
        return data as number[];
    }

    // Case 2: Nested array — [[0.1, 0.2, ...]]
    if (data.length > 0 && Array.isArray(data[0])) {
        const inner = data[0];

        // Sub-case 2a: Single sentence embedding — [[0.1, 0.2, ...]] (inner = 384 numbers)
        if (inner.length > 0 && typeof inner[0] === 'number' && inner.length <= 1024) {
            return inner as number[];
        }

        // Sub-case 2b: Token-level embeddings — [[tok1_384], [tok2_384], ...]
        // Need mean pooling: average across all tokens
        if (inner.length > 0 && Array.isArray(inner[0])) {
            return meanPool(data[0] as number[][]);
        }
    }

    return [];
}

/**
 * Mean pooling over token-level embeddings.
 * Input: array of token embeddings, each 384-dim.
 * Output: single 384-dim vector (averaged across tokens).
 */
function meanPool(tokenEmbeddings: number[][]): number[] {
    if (tokenEmbeddings.length === 0) return [];

    const dim = tokenEmbeddings[0].length;
    const result = new Float64Array(dim);

    for (const tokenEmb of tokenEmbeddings) {
        for (let i = 0; i < dim; i++) {
            result[i] += tokenEmb[i];
        }
    }

    const numTokens = tokenEmbeddings.length;
    const output: number[] = new Array(dim);
    for (let i = 0; i < dim; i++) {
        output[i] = result[i] / numTokens;
    }

    // L2 normalize for cosine similarity
    let norm = 0;
    for (let i = 0; i < dim; i++) {
        norm += output[i] * output[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
        for (let i = 0; i < dim; i++) {
            output[i] /= norm;
        }
    }

    return output;
}

/**
 * Describes the shape of a nested array for debugging.
 */
function describeShape(data: unknown): string {
    if (!Array.isArray(data)) return typeof data;
    if (data.length === 0) return '[]';
    if (typeof data[0] === 'number') return `[${data.length} numbers]`;
    if (Array.isArray(data[0])) {
        if (typeof data[0][0] === 'number') return `[${data.length}][${data[0].length} numbers]`;
        if (Array.isArray(data[0][0])) return `[${data.length}][${data[0].length}][${data[0][0].length} numbers]`;
    }
    return `[${data.length} ${typeof data[0]}]`;
}
