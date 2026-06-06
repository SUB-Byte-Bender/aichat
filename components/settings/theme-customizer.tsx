"use client";

import { useState, useEffect, useRef } from "react";
import { useChatStore } from "@/store/chat-store";
import { Slider, cn } from "@heroui/react";
import { Check, RotateCcw } from "lucide-react";
import { ThemeConfig } from "@/components/theme-provider";

const VIBES: ThemeConfig[] = [
    {
        name: "Midnight",
        primary: "263.4 70% 50.4%",
        radius: 0.5,
        bgFrom: "#0f0c29",
        bgVia: "#302b63",
        bgTo: "#24243e",
        glassColor: "rgba(30, 27, 75, 0.3)",
        buttonColor: "#5b47db",
        textColor: "#ffffff",
    },
    {
        name: "Nebula",
        primary: "310 60% 60%", // Pinkish
        radius: 0.75,
        bgFrom: "#2E0249",
        bgVia: "#570A57",
        bgTo: "#A91079",
        glassColor: "rgba(87, 10, 87, 0.3)",
        buttonColor: "#c44caf",
        textColor: "#ffffff",
    },
    {
        name: "Sunset",
        primary: "20 80% 60%", // Orange
        radius: 0.3,
        bgFrom: "#451e3e",
        bgVia: "#851e3e",
        bgTo: "#fe9191",
        glassColor: "rgba(69, 30, 62, 0.3)",
        buttonColor: "#e8625d",
        textColor: "#ffffff",
    },
    {
        name: "Forest",
        primary: "150 60% 40%", // Green
        radius: 0.5,
        bgFrom: "#134e5e",
        bgVia: "#71b280",
        bgTo: "#134e5e",
        glassColor: "rgba(19, 78, 94, 0.3)",
        buttonColor: "#4db380",
        textColor: "#ffffff",
    },
    {
        name: "Slate",
        primary: "220 10% 60%", // Grey
        radius: 0.2,
        bgFrom: "#232526",
        bgVia: "#414345",
        bgTo: "#232526",
        glassColor: "rgba(35, 37, 38, 0.4)",
        buttonColor: "#6b7280",
        textColor: "#ffffff",
    },
];

export function ThemeCustomizer() {
    const { theme, setTheme, themeRadii, setThemeRadius } = useChatStore();
    const [localRadius, setLocalRadius] = useState(theme.radius);
    const sliderRef = useRef<HTMLDivElement>(null);

    // Update local state when theme changes
    useEffect(() => {
        setLocalRadius(theme.radius);
    }, [theme.radius]);

    const handleRadiusChange = (value: number | number[]) => {
        const newRadius = Array.isArray(value) ? value[0] : value;
        setLocalRadius(newRadius);
        setTheme({ ...theme, radius: newRadius });
        setThemeRadius(theme.name, newRadius);
    };

    const handleReset = () => {
        const forestTheme = VIBES.find(v => v.name === "Forest");
        if (forestTheme) {
            // Reset all saved radii to 0.5
            VIBES.forEach(vibe => {
                setThemeRadius(vibe.name, 0.5);
            });

            // Reset current theme to Forest with 0.5 radius
            setTheme({ ...forestTheme, radius: 0.5 });
            setLocalRadius(0.5);
        }
    };

    // Mouse wheel support for slider
    useEffect(() => {
        const sliderElement = sliderRef.current;
        if (!sliderElement) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = -Math.sign(e.deltaY) * 0.05;
            const newRadius = Math.max(0, Math.min(2, localRadius + delta));
            handleRadiusChange(newRadius);
        };

        sliderElement.addEventListener('wheel', handleWheel, { passive: false });
        return () => sliderElement.removeEventListener('wheel', handleWheel);
    }, [localRadius]);

    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-medium leading-none">Select Vibe</h3>
                    <p className="text-sm text-zinc-500 mt-1">Choose your atmosphere.</p>
                </div>
                <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-zinc-700"
                    title="Reset to defaults"
                >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {VIBES.map((vibe) => (
                    <button
                        key={vibe.name}
                        className={cn(
                            "relative flex flex-col items-center gap-2 border p-3 transition-all overflow-hidden group",
                            theme.name === vibe.name
                                ? "border-primary ring-2 ring-primary bg-primary/10"
                                : "border-zinc-700 hover:bg-zinc-800/50 dark:border-zinc-700 dark:hover:bg-zinc-800/50 hover:border-zinc-600"
                        )}
                        style={{ borderRadius: `${theme.radius}rem` }}
                        onClick={() => {
                            const savedRadius = themeRadii[vibe.name] ?? vibe.radius;
                            setTheme({ ...vibe, radius: savedRadius });
                        }}
                    >
                        {/* Preview Gradient */}
                        <div
                            className="h-12 w-12 shadow-lg shrink-0"
                            style={{
                                background: `linear-gradient(135deg, ${vibe.bgFrom}, ${vibe.bgVia}, ${vibe.bgTo})`,
                                borderRadius: `calc(${theme.radius}rem)`
                            }}
                        />

                        <span className="text-xs font-medium">{vibe.name}</span>
                    </button>
                ))}
            </div>

            <div className="pt-4 pb-6 border-t border-zinc-700">
                <div className="mb-4 flex justify-between items-center">
                    <span className="text-sm font-medium">Border Radius</span>
                    <span className="text-xs text-zinc-400">{localRadius.toFixed(2)}rem</span>
                </div>
                <div ref={sliderRef} className="w-full py-2">
                    <Slider
                        aria-label="Border Radius Slider"
                        value={localRadius}
                        minValue={0}
                        maxValue={2}
                        step={0.01}
                        onChange={handleRadiusChange}
                        color="primary"
                        size="sm"
                        classNames={{
                            base: "w-full",
                            track: "bg-zinc-700/50 h-2 rounded-full",
                            filler: "bg-primary h-2 rounded-full",
                            thumb: "bg-white shadow-lg w-5 h-5 border-2 border-white hover:scale-110 top-1/2 -translate-y-1/2 transition-transform duration-100"
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
