"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Bot, Sparkles, Terminal, SunSnow, Plus, Italic, Square } from "lucide-react";
import { useChatStore } from "@/store/chat-store";
import { Button, Textarea, cn } from "@heroui/react";
import { MessageBubble } from "./message-bubble";
import { Message, sendRAGMessage, generateChatMetadata } from "@/lib/chat";
import { motion, AnimatePresence } from "framer-motion";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import toast from "react-hot-toast";
// test
export function ChatInterface() {
    const {
        chats,
        currentChatId,
        setCurrentChatId,

        addChat,
        addMessageToChat,
        updateLastMessage,
        updateChat,
        deleteChat,
        theme,
        groqApiKey,
        groqModel,
        setGroqApiKey,
        setGroqModel,
        loadingChatId,
        setLoadingChatId,
    } = useChatStore();

    const { setOpen, setIsSettingsExpanded, isSettingsExpanded, isMobile } = useSidebar();

    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [visibleMessages, setVisibleMessages] = useState(15);
    const scrollRef = useRef<HTMLDivElement>(null);
    const prevScrollHeight = useRef(0);
    const abortControllerRef = useRef<AbortController | null>(null);

    const currentChat = chats.find((c) => c.id === currentChatId);
    const messages = currentChat?.messages || [];
    const totalMessages = messages.length;
    const displayMessages = messages.slice(Math.max(0, totalMessages - visibleMessages));

    // Reset visible messages when switching chats
    useEffect(() => {
        setVisibleMessages(15);
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [currentChatId]);

    // Scroll to bottom when new messages arrive or loading state changes
    useEffect(() => {
        if (scrollRef.current) {
            const isNearBottom = scrollRef.current.scrollHeight - scrollRef.current.scrollTop - scrollRef.current.clientHeight < 100;
            if (isNearBottom || isLoading) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }
    }, [messages.length, isLoading]);

    // Handle scroll to load older messages
    const handleScroll = () => {
        if (!scrollRef.current) return;

        const { scrollTop } = scrollRef.current;
        const isNearTop = scrollTop < 100;

        if (isNearTop && visibleMessages < totalMessages) {
            prevScrollHeight.current = scrollRef.current.scrollHeight;
            setVisibleMessages(prev => Math.min(prev + 15, totalMessages));
        }
    };

    // Maintain scroll position after loading older messages
    useEffect(() => {
        if (scrollRef.current && prevScrollHeight.current > 0) {
            const newScrollHeight = scrollRef.current.scrollHeight;
            const scrollDiff = newScrollHeight - prevScrollHeight.current;
            scrollRef.current.scrollTop = scrollRef.current.scrollTop + scrollDiff;
            prevScrollHeight.current = 0;
        }
    }, [visibleMessages]);

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsLoading(false);
        setLoadingChatId(null);
    };

    const handleSubmit = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: "user", content: input.trim() };
        const chatId = currentChatId || crypto.randomUUID();

        if (!currentChatId) {
            addChat({
                id: chatId,
                title: "New Chat",
                messages: [userMessage],
                createdAt: Date.now(),
                lastModified: Date.now(),
            });
        } else {
            addMessageToChat(chatId, userMessage);
        }

        setInput("");
        setIsLoading(true);
        setLoadingChatId(chatId); // Also set store loading state

        // Create new AbortController for this request
        abortControllerRef.current = new AbortController();

        try {
            const defaultModel = process.env.NEXT_PUBLIC_DEFAULT_GROQ_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
            const effectiveModel = groqModel || defaultModel;

            // Dismiss any existing error toasts
            toast.dismiss('brain-missing-toast');

            let messageAdded = false;

            // Call the RAG backend (streaming)
            const ragResponse = await sendRAGMessage({
                prompt: userMessage.content,
                sessionId: chatId,
                model: effectiveModel,
                apiKey: groqApiKey || undefined,
                signal: abortControllerRef.current?.signal,
                onChunk: (chunk) => {
                    if (!messageAdded) {
                        setIsLoading(false);
                        setLoadingChatId(null);
                        addMessageToChat(chatId, { role: "assistant", content: chunk });
                        messageAdded = true;
                    } else {
                        updateLastMessage(chatId, chunk);
                    }
                }
            });

            if (!messageAdded) {
                addMessageToChat(chatId, { role: "assistant", content: ragResponse.reply });
            }

            if (!currentChatId) {
                let title: string;
                let icon: string;

                const metadata = await generateChatMetadata(
                    userMessage.content,
                    groqApiKey || undefined,
                    effectiveModel
                );
                title = metadata.title;
                icon = metadata.icon;

                console.log('Generated title:', title, 'icon:', icon);
                updateChat(chatId, { title, icon });
            }

            // Clear store loading state when complete
            setIsLoading(false);
            setLoadingChatId(null);
            abortControllerRef.current = null;

        } catch (error) {
            console.error(error);
            setIsLoading(false);
            setLoadingChatId(null); // Clear store loading state on error
            abortControllerRef.current = null;

            // Don't show error toast if user manually aborted
            if (error instanceof Error && error.name === 'AbortError') {
                return;
            }

            const commonToastStyle = {
                display: 'flex',
                flexDirection: 'column' as const,
                gap: '12px',
                width: '100%',
                maxWidth: '420px'
            };

            const headerStyle = {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                marginBottom: '4px'
            };

            const titleStyle = {
                fontWeight: '600',
                fontSize: '15px',
                color: '#ff6b6b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            };

            const closeButtonStyle = {
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
            };

            const handleOpenSettings = () => {
                setOpen(true);
                setIsSettingsExpanded(true);
            };

            toast.error(
                (t) => (
                    <div style={commonToastStyle}>
                        <div style={headerStyle}>
                            <div style={titleStyle}>
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    background: '#ff1e1eff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '12px'
                                }}>✕</div>
                                Brain Missing
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); toast.dismiss(t.id); }}
                                style={closeButtonStyle}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                            >
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>

                        <div style={{ fontSize: '13px', opacity: 0.85, lineHeight: '1.5', color: 'rgba(255, 255, 255, 0.9)' }}>
                            API is unreachable. Check your API key in <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toast.dismiss(t.id);
                                    handleOpenSettings();
                                }}
                                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                            >settings</span> or verify your internet connection.
                        </div>
                    </div >
                ),
                {
                    id: 'brain-missing-toast',
                    duration: 5000,
                    icon: null,
                }
            );

            // Remove the user message if chat was just created
            if (!currentChatId) {
                deleteChat(chatId);
            }
        }
    };

    return (
        <div className="flex h-full flex-col relative overflow-hidden bg-background/50">
            {/* Header */}
            <header className="glass absolute top-0 left-0 right-0 z-50 flex h-16 items-center justify-center px-6">
                <div className="absolute left-2 flex items-center gap-2">
                    <SidebarTrigger
                        onClick={() => {
                            // If on desktop and settings are expanded, clear the flag immediately
                            // This prevents the sync effect in AppSidebar from re-opening the sidebar
                            if (!isMobile && isSettingsExpanded) {
                                setIsSettingsExpanded(false);
                            }
                        }}
                    />
                    <div
                        className="shadow-lg overflow-hidden hidden md:block"
                        style={{
                            backgroundColor: theme.buttonColor,
                            borderRadius: `${theme.radius}rem`,
                        }}
                    >
                        <Button
                            className="!bg-transparent !text-white hover:scale-105 transition-transform hover:!bg-transparent/90 px-4 h-10 flex items-center gap-2"
                            onClick={() => setCurrentChatId(null)}
                        >
                            <Plus className="h-5 w-5" />
                            <span className="text-sm font-medium">New Chat</span>
                        </Button>
                    </div>
                </div>

                {/* Mobile New Chat Button */}
                <div className="absolute right-2 md:hidden z-20">
                    <div
                        className="shadow-lg overflow-hidden"
                        style={{
                            backgroundColor: theme.buttonColor,
                            borderRadius: `${theme.radius}rem`,
                        }}
                    >
                        <Button
                            isIconOnly
                            className="!bg-transparent !text-white hover:scale-105 transition-transform hover:!bg-transparent/90 h-10 w-10 flex items-center justify-center"
                            onClick={() => setCurrentChatId(null)}
                        >
                            <Plus className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Chat Area */}
            <div ref={scrollRef} onScroll={handleScroll} className="flex-1 h-full w-full overflow-y-auto p-4 pt-20 pb-24 scrollbar-hide overscroll-contain">
                <div className="mx-auto flex max-w-3xl flex-col gap-6">
                    {visibleMessages < totalMessages && (
                        <div className="text-center py-2">
                            <span className="text-xs text-muted-foreground opacity-70">Loading older messages...</span>
                        </div>
                    )}
                    <AnimatePresence initial={false}>
                        {displayMessages.map((m, i) => (
                            <MessageBubble key={i} message={m} />
                        ))}
                    </AnimatePresence>
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex w-full gap-4 p-4 flex-row"
                        >
                            {/* Bot Avatar */}
                            <div
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm bg-cyan-100 border-cyan-200 text-cyan-600 dark:bg-cyan-900/20 dark:border-cyan-800 dark:text-cyan-400"
                            >
                                <Bot className="h-4 w-4" />
                            </div>

                            {/* Message Bubble with Loading Dots */}
                            <div
                                className="flex max-w-[80%] flex-col gap-2 px-4 py-3 text-sm shadow-sm bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50"
                                style={{ borderRadius: `${theme.radius}rem` }}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "0ms" }} />
                                    <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "150ms" }} />
                                    <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Input Area */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background to-transparent">
                <div className="mx-auto max-w-3xl">
                    <div className="glass relative flex items-center gap-2 rounded-3xl p-2 pr-2 transition-all duration-200 overflow-hidden">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400">
                            <Bot className="h-5 w-5" />
                        </div>
                        <Textarea
                            value={input}
                            onValueChange={setInput}
                            placeholder={`Message Ulala AI...`}
                            minRows={1}
                            maxRows={8}
                            variant="flat"
                            disableAnimation
                            className="flex-1 bg-transparent"
                            classNames={{
                                base: "bg-transparent",
                                input: "bg-transparent text-base !text-foreground placeholder:text-zinc-400 !border-0 !outline-0 resize-none",
                                inputWrapper: "bg-transparent shadow-none !border-0 !border-none group-data-[focus=true]:bg-transparent data-[hover=true]:bg-transparent group-data-[focus=true]:!border-0 px-0 h-auto",
                                innerWrapper: "bg-transparent",
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                        />
                        <Button
                            isIconOnly
                            className="h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg shrink-0 self-center flex items-center justify-center"
                            onClick={isLoading ? handleStop : handleSubmit}
                        >
                            {isLoading ? <Square className="h-4 w-4" fill="currentColor" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
