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

export async function generateChatNameWithGroq(messages: Message[], apiKey: string | undefined, model: string): Promise<string> {
    try {
        const prompt = "Generate a short, concise title (max 5 words) for this chat conversation. Do not use quotes. Just the title.";
        let title = "";

        await sendChatMessage({
            messages: [...messages, { role: 'user', content: prompt }],
            groqApiKey: apiKey || '',
            groqModel: model,
            onChunk: (chunk) => { title = chunk; }
        });

        return title.trim();
    } catch (error) {
        console.error('Error generating Groq chat name:', error);
        return "New Chat";
    }
}

export async function generateChatIcon(messages: Message[], model: string): Promise<string> {
    try {
        const content = messages.map(m => m.content.toLowerCase()).join(' ');

        const keywordMap: Record<string, string> = {
            'code|programming|function|class|javascript|python|typescript|java|react|vue': 'Code',
            'bug|error|fix|debug|issue|problem': 'Bug',
            'database|sql|query|data|mongodb|postgres': 'Database',
            'web|website|internet|url|http|api': 'Globe',
            'file|document|text|write|read': 'FileText',
            'image|photo|picture|png|jpg|svg': 'Image',
            'music|song|audio|sound|mp3': 'Music',
            'video|movie|film|mp4|youtube': 'Video',
            'folder|directory|organize|structure': 'Folder',
            'shop|cart|buy|purchase|store|ecommerce': 'ShoppingCart',
            'love|like|favorite|heart': 'Heart',
            'star|rating|favorite|best': 'Star',
            'fast|speed|quick|lightning|performance': 'Zap',
            'book|read|learn|study|documentation': 'BookOpen',
            'idea|think|suggest|creative|innovation': 'Lightbulb',
            'cpu|processor|computer|hardware|chip': 'Cpu',
            'server|backend|host|deploy|cloud': 'Server',
            'terminal|command|cli|shell|bash': 'Terminal',
            'git|branch|version|commit|repository': 'GitBranch',
            'color|design|art|draw|paint': 'Palette',
            'email|mail|message|send|contact': 'Mail',
            'user|account|profile|person': 'User',
            'team|group|people|users|collaborate': 'Users',
            'work|business|job|career|office': 'Briefcase',
            'calculate|math|number|count|sum': 'Calculator',
            'coffee|break|relax|cafe': 'Coffee',
            'game|play|gaming|fun|entertainment': 'Gamepad2',
            'tool|fix|repair|build|wrench': 'Wrench',
            'rocket|launch|start|deploy|space': 'Rocket',
            'ai|intelligence|brain|think|smart|artificial': 'Brain',
            'education|school|university|graduate|learn': 'GraduationCap',
            'animal|pet|dog|cat|bird|wildlife|creature': 'Heart',
            'tire|car|vehicle|wheel|automotive': 'Wrench',
        };

        for (const [keywords, icon] of Object.entries(keywordMap)) {
            const keywordRegex = new RegExp(keywords, 'i');
            if (keywordRegex.test(content)) {
                return icon;
            }
        }

        return "MessageCircle";
    } catch (error) {
        console.error('Error generating chat icon:', error);
        return "MessageCircle";
    }
}
