import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MainLayout } from "@/components/main-layout";

export const metadata: Metadata = {
    title: "Ulala Ai",
    description: "Interactive chat with Ulala Ai personas",
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    interactiveWidget: 'resizes-content',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <body>
                <MainLayout>{children}</MainLayout>
            </body>
        </html>
    );
}

