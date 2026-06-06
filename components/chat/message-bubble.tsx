"use client";

import { Message } from "@/lib/chat";
import { cn } from "@heroui/react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { SunSnow, User, Bot, Copy, Check } from "lucide-react";
import { useChatStore } from "@/store/chat-store";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import "highlight.js/styles/github-dark.css";
import { useState, useRef, useEffect, memo } from "react";

// Recursively extract plain text from React children (spans produced by highlight.js)
function extractText(node: any): string {
    if (node == null) return "";
    if (typeof node === "string") return node;
    if (Array.isArray(node)) return node.map(extractText).join("");
    if (typeof node === "object" && node.props) return extractText(node.props.children);
    return "";
}

// Code Copy Button Component
function CodeCopyButton({ code }: { code: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleTouch = (e: React.TouchEvent) => {
        e.preventDefault();
        handleCopy();
    };

    return (
        <button
            onTouchEnd={handleTouch}
            onClick={handleCopy}
            className="absolute left-0 top-0 bottom-0 w-6 bg-zinc-800 hover:bg-zinc-700 transition-colors flex items-center justify-center text-[10px] font-medium tracking-wider border-r border-zinc-700 hover:text-white"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', color: '#bababa' }}
            title='Copy code'
        >
            {copied ? <span style={{ transform: 'rotate(-180deg)', display: 'inline-block' }}>✓</span> : 'COPY CODE'}
        </button>
    );
}

interface MessageBubbleProps {
    message: Message;
}

export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
    const isUser = message.role === "user";
    const [copied, setCopied] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Use motion value for performant updates without re-renders
    const buttonY = useMotionValue(0);
    const springY = useSpring(buttonY, { stiffness: 500, damping: 35, mass: 0.5 });

    const handleCopy = async () => {
        await navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        // Only track cursor if not selecting text
        if (window.getSelection()?.toString()) {
            return;
        }

        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const relativeY = e.clientY - rect.top;
            // Clamp the button position within the bubble bounds
            const clampedY = Math.max(8, Math.min(relativeY - 16, rect.height - 40));
            buttonY.set(clampedY);
        }
    };

    const { theme } = useChatStore();

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "flex w-full gap-4 p-1 group",
                isUser ? "flex-row-reverse" : "flex-row"
            )}
            onMouseMove={handleMouseMove}
        >
            <div
                className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm",
                    isUser
                        ? "bg-blue-100 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"
                        : "bg-cyan-100 border-cyan-200 text-cyan-600 dark:bg-cyan-900/20 dark:border-cyan-800 dark:text-cyan-400"
                )}
            >
                {isUser ? (
                    <User className="h-4 w-4" />
                ) : (
                    <Bot className="h-4 w-4" />
                )}
            </div>

            <div ref={containerRef} className="relative grid max-w-[80%] min-w-0" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
                <div
                    className={cn(
                        "flex flex-col gap-2 px-4 py-3 text-sm shadow-sm min-w-0",
                        isUser
                            ? "bg-primary [&_*]:!text-white"
                            : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50 border border-zinc-200 dark:border-zinc-600"
                    )}
                    style={{
                        borderRadius: `${theme.radius}rem`,
                    }}
                >
                    <div className={cn(
                        "max-w-none",
                        isUser
                            ? "prose-sm [&_p]:!text-white [&_strong]:!text-white [&_em]:!text-white [&_li]:!text-white [&_code]:!text-white [&_pre]:!bg-zinc-900 [&_pre]:!text-zinc-50"
                            : "prose prose-sm dark:prose-invert prose-code:text-pink-600 dark:prose-code:text-pink-400 prose-pre:bg-zinc-900 prose-pre:text-zinc-50"
                    )}>
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw, rehypeHighlight]}
                            components={{
                                code: ({ node, inline, className, children, ...props }: any) => {
                                    const match = /language-(\w+)/.exec(className || '');
                                    return !inline ? (
                                        <code className={className} style={{ display: 'block', minHeight: '40px' }} {...props}>
                                            {children}
                                        </code>
                                    ) : (
                                        <code className="bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded text-xs" {...props}>
                                            {children}
                                        </code>
                                    );
                                },
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc pl-6 mb-2 space-y-1">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-6 mb-2 space-y-1">{children}</ol>,
                                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                                em: ({ children }) => <em className="italic">{children}</em>,
                                a: ({ children, href }) => <a href={href} className="break-all overflow-wrap-anywhere underline hover:opacity-80" target="_blank" rel="noopener noreferrer">{children}</a>,
                                pre: ({ children }) => {
                                    // children is a <code> element (after highlight) whose descendants may be spans.
                                    const raw = extractText(children);
                                    return (
                                        <div className="relative my-3 min-h-[40px]">
                                            {!isUser && <CodeCopyButton code={raw} />}
                                            <pre
                                                className={cn(
                                                    "bg-zinc-900 text-zinc-50 dark:bg-zinc-950 overflow-x-auto max-w-full",
                                                    isUser
                                                        ? "rounded-lg p-4"
                                                        : "rounded-r-lg rounded-l-none p-4 pl-10"
                                                )}
                                                style={{ minHeight: '40px' }}
                                            >
                                                {children}
                                            </pre>
                                        </div>
                                    );
                                },
                            }}
                        >
                            {message.content}
                        </ReactMarkdown>
                    </div>
                </div>

                {/* Copy button */}
                <motion.button
                    onClick={handleCopy}
                    className={cn(
                        "absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-md bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 shadow-lg z-20",
                        isUser ? "left-[-40px]" : "right-[-40px]"
                    )}
                    style={{ top: springY }}
                    title="Copy message"
                >
                    {copied ? (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                        <Copy className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
                    )}
                </motion.button>
            </div>
        </motion.div>
    );
});
