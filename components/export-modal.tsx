"use client";

import { useState, useEffect } from 'react';
import { X, Download, Calendar, Check, Palette, MessageSquare, Cpu, ChevronRight } from 'lucide-react';
import { Button, Input } from '@heroui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/store/chat-store';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
    const { chats, theme, themeRadii } = useChatStore();

    const [selectedOptions, setSelectedOptions] = useState({
        chats: true,
        theme: true
    });

    const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
        start: '',
        end: ''
    });

    // Clear date range when the section is collapsed
    useEffect(() => {
        if (!isDateRangeOpen) {
            setDateRange({ start: '', end: '' });
        }
    }, [isDateRangeOpen]);

    const handleExport = () => {
        try {
            const exportData: any = {
                exportDate: new Date().toISOString(),
                version: '1.0'
            };

            // Export Chats
            if (selectedOptions.chats) {
                let chatsToExport = [...chats];

                // Filter by date range if provided
                if (dateRange.start || dateRange.end) {
                    const startDate = dateRange.start ? new Date(dateRange.start).getTime() : 0;
                    // Set end date to end of day if provided
                    const endDate = dateRange.end ? new Date(dateRange.end).setHours(23, 59, 59, 999) : Infinity;

                    chatsToExport = chats.filter(chat => {
                        const chatDate = chat.lastModified || chat.createdAt;
                        return chatDate >= startDate && chatDate <= endDate;
                    });
                }
                exportData.chats = chatsToExport;
            }

            // Export Theme
            if (selectedOptions.theme) {
                exportData.theme = theme;
                exportData.themeRadii = themeRadii;
            }



            // Generate File
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;

            // Generate filename
            const dateStr = new Date().toISOString().split('T')[0];
            const parts = ['ulala-export'];
            if (selectedOptions.chats) parts.push('chats');
            if (selectedOptions.theme) parts.push('theme');
            link.download = `${parts.join('-')}-${dateStr}.json`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success('Export successful!');
            onClose();
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export data');
        }
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
                                        <Download className="h-5 w-5 text-white" /> Export Data
                                    </h2>
                                    <p className="text-xs text-zinc-400 mt-1">Select data to export</p>
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
                                    <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">Includes</label>

                                    {/* Chats Option */}
                                    <div
                                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                                        onClick={() => setSelectedOptions(prev => ({ ...prev, chats: !prev.chats }))}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-2 rounded-lg bg-blue-500/20 text-blue-400")}>
                                                <MessageSquare className="h-4 w-4" />
                                            </div>
                                            <span className="text-sm font-medium">Chat History</span>
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
                                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                                        onClick={() => setSelectedOptions(prev => ({ ...prev, theme: !prev.theme }))}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-2 rounded-lg bg-purple-500/20 text-purple-400")}>
                                                <Palette className="h-4 w-4" />
                                            </div>
                                            <span className="text-sm font-medium">Theme Settings</span>
                                        </div>
                                        <div className={cn(
                                            "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                                            selectedOptions.theme ? "bg-primary border-primary text-white" : "border-zinc-600"
                                        )}>
                                            {selectedOptions.theme && <Check className="h-3 w-3" />}
                                        </div>
                                    </div>


                                </div>

                                {/* Date Range - Only show if Chats selected */}
                                {selectedOptions.chats && (
                                    <div className="space-y-3 pt-2 border-t border-white/10">
                                        <button
                                            onClick={() => setIsDateRangeOpen(!isDateRangeOpen)}
                                            className="w-full flex items-center justify-between group"
                                        >
                                            <label className="text-xs font-medium uppercase tracking-wide text-zinc-500 flex items-center gap-2 cursor-pointer group-hover:text-zinc-300 transition-colors">
                                                <Calendar className="h-3 w-3" /> Date Range (Optional)
                                            </label>
                                            <ChevronRight className={cn(
                                                "h-4 w-4 text-zinc-500 transition-transform duration-200",
                                                isDateRangeOpen && "rotate-90"
                                            )} />
                                        </button>

                                        <AnimatePresence>
                                            {isDateRangeOpen && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="grid grid-cols-2 gap-3 pb-1">
                                                        <div>
                                                            <label className="text-[10px] text-zinc-400 mb-1 block">Start Date</label>
                                                            <Input
                                                                type="date"
                                                                value={dateRange.start}
                                                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                                                classNames={{
                                                                    input: "text-xs",
                                                                    inputWrapper: "h-9 bg-white/5 border-white/10"
                                                                }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-zinc-400 mb-1 block">End Date</label>
                                                            <Input
                                                                type="date"
                                                                value={dateRange.end}
                                                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                                                classNames={{
                                                                    input: "text-xs",
                                                                    inputWrapper: "h-9 bg-white/5 border-white/10"
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}


                            </div>

                            {/* Footer */}
                            <div className="p-6 pt-0">
                                <Button
                                    className="w-full font-medium"
                                    color="primary"
                                    onPress={handleExport}
                                    isDisabled={!selectedOptions.chats && !selectedOptions.theme}
                                    style={{ borderRadius: `${theme.radius}rem` }}
                                >
                                    Export Selected Data
                                </Button>
                            </div>

                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
