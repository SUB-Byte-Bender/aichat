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
// Options for sendRAGMessage
// ---------------------------------------------------------------------------
export interface SendRAGMessageOptions {
    prompt: string;
    sessionId?: string;
    model: string;
    apiKey?: string;
    history?: Message[];
    signal?: AbortSignal;
    onChunk?: (chunk: string) => void;
}

// ---------------------------------------------------------------------------
// sendRAGMessage — calls POST /api/chat (local Next.js API route)
// ---------------------------------------------------------------------------
export async function sendRAGMessage({
    prompt,
    sessionId = 'default_user_session',
    model,
    apiKey,
    history = [],
    signal,
    onChunk
}: SendRAGMessageOptions): Promise<{ reply: string; sources: string[] }> {
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            session_id: sessionId,
            message: prompt,
            api_key: apiKey || null,
            model,
            history: history.map(m => ({ role: m.role, content: m.content })),
        }),
        signal,
    });

    if (!response.ok) {
        let errorMsg = 'Failed to get AI response';
        try {
            const errorData = await response.json();
            errorMsg = errorData.detail || errorData.error || errorMsg;
        } catch {
            errorMsg = await response.text() || errorMsg;
        }
        throw new Error(errorMsg);
    }

    let reply = '';
    const sources: string[] = [];

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
        // Non-streaming fallback
        const raw = await response.text();

        try {
            const parsed = JSON.parse(raw);
            if (typeof parsed === 'string') {
                reply = parsed;
            } else if (parsed && typeof parsed === 'object') {
                reply = parsed.reply || parsed.response || parsed.answer || JSON.stringify(parsed);
                sources.push(...(Array.isArray(parsed.sources) ? parsed.sources : []));
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
// generateChatMetadata — calls POST /api/metadata (local Next.js API route)
//
// The backend returns { title, keyword } and we resolve the keyword to a
// Lucide icon name via Fuse.js (or directly if it's already valid).
// ---------------------------------------------------------------------------
export async function generateChatMetadata(
    userMessage: string,
    apiKey: string | undefined,
    model: string,
): Promise<{ title: string; icon: string }> {
    const FALLBACK_TITLE = 'New Chat';
    const FALLBACK_ICON = 'message-circle';

    try {
        const response = await fetch('/api/metadata', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: userMessage,
                api_key: apiKey || null,
                model,
            }),
        });

        if (!response.ok) {
            console.error('/api/metadata returned', response.status);
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
