import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { Message } from '@/lib/chat';
import { ThemeConfig } from '@/components/theme-provider';

export interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    createdAt: number;
    lastModified?: number; // Optional for backward compatibility
    icon?: string;
}

interface ChatState {
    chats: ChatSession[];
    currentChatId: string | null;
    loadingChatId: string | null; // ID of chat currently generating AI response
    theme: ThemeConfig;
    themeRadii: Record<string, number>;
    groqApiKey: string; // API key for Groq
    groqModel: string; // Groq model identifier

    // Actions
    addChat: (chat: ChatSession) => void;
    updateChat: (id: string, updates: Partial<ChatSession>) => void;
    deleteChat: (id: string) => void;
    setCurrentChatId: (id: string | null) => void;
    setLoadingChatId: (id: string | null) => void;
    addMessageToChat: (chatId: string, message: Message) => void;
    updateLastMessage: (chatId: string, content: string) => void;
    setTheme: (theme: ThemeConfig) => void;
    setThemeRadius: (themeName: string, radius: number) => void;
    setGroqApiKey: (key: string) => void;
    setGroqModel: (model: string) => void;
}

// Helper function to detect if user is on mobile device
const isMobileDevice = (): boolean => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};



// Custom storage using idb-keyval for larger storage limits than localStorage
const storage = {
    getItem: async (name: string): Promise<string | null> => {
        return (await get(name)) || null;
    },
    setItem: async (name: string, value: string): Promise<void> => {
        await set(name, value);
    },
    removeItem: async (name: string): Promise<void> => {
        await del(name);
    },
};

export const useChatStore = create<ChatState>()(
    persist(
        (set, get) => ({
            chats: [],
            currentChatId: null,
            loadingChatId: null,
            theme: {
                name: 'Forest',
                primary: '150 60% 40%', // Green
                radius: 0.5,
                bgFrom: '#134e5e',
                bgVia: '#71b280',
                bgTo: '#134e5e',
                glassColor: 'rgba(19, 78, 94, 0.3)',
                buttonColor: '#4db380',
                textColor: '#ffffff',
            },
            themeRadii: {
                'Midnight': 0.5,
                'Nebula': 0.5,
                'Sunset': 0.5,
                'Forest': 0.5,
                'Slate': 0.5,
            },

            groqApiKey: '',
            groqModel: process.env.NEXT_PUBLIC_DEFAULT_GROQ_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',


            addChat: (chat) => set((state) => ({
                chats: [chat, ...state.chats],
                currentChatId: chat.id
            })),

            updateChat: (id, updates) => set((state) => ({
                chats: state.chats.map((c) => (c.id === id ? { ...c, ...updates } : c)),
            })),

            deleteChat: (id) => set((state) => ({
                chats: state.chats.filter((c) => c.id !== id),
                currentChatId: state.currentChatId === id ? null : state.currentChatId,
            })),

            setCurrentChatId: (id) => set({ currentChatId: id }),

            setLoadingChatId: (id) => set({ loadingChatId: id }),



            addMessageToChat: (chatId, message) => set((state) => ({
                chats: state.chats.map((c) =>
                    c.id === chatId
                        ? { ...c, messages: [...c.messages, message], lastModified: Date.now() }
                        : c
                ),
            })),

            updateLastMessage: (chatId, content) => set((state) => ({
                chats: state.chats.map((c) => {
                    if (c.id === chatId && c.messages.length > 0) {
                        const newMessages = [...c.messages];
                        newMessages[newMessages.length - 1] = {
                            ...newMessages[newMessages.length - 1],
                            content: content
                        };
                        return { ...c, messages: newMessages, lastModified: Date.now() };
                    }
                    return c;
                }),
            })),

            setTheme: (theme) => set({ theme }),

            setThemeRadius: (themeName, radius) => set((state) => ({
                themeRadii: { ...state.themeRadii, [themeName]: radius }
            })),

            setGroqApiKey: (key) => set({ groqApiKey: key }),
            setGroqModel: (model) => set({ groqModel: model }),

        }),
        {
            name: 'chat-storage',
            storage: createJSONStorage(() => storage),
            partialize: (state) => ({
                chats: state.chats,
                currentChatId: state.currentChatId,
                theme: state.theme,
                themeRadii: state.themeRadii,
                groqApiKey: state.groqApiKey,
                groqModel: state.groqModel,

            }),
        }
    )
);
