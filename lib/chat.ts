import Fuse from 'fuse.js';
import dynamicIconImports from 'lucide-react/dynamicIconImports';

const iconKeys = Object.keys(dynamicIconImports);
const fuse = new Fuse(iconKeys, {
    threshold: 0.3,
    distance: 100,
});

export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

// ---------------------------------------------------------------------------
// Backend URL (from environment, never hard-coded in components)
// ---------------------------------------------------------------------------
const RAG_API_URL =
    process.env.NEXT_PUBLIC_RAG_API_URL ||
    'https://barber-lunar-default.ngrok-free.dev';

// ---------------------------------------------------------------------------
// TypeScript types for the FastAPI RAG backend
// ---------------------------------------------------------------------------

/** POST /metadata — request body */
export interface MetadataRequest {
    message: string;
    api_key?: string | null;
    model?: string | null;
}

/** POST /metadata — response */
export interface MetadataResponse {
    title: string;
    keyword: string;
}

/** POST /chat — request body (matches ChatRequest schema in OpenAPI) */
export interface ChatRequest {
    session_id: string;
    message: string;
    api_key?: string | null;
    model?: string | null;
}

/** Shape returned by sendRAGMessage after parsing the backend response */
export interface RAGResponse {
    reply: string;
    sources: string[];
}

// ---------------------------------------------------------------------------
// Options for sendRAGMessage (kept for backward compat with chat-interface)
// ---------------------------------------------------------------------------
export interface SendRAGMessageOptions {
    prompt: string;
    sessionId?: string;
    model: string;
    apiKey?: string;
    vibe?: string;
    signal?: AbortSignal;
    onChunk?: (chunk: string) => void;
}

// ---------------------------------------------------------------------------
// sendRAGMessage — calls POST /chat on the FastAPI backend
// ---------------------------------------------------------------------------
export async function sendRAGMessage({
    prompt,
    sessionId = 'default_user_session',
    model,
    apiKey,
    vibe = 'Default',
    signal,
    onChunk
}: SendRAGMessageOptions): Promise<RAGResponse> {
    const response = await fetch(`${RAG_API_URL}/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Required for ngrok free tier to bypass the browser warning page
            'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
            session_id: sessionId,
            message: prompt,
            api_key: apiKey || null,
            model,
        }),
        signal,
    });

    if (!response.ok) {
        let errorMsg = 'Failed to connect to RAG backend';
        try {
            const errorData = await response.json();
            errorMsg = errorData.detail || errorData.error || errorMsg;
        } catch {
            errorMsg = await response.text() || errorMsg;
        }
        throw new Error(errorMsg);
    }

    let reply = '';
    let sources: string[] = [];

    if (onChunk && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunkText = decoder.decode(value, { stream: true });
                if (chunkText) {
                    reply += chunkText;
                    onChunk(reply);
                }
            }
        } finally {
            reader.releaseLock();
        }
    } else {
        // Backend may return a plain string or a JSON object.
        // Handle both gracefully to stay resilient.
        const raw = await response.text();

        try {
            const parsed = JSON.parse(raw);
            if (typeof parsed === 'string') {
                // JSON-encoded string (e.g. "\"Hello world\"")
                reply = parsed;
            } else if (parsed && typeof parsed === 'object') {
                reply = parsed.reply || parsed.response || parsed.answer || JSON.stringify(parsed);
                sources = Array.isArray(parsed.sources) ? parsed.sources : [];
            } else {
                reply = String(parsed);
            }
        } catch {
            // Plain text response (not JSON)
            reply = raw;
        }
    }

    return { reply, sources };
}

// ---------------------------------------------------------------------------
// generateChatMetadata — calls POST /metadata on the FastAPI backend
//
// Replaces the old Groq-based approach. The backend returns { title, keyword }
// and we resolve the keyword to a Lucide icon name via Fuse.js (or directly
// if the keyword is already a valid Lucide icon name).
// ---------------------------------------------------------------------------
export async function generateChatMetadata(
    userMessage: string,
    apiKey: string | undefined,
    model: string,
): Promise<{ title: string; icon: string }> {
    const FALLBACK_TITLE = 'New Chat';
    const FALLBACK_ICON = 'message-circle';

    try {
        const body: MetadataRequest = {
            message: userMessage,
            api_key: apiKey || null,
            model,
        };

        const response = await fetch(`${RAG_API_URL}/metadata`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            console.error('Backend /metadata returned', response.status);
            return { title: FALLBACK_TITLE, icon: FALLBACK_ICON };
        }

        const data = await response.json();

        // Safely extract title & keyword with fallbacks
        const title: string =
            (typeof data?.title === 'string' && data.title.trim()) || FALLBACK_TITLE;
        const keyword: string =
            (typeof data?.keyword === 'string' && data.keyword.trim()) || FALLBACK_ICON;

        // Resolve keyword → Lucide icon name
        // 1. If the keyword (kebab-cased) is already a valid Lucide icon, use directly
        const normalizedKeyword = keyword
            .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
            .toLowerCase();

        if (iconKeys.includes(normalizedKeyword)) {
            return { title: title.trim(), icon: normalizedKeyword };
        }

        // 2. Otherwise fuzzy-match via Fuse.js (existing behavior)
        const searchResults = fuse.search(keyword);
        const icon =
            searchResults.length > 0 ? searchResults[0].item : FALLBACK_ICON;

        return { title: title.trim(), icon };
    } catch (error) {
        console.error('Error generating chat metadata:', error);
        return { title: FALLBACK_TITLE, icon: FALLBACK_ICON };
    }
}
