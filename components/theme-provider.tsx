"use client";

"use client";

import * as React from "react";
import { HeroUIProvider } from "@heroui/react";

// Define a type for the theme properties that will be set as CSS variables
export interface ThemeConfig {
    name: string;
    primary: string; // HSL
    radius: number;
    bgFrom: string;
    bgVia: string;
    bgTo: string;
    glassColor: string;
    buttonColor: string; // Dedicated button background color
    textColor?: string; // Optional text color for user bubbles
}

export function ThemeProvider({ children, theme }: { children: React.ReactNode; theme?: ThemeConfig }) {
    React.useEffect(() => {
        if (!theme) return;
        const root = document.documentElement;
        // Update standard variables
        root.style.setProperty("--primary", theme.primary);
        root.style.setProperty("--radius", `${theme.radius}rem`);

        // Update Vibe variables
        root.style.setProperty("--bg-gradient-from", theme.bgFrom);
        root.style.setProperty("--bg-gradient-via", theme.bgVia);
        root.style.setProperty("--bg-gradient-to", theme.bgTo);
        root.style.setProperty("--glass-color", theme.glassColor);
        root.style.setProperty("--button-color", theme.buttonColor);

        // Update user bubble text color if provided
        if (theme.textColor) {
            root.style.setProperty("--user-bubble-text", theme.textColor);
        } else {
            root.style.removeProperty("--user-bubble-text");
        }

        // Update HeroUI specific variables to match
        root.style.setProperty("--heroui-primary", theme.primary);

        // Update Sidebar variables to match theme
        root.style.setProperty("--sidebar-primary", theme.primary);
        root.style.setProperty("--sidebar-ring", theme.primary);

        // Force dark mode for now as the app is designed for it
        root.classList.add("dark");
    }, [theme]);

    return (
        <HeroUIProvider>
            <div className="min-h-screen bg-background text-foreground">
                {children}
            </div>
        </HeroUIProvider>
    );
}
