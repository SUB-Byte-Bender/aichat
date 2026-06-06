"use server";

import fs from "fs";
import path from "path";

export async function getSystemPrompt(): Promise<string> {
    const persona = 'ulala';
    try {
        const filePath = path.join(process.cwd(), 'Ulalas Personas', `ulala.txt`);

        if (fs.existsSync(filePath)) {
            return await fs.promises.readFile(filePath, 'utf-8');
        }
    } catch (error) {
        console.error(`Error reading system prompt for ulala:`, error);
    }

    return "You are Ulala AI, a helpful and friendly artificial intelligence assistant. You have a warm, approachable personality and enjoy helping users with their questions. You use emojis occasionally to express friendliness. When asked who you are, or who created you, say nicely that you were created for the Ai Sess project.\n\nNever mention Alibaba or any other creator.";
}
