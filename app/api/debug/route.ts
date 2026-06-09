// Force dynamic rendering
export const dynamic = 'force-dynamic';

const HF_URLS = [
    'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2',
    'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
];

export async function GET() {
    const testQuery = 'tell me about Shirajam Munira';
    const results: Record<string, unknown> = { query: testQuery };

    // Test each HuggingFace URL variant
    for (let i = 0; i < HF_URLS.length; i++) {
        const url = HF_URLS[i];
        const key = `hf_url_${i}`;
        try {
            const start = Date.now();
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inputs: testQuery, options: { wait_for_model: true } }),
            });

            const bodyText = await resp.text();
            const elapsed = Date.now() - start;

            let parsed: unknown = null;
            try { parsed = JSON.parse(bodyText); } catch { /* not json */ }

            results[key] = {
                url,
                status: resp.status,
                statusText: resp.statusText,
                timeMs: elapsed,
                bodyPreview: bodyText.substring(0, 500),
                isArray: Array.isArray(parsed),
                ...(Array.isArray(parsed) ? {
                    outerLength: parsed.length,
                    firstElementType: typeof parsed[0],
                    isNested: Array.isArray(parsed[0]),
                    innerLength: Array.isArray(parsed[0]) ? parsed[0].length : undefined,
                    sample: Array.isArray(parsed[0]) ? parsed[0].slice(0, 3) : (typeof parsed[0] === 'number' ? parsed.slice(0, 3) : undefined),
                } : {}),
            };
        } catch (err: unknown) {
            results[key] = {
                url,
                error: err instanceof Error ? err.message : String(err),
                errorType: err instanceof Error ? err.constructor.name : typeof err,
            };
        }
    }

    // Test basic connectivity
    try {
        const resp = await fetch('https://huggingface.co/api/models/sentence-transformers/all-MiniLM-L6-v2');
        results.hf_model_info = { status: resp.status, reachable: resp.ok };
    } catch (err: unknown) {
        results.hf_model_info = { error: err instanceof Error ? err.message : String(err) };
    }

    // Test Supabase connectivity
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        results.supabase_env = {
            urlSet: !!supabaseUrl,
            keySet: !!supabaseKey,
            urlPreview: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'NOT SET',
        };
    } catch {
        results.supabase_env = { error: 'Failed to check env' };
    }

    return Response.json(results, { status: 200 });
}
