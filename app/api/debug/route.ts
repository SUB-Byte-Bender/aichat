import { generateEmbedding } from '@/lib/embeddings';
import { searchDocuments } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// GET /api/debug — Diagnostic endpoint to test the RAG pipeline
// REMOVE THIS IN PRODUCTION
// ---------------------------------------------------------------------------

// Force dynamic rendering — don't prerender at build time
export const dynamic = 'force-dynamic';

export async function GET() {
    const testQuery = 'tell me about Shirajam Munira';
    const results: Record<string, unknown> = {
        query: testQuery,
        steps: {},
    };

    // Step 1: Test embedding generation
    try {
        const startEmbed = Date.now();
        const embedding = await generateEmbedding(testQuery);
        results.steps = {
            ...results.steps as object,
            embedding: {
                success: embedding.length > 0,
                dimensions: embedding.length,
                timeMs: Date.now() - startEmbed,
                sample: embedding.slice(0, 5),
                isEmpty: embedding.length === 0,
            },
        };

        // Step 2: Test Supabase search (only if embedding succeeded)
        if (embedding.length > 0) {
            const startSearch = Date.now();
            const docs = await searchDocuments(embedding, 3);
            results.steps = {
                ...results.steps as object,
                search: {
                    success: docs.length > 0,
                    resultCount: docs.length,
                    timeMs: Date.now() - startSearch,
                    results: docs.map(d => ({
                        id: d.id,
                        similarity: d.similarity,
                        contentPreview: d.content?.substring(0, 100) + '...',
                    })),
                },
            };
        } else {
            results.steps = {
                ...results.steps as object,
                search: {
                    skipped: true,
                    reason: 'Embedding returned empty array — HuggingFace API likely failed',
                },
            };
        }
    } catch (error: unknown) {
        results.error = error instanceof Error ? error.message : String(error);
    }

    return Response.json(results, { status: 200 });
}
