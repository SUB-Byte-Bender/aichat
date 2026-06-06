# Default AI Mode Configuration

## Overview
The application now supports setting default AI modes (Online/Gemini vs Local/Ollama) based on device type (Mobile vs Desktop) using environment variables.

## Environment Variables

### `NEXT_PUBLIC_DEFAULT_MOBILE`
Controls the default AI mode for mobile devices on first visit.
- **Value: "Online"** → First-time mobile users will default to Gemini (Online AI)
- **Value: "Local"** → First-time mobile users will default to Ollama (Local AI)
- **Not set** → Defaults to Ollama

### `NEXT_PUBLIC_DEFAULT_DESKTOP`
Controls the default AI mode for desktop devices on first visit.
- **Value: "Online"** → First-time desktop users will default to Gemini (Online AI)
- **Value: "Local"** → First-time desktop users will default to Ollama (Local AI)
- **Not set** → Defaults to Ollama

## Current Configuration
Based on your `.env.local` file:
- **Mobile**: `NEXT_PUBLIC_DEFAULT_MOBILE=Online` → Mobile users default to Gemini
- **Desktop**: `NEXT_PUBLIC_DEFAULT_DESKTOP=Local` → Desktop users default to Ollama

## How It Works
1. When a user visits the app for the first time (no saved state), the app checks their device type
2. Based on whether they're on mobile or desktop, it reads the corresponding environment variable
3. The provider (Gemini or Ollama) is set accordingly
4. Once the user changes their preference, it's saved to their browser storage and persists across sessions
5. The environment variables only affect the **initial default** for new users

## Changing the Configuration
To change the defaults, edit `.env.local`:

```bash
# For mobile users to default to Local AI
NEXT_PUBLIC_DEFAULT_MOBILE=Local

# For desktop users to default to Online AI  
NEXT_PUBLIC_DEFAULT_DESKTOP=Online
```

After changing these values, restart the development server:
```bash
npm run dev
```

## Testing
To test the defaults:
1. Clear your browser's storage (Application > IndexedDB > delete all)
2. Reload the page
3. Check which AI mode is selected by default
4. For mobile testing, use Chrome DevTools device emulation
