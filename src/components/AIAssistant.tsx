import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, X, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function friendlyAiError(status: number, error: string | undefined) {
  if (status === 503) return 'The AI book curator is not available in this deployment right now. You can still browse the catalog and complete checkout normally.';
  if (status === 429) return 'The AI book curator is busy. Please wait a few minutes before trying again.';
  if (status >= 500) return 'The AI book curator could not complete this request. Please try again later.';
  return error || 'Please enter a shorter book-related question and try again.';
}

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your BookSellNP AI curator. How can I help you find your next great read today?' },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/ai/status', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('AI status unavailable');
        const data = await response.json() as { available?: boolean };
        setAvailable(data.available === true);
      })
      .catch(() => setAvailable(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || available !== true) return;

    const userMessage = input.trim();
    const chatMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setInput('');
    setMessages(chatMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatMessages }),
      });
      const data = await response.json().catch(() => ({})) as { message?: string; error?: string };
      if (!response.ok) {
        if (response.status === 503) setAvailable(false);
        throw new Error(friendlyAiError(response.status, data.error));
      }
      const assistantMessage = data.message || 'The AI book curator returned no response. Please try again later.';
      setMessages((previous) => [...previous, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The AI book curator could not be reached. Please try again later.';
      setMessages((previous) => [...previous, { role: 'assistant', content: message }]);
    } finally {
      setIsLoading(false);
    }
  };

  const unavailable = available === false;
  const submitDisabled = !input.trim() || isLoading || available !== true;

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-20 right-0 flex h-[min(550px,calc(100vh-7rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            role="dialog"
            aria-modal="false"
            aria-labelledby="assistant-title"
          >
            <div className="flex items-center justify-between bg-slate-900 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-blue-600">
                  <Bot className="size-6" aria-hidden="true" />
                </div>
                <div>
                  <h3 id="assistant-title" className="text-sm font-bold tracking-tight">BookSellNP AI</h3>
                  <div className="flex items-center gap-1.5">
                    <span className={cn('size-2 rounded-full', available === true ? 'bg-emerald-500' : available === null ? 'bg-amber-400' : 'bg-slate-500')} aria-hidden="true" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                      {available === true ? 'Available' : available === null ? 'Checking service' : 'Unavailable'}
                    </span>
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-xl p-2 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white" aria-label="Close AI assistant">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto bg-slate-50/50 p-6" aria-live="polite">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={cn('flex gap-3', message.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                  <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-xl shadow-sm', message.role === 'user' ? 'bg-slate-900 text-white' : 'bg-blue-600 text-white')}>
                    {message.role === 'user' ? <User className="size-4" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
                  </div>
                  <div className={cn('max-w-[80%] rounded-2xl border p-4 text-sm leading-relaxed shadow-sm', message.role === 'user' ? 'rounded-tr-none border-slate-100 bg-white text-slate-900' : 'rounded-tl-none border-blue-100 bg-blue-50 text-slate-900')}>
                    {message.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white"><Loader2 className="size-4 animate-spin" aria-hidden="true" /></div>
                  <div className="animate-pulse rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-500">Curating response…</div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 bg-white p-6">
              {unavailable && <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium leading-5 text-amber-900">The catalog and checkout remain available. This optional book-curator service needs a configured provider before it can answer questions.</p>}
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') void handleSend(); }}
                  placeholder={unavailable ? 'AI curator is unavailable' : 'Ask about books in the catalog…'}
                  maxLength={1000}
                  disabled={available !== true}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-4 pr-12 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Ask the AI book curator"
                />
                <button type="button" onClick={() => void handleSend()} disabled={submitDisabled} className="absolute right-2 top-2 rounded-xl bg-slate-900 p-2 text-white shadow-lg transition-all hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Send question">
                  <Send className="size-5" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-4 text-center text-[10px] font-medium uppercase tracking-widest text-slate-400">Optional catalog assistant</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen((open) => !open)}
        className={cn('group relative flex size-16 items-center justify-center overflow-hidden rounded-2xl text-white shadow-2xl transition-all', isOpen ? 'bg-rose-500' : 'bg-slate-900')}
        aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
        aria-expanded={isOpen}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        {isOpen ? <X className="size-8" aria-hidden="true" /> : <MessageSquare className="size-8" aria-hidden="true" />}
      </motion.button>
    </div>
  );
}
