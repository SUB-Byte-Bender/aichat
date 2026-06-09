import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Server-only Supabase client for document search
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
// Full-text search via Supabase RPC
// Uses PostgreSQL text search — no external embedding API needed.
// For 71 chunks, this is fast and effective. The LLM handles the
// semantic understanding in the final answer.
// ---------------------------------------------------------------------------

/**
 * Searches documents using PostgreSQL full-text search.
 * Extracts keywords from the query, matches against document content,
 * and ranks by relevance using ts_rank.
 *
 * Falls back to ILIKE if full-text search returns no results.
 */
export async function searchDocuments(
    queryText: string,
    matchCount: number = 3,
): Promise<DocumentResult[]> {
    if (!queryText || queryText.trim().length === 0) {
        console.warn('[Supabase] Empty query text');
        return [];
    }

    try {
        const supabase = getClient();

        // First try: RPC function (if it exists and works with text)
        const rpcResult = await tryRpcSearch(supabase, queryText, matchCount);
        if (rpcResult.length > 0) {
            console.log(`[Supabase] RPC search found ${rpcResult.length} results`);
            return rpcResult;
        }

        // Second try: Direct full-text search using PostgreSQL
        const ftsResult = await tryFullTextSearch(supabase, queryText, matchCount);
        if (ftsResult.length > 0) {
            console.log(`[Supabase] Full-text search found ${ftsResult.length} results`);
            return ftsResult;
        }

        // Third try: Simple ILIKE keyword matching (always works)
        const ilikeResult = await tryILikeSearch(supabase, queryText, matchCount);
        console.log(`[Supabase] ILIKE search found ${ilikeResult.length} results`);
        return ilikeResult;

    } catch (err) {
        console.error('[Supabase] searchDocuments error:', err);
        return [];
    }
}

/**
 * Try the match_documents_text RPC function (if deployed).
 */
async function tryRpcSearch(
    supabase: SupabaseClient,
    queryText: string,
    matchCount: number,
): Promise<DocumentResult[]> {
    try {
        const { data, error } = await supabase.rpc('match_documents_text', {
            query_text: queryText,
            match_count: matchCount,
        });

        if (error) {
            // Function might not exist yet — that's OK, fall through
            console.log('[Supabase] match_documents_text RPC not available:', error.message);
            return [];
        }

        return (data as DocumentResult[]) || [];
    } catch {
        return [];
    }
}

/**
 * PostgreSQL full-text search using to_tsvector/plainto_tsquery.
 * Works without any custom functions — uses PostgREST textSearch filter.
 */
async function tryFullTextSearch(
    supabase: SupabaseClient,
    queryText: string,
    matchCount: number,
): Promise<DocumentResult[]> {
    try {
        const { data, error } = await supabase
            .from('documents')
            .select('id, content, metadata')
            .textSearch('content', queryText, {
                type: 'websearch',
                config: 'english',
            })
            .limit(matchCount);

        if (error || !data || data.length === 0) {
            return [];
        }

        return data.map((doc, index) => ({
            id: doc.id,
            content: doc.content,
            metadata: doc.metadata || {},
            similarity: 1 - index * 0.1, // Approximate rank score
        }));
    } catch {
        return [];
    }
}

/**
 * Fallback: simple keyword matching using ILIKE.
 * Extracts individual words from the query and matches any of them.
 * Always works regardless of PostgreSQL configuration.
 */
async function tryILikeSearch(
    supabase: SupabaseClient,
    queryText: string,
    matchCount: number,
): Promise<DocumentResult[]> {
    try {
        // Extract meaningful keywords (skip short/common words)
        const stopWords = new Set([
            'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been',
            'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
            'would', 'could', 'should', 'may', 'might', 'can', 'shall',
            'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
            'as', 'into', 'about', 'like', 'through', 'after', 'between',
            'out', 'against', 'during', 'without', 'before', 'above',
            'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both',
            'it', 'its', 'this', 'that', 'these', 'those', 'i', 'me',
            'my', 'we', 'our', 'you', 'your', 'he', 'she', 'they',
            'them', 'their', 'what', 'which', 'who', 'whom', 'how',
            'tell', 'know', 'say', 'get', 'make', 'go', 'see',
        ]);

        const keywords = queryText
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 2 && !stopWords.has(w));

        if (keywords.length === 0) {
            // If no meaningful keywords, try with original words
            const fallbackWords = queryText.split(/\s+/).filter(w => w.length > 2);
            if (fallbackWords.length === 0) return [];
            keywords.push(...fallbackWords.map(w => w.toLowerCase()));
        }

        // Build OR filter: content matches any keyword
        const orFilter = keywords
            .map(kw => `content.ilike.%${kw}%`)
            .join(',');

        const { data, error } = await supabase
            .from('documents')
            .select('id, content, metadata')
            .or(orFilter)
            .limit(matchCount);

        if (error || !data) {
            console.error('[Supabase] ILIKE search error:', error?.message);
            return [];
        }

        // Score results by number of keyword matches
        const scored = data.map(doc => {
            const contentLower = doc.content.toLowerCase();
            const matchCount = keywords.filter(kw => contentLower.includes(kw)).length;
            return {
                id: doc.id,
                content: doc.content,
                metadata: doc.metadata || {},
                similarity: matchCount / keywords.length,
            };
        });

        // Sort by match score descending
        scored.sort((a, b) => b.similarity - a.similarity);

        return scored;
    } catch {
        return [];
    }
}
