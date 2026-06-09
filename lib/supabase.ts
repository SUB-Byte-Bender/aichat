import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Server-only Supabase client for vector search via pgvector
// ---------------------------------------------------------------------------

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
    if (!client) {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!url || !key) {
            throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
        }

        client = createClient(url, key);
    }
    return client;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DocumentResult {
    id: number;
    content: string;
    metadata: Record<string, unknown>;
    similarity: number;
}

// ---------------------------------------------------------------------------
// Vector similarity search via match_documents RPC
// ---------------------------------------------------------------------------

/**
 * Searches the documents table for the closest matching chunks
 * using cosine similarity against the given embedding vector.
 *
 * @param embedding - 384-dimensional vector from generateEmbedding()
 * @param matchCount - Number of results to return (default: 3)
 * @returns Array of matching documents with similarity scores, or empty array on error
 */
export async function searchDocuments(
    embedding: number[],
    matchCount: number = 3,
): Promise<DocumentResult[]> {
    // Guard: don't search with empty embeddings
    if (!embedding || embedding.length === 0) {
        console.warn('[Supabase] Skipping search — embedding is empty');
        return [];
    }

    try {
        const supabase = getClient();

        console.log(`[Supabase] Calling match_documents with ${embedding.length}-dim vector, match_count=${matchCount}`);

        const { data, error } = await supabase.rpc('match_documents', {
            query_embedding: embedding,
            match_count: matchCount,
        });

        if (error) {
            console.error('[Supabase] match_documents RPC error:', error.message, error.details, error.hint);
            return [];
        }

        console.log(`[Supabase] Found ${data?.length || 0} results`);
        return (data as DocumentResult[]) || [];
    } catch (err) {
        console.error('[Supabase] searchDocuments error:', err);
        return [];
    }
}
