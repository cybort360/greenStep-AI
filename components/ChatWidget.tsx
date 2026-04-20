'use client';

import { Leaf, MessageCircle, Send, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const THREAD_KEY = 'greenstep_thread_id';
const OLIVE_GREETING = "Hi! I'm Olive, your sustainability coach. Tell me about your day — what green choices did you make, or what would you like to do better?";

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  impactScore?: number;
};

type CoachPayload = {
  impact_score: number;
  insight: string;
  challenge: string;
  recommendation: string;
  total_saved: number;
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasGreeted = useRef(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(THREAD_KEY);
    if (stored) { setThreadId(stored); return; }
    const interval = setInterval(() => {
      const id = window.localStorage.getItem(THREAD_KEY);
      if (id) { setThreadId(id); clearInterval(interval); }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (open) {
      if (!hasGreeted.current) {
        hasGreeted.current = true;
        setMessages([{ id: crypto.randomUUID(), role: 'assistant', text: OLIVE_GREETING }]);
      }
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(async () => {
    if (!threadId || !input.trim() || loading) return;
    const userText = input.trim();
    setInput('');
    if (inputRef.current) { inputRef.current.style.height = 'auto'; }
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', text: userText }]);
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, message: userText }),
      });
      const data = await res.json() as { coach?: CoachPayload; error?: string };
      if (!res.ok || !data.coach) {
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', text: data.error ?? 'Something went wrong. Try again.' }]);
        return;
      }
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', text: data.coach!.insight, impactScore: data.coach!.impact_score }]);
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', text: 'Could not reach Olive. Check your connection.' }]);
    } finally {
      setLoading(false);
    }
  }, [threadId, input, loading]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <>
      {/* Floating trigger button */}
      <div className="group fixed bottom-5 right-4 z-50 sm:bottom-6 sm:right-6">
        {!open && (
          <span className="pointer-events-none absolute -top-9 right-0 whitespace-nowrap rounded-full border border-emerald-200/80 bg-white px-3 py-1 text-xs font-medium text-emerald-900 opacity-0 shadow-sm transition-all duration-200 group-hover:opacity-100 dark:border-emerald-800/60 dark:bg-stone-900 dark:text-emerald-300">
            Ask Olive
          </span>
        )}
        <button
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close Olive' : 'Ask Olive'}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--gs-moss)] text-white shadow-lg shadow-emerald-900/30 transition hover:bg-[var(--gs-forest)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
        </button>
      </div>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col rounded-3xl border border-emerald-200/80 bg-white shadow-2xl shadow-emerald-900/15 sm:right-6 sm:w-96 dark:border-emerald-800/50 dark:bg-stone-900 dark:shadow-emerald-950/30">

          {/* Panel header */}
          <div className="flex items-center gap-2 rounded-t-3xl border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-4 py-3 dark:border-emerald-900/60 dark:from-emerald-950/40 dark:to-stone-900">
            <Leaf className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">Olive</p>
            <span className="ml-auto flex h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
          </div>

          {/* Messages */}
          <div className="flex max-h-80 flex-col gap-3 overflow-y-auto px-4 py-4">
            {messages.map(m => (
              <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[var(--gs-moss)] text-white'
                      : 'border border-stone-200/80 bg-stone-50 text-stone-800 dark:border-stone-700/60 dark:bg-stone-800 dark:text-stone-200'
                  }`}
                >
                  {m.text}
                </div>
                {m.role === 'assistant' && m.impactScore != null && m.impactScore > 0 && (
                  <p className="mt-1 text-[10px] text-emerald-700 dark:text-emerald-400">
                    {m.impactScore.toFixed(2)} kg CO₂e avoided
                  </p>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-start">
                <div className="flex gap-1 rounded-2xl border border-stone-200/80 bg-stone-50 px-3 py-2.5 dark:border-stone-700/60 dark:bg-stone-800">
                  <span className="size-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:0ms] dark:bg-stone-500" />
                  <span className="size-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:150ms] dark:bg-stone-500" />
                  <span className="size-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:300ms] dark:bg-stone-500" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="flex items-end gap-2 rounded-b-3xl border-t border-stone-100 bg-white px-3 py-3 dark:border-stone-800 dark:bg-stone-900">
            <textarea
              ref={inputRef}
              value={input}
              onChange={onInputChange}
              onKeyDown={onKeyDown}
              rows={1}
              disabled={!threadId || loading}
              placeholder={threadId ? 'Ask Olive…' : 'Starting session…'}
              className="flex-1 resize-none rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 outline-none ring-emerald-500/30 transition placeholder:text-stone-400 focus:border-emerald-300 focus:bg-white focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-emerald-700 dark:focus:bg-stone-800"
            />
            <button
              onClick={() => void send()}
              disabled={!threadId || !input.trim() || loading}
              aria-label="Send message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--gs-moss)] text-white shadow-sm transition hover:bg-[var(--gs-forest)] disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-700"
            >
              <Send className="size-4" />
            </button>
          </div>

        </div>
      )}
    </>
  );
}
