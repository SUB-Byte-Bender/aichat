"use client";

import { useState } from 'react';
import { useChatStore } from '@/store/chat-store';
import { Button } from '@heroui/react';
import { cn } from '@/lib/utils';
import { ThemeCustomizer } from './theme-customizer';
import { Cog } from 'lucide-react';

export function SettingsDrawerTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button isIconOnly variant="light" className="h-10 w-10" onPress={() => setOpen(true)}>
        <Cog className="h-5 w-5" />
      </Button>
      {open && <SettingsDrawer onClose={() => setOpen(false)} />}
    </>
  );
}

function SettingsDrawer({ onClose }: { onClose: () => void }) {
  const { groqApiKey, setGroqApiKey, groqModel, setGroqModel, theme } = useChatStore();

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />
      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md flex flex-col bg-background/70 glass overflow-hidden" style={{ WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center justify-between p-4 border-b border-zinc-700/40">
          <h2 className="text-sm font-semibold">Settings</h2>
          <Button size="sm" variant="light" onPress={onClose}>Close</Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <section className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">AI Provider</h3>

            <div className="glass mt-2 p-2 flex flex-col gap-3" style={{ borderRadius: '0.75rem' }}>
              <label className="text-[10px] uppercase tracking-wide text-zinc-500">Groq API Key (stored locally)</label>
              <input
                className="h-9 rounded-md bg-transparent px-3 text-sm outline-none border border-zinc-300/40 dark:border-zinc-700/40 focus:border-primary transition-colors"
                type="password"
                value={groqApiKey}
                onChange={(e) => setGroqApiKey(e.target.value)}
                placeholder="Enter Groq API key"
              />
              <label className="text-[10px] uppercase tracking-wide text-zinc-500">Model</label>
              <select
                className="h-9 rounded-md bg-transparent px-3 text-sm outline-none border border-zinc-300/40 dark:border-zinc-700/40 focus:border-primary transition-colors appearance-none cursor-pointer"
                value={groqModel}
                onChange={(e) => setGroqModel(e.target.value)}
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }}
              >
                <option value="meta-llama/llama-4-scout-17b-16e-instruct">Llama 4 Scout 17B</option>
                <option value="llama-3.3-70b-versatile">Llama 3.3 70B</option>
                <option value="openai/gpt-oss-120b">GPT OSS 120B</option>
                <option value="openai/gpt-oss-20b">GPT OSS 20B</option>
                <option value="openai/gpt-oss-safeguard-20b">GPT OSS Safeguard 20B</option>
                <option value="llama-3.1-8b-instant">Llama 3.1 8B Instant</option>
                <option value="groq/compound">Groq Compound</option>
                <option value="qwen/qwen3-32b">Qwen3 32B</option>

              </select>
              <p className="text-[10px] text-zinc-500 leading-relaxed">Your API key is stored in IndexedDB for persistence. For higher security prefer server-side env var. Model string is appended to request endpoint.</p>
            </div>
          </section>
          <section>
            <ThemeCustomizer />
          </section>

        </div>
        <div className="p-3 text-center text-[10px] text-zinc-500 border-t border-zinc-700/40">v0.1 Settings</div>
      </div>
    </div>
  );
}
