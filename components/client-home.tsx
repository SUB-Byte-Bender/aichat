"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { ChatInterface } from "@/components/chat/chat-interface";
import { useVisualViewport } from "@/hooks/use-visual-viewport";
import { useEffect, useState } from "react";

export function ClientHome() {
    // Hydration fix for persisted store
    const [mounted, setMounted] = useState(false);
    const visualViewportHeight = useVisualViewport();

    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    return (
        <>
            <AppSidebar />
            <main
                className="fixed top-0 left-0 w-full md:relative md:inset-auto flex md:h-screen overflow-hidden bg-background text-foreground"
                style={{
                    height: visualViewportHeight ? `${visualViewportHeight}px` : '100%',
                }}
            >
                <div className="flex-1 relative h-full">
                    <ChatInterface />
                </div>
            </main>
        </>
    );
}
