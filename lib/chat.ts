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

export interface SendMessageOptions {
    messages: Message[];
    groqApiKey?: string;
    groqModel?: string;
    systemPrompt?: string;
    onChunk: (chunk: string) => void;
    signal?: AbortSignal;
}

export async function sendChatMessage({
    messages,
    groqApiKey = '',
    groqModel = 'meta-llama/llama-4-scout-17b-16e-instruct',
    systemPrompt: systemPromptOption,
    onChunk,
    signal
}: SendMessageOptions) {
    try {
        let systemPrompt = '';
        const chatMessages = [...messages];
        
        if (chatMessages.length > 0 && chatMessages[0].role === 'system') {
            systemPrompt = chatMessages.shift()?.content || ''; 
        }

        const response = await fetch('/api/groq', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: chatMessages.map(m => ({
                    role: m.role,
                    content: m.content
                })),
                systemPrompt: systemPromptOption || systemPrompt, 
                apiKey: groqApiKey,
                model: groqModel
            }),
            signal,
        });

        if (!response.ok) {
            let errorMsg = 'Failed to connect to Groq API';
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorData.details || errorMsg;
            } catch (e) {
                errorMsg = await response.text() || errorMsg;
            }
            throw new Error(errorMsg);
        }

        const usedModel = response.headers.get('X-Groq-Model-Used');
        const requestedModel = response.headers.get('X-Groq-Requested-Model');
        if (usedModel && requestedModel && usedModel !== requestedModel) {
            console.log(`[Groq Fallback] Rate-limited on "${requestedModel}", using fallback "${usedModel}"`);
            if (typeof window !== 'undefined') {
                if ((window as any).__groqRevertTimer) {
                    clearTimeout((window as any).__groqRevertTimer);
                }
                (window as any).__groqOriginalModel = requestedModel;
                (window as any).__groqRevertTimer = setTimeout(() => {
                    console.log(`[Groq Fallback] Reverting to original model: ${requestedModel}`);
                    try {
                        const { useChatStore } = require('@/store/chat-store');
                        const store = useChatStore.getState();
                        if (store.groqModel !== requestedModel) {
                            store.setGroqModel(requestedModel);
                        }
                    } catch (e) {
                        console.error('[Groq Fallback] Could not revert model:', e);
                    }
                    delete (window as any).__groqRevertTimer;
                    delete (window as any).__groqOriginalModel;
                }, 150000); 
            }
        }

        if (!response.body) {
            throw new Error("No response body received from Groq API");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let fullContent = '';
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.replace('data: ', '').trim();
                        if (dataStr === '[DONE]') continue;

                        try {
                            const data = JSON.parse(dataStr);
                            const textChunk = data.choices?.[0]?.delta?.content;
                            if (textChunk) {
                                fullContent += textChunk;
                                onChunk(fullContent);
                            }
                        } catch (e) {}
                    }
                }
            }

            if (buffer && buffer.startsWith('data: ')) {
                const dataStr = buffer.replace('data: ', '').trim();
                if (dataStr !== '[DONE]') {
                    try {
                        const data = JSON.parse(dataStr);
                        const textChunk = data.choices?.[0]?.delta?.content;
                        if (textChunk) {
                            fullContent += textChunk;
                            onChunk(fullContent);
                        }
                    } catch (e) {}
                }
            }
        } finally {
            reader.releaseLock();
        }
    } catch (error) {
        console.error('Chat error:', error);
        throw error;
    }
}

export async function generateChatMetadata(messages: Message[], apiKey: string | undefined, model: string): Promise<{ title: string, icon: string }> {
    try {
        const prompt = `Analyze the conversation and provide a JSON response with two fields:
1. 'title': a short max 5 word title.
2. 'keyword': choose EXACTLY ONE of the following words that best fits the topic: message-circle, code, bug, database, globe, file-text, image, music, video, folder, shopping-cart, heart, star, zap, book-open, lightbulb, cpu, server, terminal, git-branch, palette, mail, user, users, briefcase, calculator, coffee, gamepad-2, wrench, rocket, brain, graduation-cap, car, smile, sun, moon, cloud, shield, lock, key, bell, calendar, clock, map, compass, flag, home, settings, pen-tool, camera, smartphone, plane, scissors, truck, utility-pole, umbrella, tree-pine, snowflake, flame, droplet, atom, beaker, crosshair, shield-alert, alert-triangle, check-circle, info.
Do not wrap in markdown blocks, return ONLY valid JSON like: {"title": "Title", "keyword": "car"}`;
        let jsonString = "";

        await sendChatMessage({
            messages: [...messages, { role: 'user', content: prompt }],
            groqApiKey: apiKey || '',
            groqModel: model,
            onChunk: (chunk) => { jsonString = chunk; }
        });

        // Try to parse the JSON
        let title = "New Chat";
        let keyword = "message-circle";
        try {
            // Find the JSON block if the model hallucinated extra text
            const match = jsonString.match(/\{[\s\S]*\}/);
            const parsed = JSON.parse(match ? match[0] : jsonString);
            title = parsed.title || title;
            keyword = parsed.keyword || keyword;
        } catch (e) {
            console.error('Failed to parse metadata JSON', e, jsonString);
        }

        // Search for the closest matching icon
        const searchResults = fuse.search(keyword);
        const icon = searchResults.length > 0 ? searchResults[0].item : 'message-circle';

        return { title: title.trim(), icon };
    } catch (error) {
        console.error('Error generating chat metadata:', error);
        return { title: "New Chat", icon: "message-circle" };
    }
}
