"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input, Button } from "@heroui/react";
import { useChatStore } from "@/store/chat-store";

interface RenameDialogProps {
    isOpen: boolean;
    onClose: () => void;
    chatId: string;
    currentTitle: string;
}

export function RenameDialog({ isOpen, onClose, chatId, currentTitle }: RenameDialogProps) {
    const { updateChat, theme } = useChatStore();
    const [title, setTitle] = useState(currentTitle);
    const [isDragging, setIsDragging] = useState(false);

    // Reset title when dialog opens
    useEffect(() => {
        if (isOpen) {
            setTitle(currentTitle);
        }
    }, [isOpen, currentTitle]);

    const handleSave = () => {
        if (title.trim()) {
            updateChat(chatId, { title: title.trim() });
        }
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSave();
        } else if (e.key === "Escape") {
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    {/* Dialog */}
                    <div className="fixed inset-0 z-[150] flex items-center justify-center pointer-events-none">
                        <motion.div
                            drag
                            dragMomentum={false}
                            dragElastic={0}
                            onDragStart={() => setIsDragging(true)}
                            onDragEnd={() => setIsDragging(false)}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md mx-4 pointer-events-auto"
                            style={{ cursor: isDragging ? 'grabbing' : 'auto' }}
                        >
                            <div
                                className="glass p-6 select-none"
                                style={{ borderRadius: '0.50rem' }}
                            >
                                <h2
                                    className="text-lg font-semibold mb-4 cursor-grab active:cursor-grabbing"
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    Rename Chat
                                </h2>
                                <div
                                    ref={(node) => {
                                        if (node) {
                                            const stop = (e: Event) => e.stopPropagation();
                                            node.addEventListener('pointerdown', stop);
                                            node.addEventListener('mousedown', stop);
                                            node.addEventListener('touchstart', stop);
                                            return () => {
                                                node.removeEventListener('pointerdown', stop);
                                                node.removeEventListener('mousedown', stop);
                                                node.removeEventListener('touchstart', stop);
                                            };
                                        }
                                    }}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                >
                                    <Input
                                        value={title}
                                        onValueChange={setTitle}
                                        autoFocus
                                        placeholder="Enter chat name..."
                                        variant="flat"
                                        maxLength={400}
                                        classNames={{
                                            inputWrapper: "rename-input-wrapper !border-none !outline-none !shadow-none",
                                            input: "!outline-none focus:!outline-none !border-none"
                                        }}
                                        onKeyDown={handleKeyDown}
                                    />
                                </div>
                                <div className="flex gap-2 mt-4 justify-end">
                                    <Button
                                        variant="light"
                                        onClick={onClose}
                                        style={{ borderRadius: `${theme.radius}rem` }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        color="primary"
                                        onClick={handleSave}
                                        style={{ borderRadius: `${theme.radius}rem` }}
                                    >
                                        Save
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
