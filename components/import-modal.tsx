"use client";

import { useState, useEffect } from 'react';
import { X, Upload, Check, Palette, MessageSquare, Cpu } from 'lucide-react';
import { Button } from '@heroui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/store/chat-store';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (selected: { chats: boolean; theme: boolean; ollamaModel: boolean }) => void;
    availableData: {
        chats: boolean;
        theme: boolean;
        ollamaModel: boolean;
    };
}

export function ImportModal({ isOpen, onClose, onImport, availableData }: ImportModalProps) {
    const { theme } = useChatStore();
    const [selectedOptions, setSelectedOptions] = useState({
        chats: false,
        theme: false,
        ollamaModel: false
    });

    // Auto-select available options when modal opens or data changes
    useEffect(() => {
        if (isOpen) {
            setSelectedOptions({
                chats: availableData.chats,
                theme: availableData.theme,
                ollamaModel: availableData.ollamaModel
            });
        }
    }, [isOpen, availableData]);

    const handleImportClick = () => {
        onImport(selectedOptions);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative w-full max-w-md flex flex-col rounded-2xl overflow-hidden pointer-events-auto"
                            style={{
                                background: 'rgba(0, 0, 0, 0.4)',
                                backdropFilter: 'blur(20px)',
                                WebkitBackdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                            }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/10">
                                <div>
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <Upload className="h-5 w-5 text-white" /> Import Data
                                    </h2>
                                    <p className="text-xs text-zinc-400 mt-1">Select data to import</p>
                                </div>
                                <Button
                                    isIconOnly
                                    variant="light"
                                    onPress={onClose}
                                    className="h-8 w-8 min-w-8 rounded-full"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6">

                                {/* Options */}
                                <div className="space-y-3">
                                    <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">Available Data</label>

                                    {/* Chats Option */}
                                    <div
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-xl border transition-colors",
                                            availableData.chats
                                                ? "bg-white/5 border-white/10 cursor-pointer hover:bg-white/10"
                                                : "bg-white/5 border-white/5 opacity-50 cursor-not-allowed"
                                        )}
                                        onClick={() => availableData.chats && setSelectedOptions(prev => ({ ...prev, chats: !prev.chats }))}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-2 rounded-lg bg-blue-500/20 text-blue-400")}>
                                                <MessageSquare className="h-4 w-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">Chat History</span>
                                                {!availableData.chats && <span className="text-[10px] text-zinc-500">Not found in file</span>}
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                                            selectedOptions.chats ? "bg-primary border-primary text-white" : "border-zinc-600"
                                        )}>
                                            {selectedOptions.chats && <Check className="h-3 w-3" />}
                                        </div>
                                    </div>

                                    {/* Theme Option */}
                                    <div
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-xl border transition-colors",
                                            availableData.theme
                                                ? "bg-white/5 border-white/10 cursor-pointer hover:bg-white/10"
                                                : "bg-white/5 border-white/5 opacity-50 cursor-not-allowed"
                                        )}
                                        onClick={() => availableData.theme && setSelectedOptions(prev => ({ ...prev, theme: !prev.theme }))}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-2 rounded-lg bg-purple-500/20 text-purple-400")}>
                                                <Palette className="h-4 w-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">Theme Settings</span>
                                                {!availableData.theme && <span className="text-[10px] text-zinc-500">Not found in file</span>}
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                                            selectedOptions.theme ? "bg-primary border-primary text-white" : "border-zinc-600"
                                        )}>
                                            {selectedOptions.theme && <Check className="h-3 w-3" />}
                                        </div>
                                    </div>

                                    {/* Model Option */}
                                    <div
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-xl border transition-colors",
                                            availableData.ollamaModel
                                                ? "bg-white/5 border-white/10 cursor-pointer hover:bg-white/10"
                                                : "bg-white/5 border-white/5 opacity-50 cursor-not-allowed"
                                        )}
                                        onClick={() => availableData.ollamaModel && setSelectedOptions(prev => ({ ...prev, ollamaModel: !prev.ollamaModel }))}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-2 rounded-lg bg-orange-500/20 text-orange-400")}>
                                                <Cpu className="h-4 w-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">Ollama Model</span>
                                                {!availableData.ollamaModel && <span className="text-[10px] text-zinc-500">Not found in file</span>}
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                                            selectedOptions.ollamaModel ? "bg-primary border-primary text-white" : "border-zinc-600"
                                        )}>
                                            {selectedOptions.ollamaModel && <Check className="h-3 w-3" />}
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Footer */}
                            <div className="p-6 pt-0">
                                <Button
                                    className="w-full font-medium"
                                    color="primary"
                                    onPress={handleImportClick}
                                    isDisabled={!selectedOptions.chats && !selectedOptions.theme && !selectedOptions.ollamaModel}
                                    style={{ borderRadius: `${theme.radius}rem` }}
                                >
                                    Import Selected Data
                                </Button>
                            </div>

                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
