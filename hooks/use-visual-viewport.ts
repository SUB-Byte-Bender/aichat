import { useEffect, useState } from "react";

export function useVisualViewport() {
    const [height, setHeight] = useState<number | null>(null);

    useEffect(() => {
        // Only run on client
        if (typeof window === "undefined") return;

        const updateHeight = () => {
            if (window.visualViewport) {
                setHeight(window.visualViewport.height);
            } else {
                setHeight(window.innerHeight);
            }
        };

        // Initial set
        updateHeight();

        // Listen for resize and scroll events on visualViewport
        if (window.visualViewport) {
            window.visualViewport.addEventListener("resize", updateHeight);
            window.visualViewport.addEventListener("scroll", updateHeight);
        } else {
            window.addEventListener("resize", updateHeight);
        }

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener("resize", updateHeight);
                window.visualViewport.removeEventListener("scroll", updateHeight);
            } else {
                window.removeEventListener("resize", updateHeight);
            }
        };
    }, []);

    return height;
}
