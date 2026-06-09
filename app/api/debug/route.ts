import { searchDocuments } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/debug — Test the search pipeline (REMOVE IN PRODUCTION)
export async function GET() {
    const testQuery = 'tell me about Shirajam Munira';
    const results: Record<string, unknown> = { query: testQuery };

    try {
        const start = Date.now();
        const docs = await searchDocuments(testQuery, 3);
        results.search = {
            success: docs.length > 0,
            resultCount: docs.length,
            timeMs: Date.now() - start,
            results: docs.map(d => ({
                id: d.id,
                similarity: d.similarity,
                contentPreview: d.content?.substring(0, 150) + '...',
                metadata: d.metadata,
            })),
        };
    } catch (error: unknown) {
        results.error = error instanceof Error ? error.message : String(error);
    }

    // Check env vars
    results.env = {
        supabaseUrlSet: !!process.env.SUPABASE_URL,
        supabaseKeySet: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        groqKeySet: !!process.env.GROQ_API_KEY,
    };

    return Response.json(results, { status: 200 });
}
