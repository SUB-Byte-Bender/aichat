// ---------------------------------------------------------------------------
// Embedding generation via Supabase Edge Function or HuggingFace Inference API
//
// This replaces the local ONNX model approach. Running all-MiniLM-L6-v2 locally
// exceeds Vercel's 250MB serverless function limit (onnxruntime-node ~250MB,
// onnxruntime-web ~128MB). Instead, we call the free HuggingFace Inference API
// which runs the exact same model remotely.
//
// Output: identical 384-dimensional vectors, cosine-similarity-ready.
// ---------------------------------------------------------------------------

const HF_INFERENCE_URL =
    'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2';

/**
 * Generates a 384-dimensional embedding vector for the given text.
 * Uses the HuggingFace Inference API (free tier, no API key required for
 * public models like all-MiniLM-L6-v2).
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
                // HuggingFace API key is optional for public models
                ...(process.env.HF_API_TOKEN
                    ? { Authorization: `Bearer ${process.env.HF_API_TOKEN}` }
                    : {}),
            },
            body: JSON.stringify({
                inputs: text,
                options: {
                    wait_for_model: true, // Wait if model is cold-starting
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Embeddings] HuggingFace API error (${response.status}):`, errorText);
            return [];
        }

        const embedding: number[] = await response.json();

        // The API returns a nested array for single input: [[0.1, 0.2, ...]]
        // Flatten if needed
        if (Array.isArray(embedding) && Array.isArray(embedding[0])) {
            return embedding[0];
        }

        return embedding;
    } catch (err) {
        console.error('[Embeddings] Failed to generate embedding:', err);
        return [];
    }
}
