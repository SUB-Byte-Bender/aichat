import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';

// ---------------------------------------------------------------------------
// Singleton embedding pipeline using all-MiniLM-L6-v2 (384-dim vectors)
// Lazy-loaded on first call, cached for warm reuse across requests.
// ---------------------------------------------------------------------------

let embedder: FeatureExtractionPipeline | null = null;

async function getEmbedder(): Promise<FeatureExtractionPipeline> {
    if (!embedder) {
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
            // Use ONNX backend for Node.js server-side
        }) as FeatureExtractionPipeline;
    }
    return embedder;
}

/**
 * Generates a 384-dimensional embedding vector for the given text.
 * Uses mean pooling + L2 normalization — ready for cosine similarity.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const model = await getEmbedder();
    const output = await model(text, {
        pooling: 'mean',
        normalize: true,
    });

    // output.data is a Float32Array — convert to plain number[]
    return Array.from(output.data as Float32Array);
}
