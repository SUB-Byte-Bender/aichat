# Local AI Chat

This project provides a local/offline + online AI chat interface with persona switching and theme customization.

## Environment Setup

Create a `.env.local` file at the project root with:

```
GEMINI_API_KEY=YOUR_GEMINI_KEY_HERE
```

Do NOT commit the real key. The server-side API route `/api/gemini` reads this variable. The client never sends or stores the key.

## Providers

- Offline (Ollama): Runs against your local Ollama instance at `http://localhost:11434`. Set the model name in the Settings drawer (gear icon).
- Online (Gemini): Uses the server proxy route to avoid exposing the API key. No key entry field on the client.

## Settings Drawer

Open via the gear icon in the header. It is a blurred, scrollable drawer containing:
- AI Provider toggle (Offline / Online)
- Ollama model input
- Theme customization (colors, radius)

## Personas

- Ulala: Friendly assistant with light emoji usage.
- JARVIS: Technical, precise assistant for development queries.

## Development

Install and run:

```bash
npm install
npm run dev
```

Ensure Ollama is running locally for offline model usage.

## Security Notes

- Gemini key is kept only in `.env.local` (server-side).
- State persistence excludes any API keys.

## Future Enhancements

- Streaming Gemini responses
- Error toasts and request cancellation
- Chat rename inline editing improvements
