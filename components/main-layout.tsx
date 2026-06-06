"use client";

import * as React from "react";
import { useChatStore } from "@/store/chat-store";
import { ThemeProvider } from "@/components/theme-provider";
import { HeroUIProvider } from "@heroui/react";
import { Toaster, toast } from "react-hot-toast";
import { SidebarProvider } from "@/components/ui/sidebar";

export function MainLayout({ children }: { children: React.ReactNode }) {
    const { theme } = useChatStore();
    // Hydration fix
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <HeroUIProvider>
            <ThemeProvider theme={theme}>
                <SidebarProvider>
                    {children}

                </SidebarProvider>
            </ThemeProvider>
            <div onClick={(e) => {
                const target = e.target as HTMLElement;
                // Check for the specific class we added to the toast options
                const toastEl = target.closest('.glass-toast');
                if (toastEl && toastEl.textContent?.includes('Copied to clipboard!')) {
                    toast.dismiss('copy-success');
                }
            }}>
                <Toaster
                    position="bottom-right"
                    containerStyle={{
                        bottom: '16px',
                        right: '16px',
                        left: '16px',
                    }}
                    toastOptions={{
                        duration: 5000,
                        className: 'glass-toast',
                        success: {
                            duration: 2500,
                            style: {
                                background: 'rgba(34, 197, 94, 0.15)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                color: '#fff',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                borderRadius: '0.75rem',
                                padding: '16px 20px',
                                fontSize: '14px',
                                fontWeight: '500',
                                boxShadow: '0 8px 32px rgba(34, 197, 94, 0.2)',
                                maxWidth: '420px',
                                cursor: 'pointer',
                                zIndex: 9999999,
                            },
                        },
                        error: {
                            duration: 5000,
                            style: {
                                background: 'rgba(220, 38, 38, 0.15)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                color: '#fff',
                                border: '1px solid rgba(220, 38, 38, 0.3)',
                                borderRadius: '0.75rem',
                                padding: '16px 20px',
                                fontSize: '14px',
                                fontWeight: '500',
                                boxShadow: '0 8px 32px rgba(220, 38, 38, 0.2)',
                                maxWidth: '420px',
                                cursor: 'pointer',
                                zIndex: 9999999,
                            },
                        },
                    }}
                />
            </div>
        </HeroUIProvider>
    );
}
