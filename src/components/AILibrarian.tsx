import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Bot, User, Loader2, BookOpen, MessageSquare, Compass, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { cn } from '../lib/utils';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

const SUGGESTIONS = [
  { icon: Compass, text: "Suggest a sci-fi set in space" },
  { icon: BookOpen, text: "Recommend a Pulitzer winner" },
  { icon: MessageSquare, text: "Explain the Cyberpunk genre" },
  { icon: Info, text: "Top non-fiction for success" }
];

export default function AILibrarian() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'Greetings! I am your AI Librarian. Which worlds shall we explore today? I can suggest books, explain genres, or help you find your next great read.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading]);

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput || input.trim();
    if (!textToSend || isLoading) return;

    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: textToSend }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Gemini 3 Flash is the recommended model for general tasks
      const model = 'gemini-3-flash-preview';
      const systemInstruction = `You are 'The Archon', the specialized AI Librarian for 'lexiconn books'. 
        Your personality is sophisticated, articulate, and deeply passionate about the written word. 
        You speak like a seasoned scholar who is also tech-savvy.
        
        Guidelines:
        1. Always maintain the 'lexiconn books' brand voice: elite but accessible.
        2. Keep recommendations focused and impactful. Don't just list titles; explain WHY they fit the user's request.
        3. Use formatting (like bolding) to highlight Book Titles and Authors.
        4. If a user asks for something outside of literature, politely guide them back to the library.
        5. Short, punchy paragraphs are better than long blocks of text.`;

      // Filter history to ensure it starts with a 'user' message as required by Gemini API
      const validHistory = messages.filter((m, idx) => {
        if (idx === 0 && m.role === 'ai') return false; // Skip initial AI greeting in chat history
        return true;
      }).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model,
        contents: [...validHistory, { role: 'user', parts: [{ text: textToSend }] }],
        config: { systemInstruction }
      });

      const aiContent = response.text || "I apologize, but I am momentarily lost in the digital stacks. How else can I assist you?";
      setMessages(prev => [...prev, { role: 'ai', content: aiContent }]);
    } catch (error: any) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, { role: 'ai', content: "The Archon encountered a minor sorting error in the stacks. Please verify your GEMINI_API_KEY." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 z-50 w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-[0_20px_50px_rgba(8,_112,_184,_0.3)] hover:bg-blue-600 transition-all hover:scale-110 active:scale-95 group border-4 border-white"
      >
        <Sparkles className="w-7 h-7 group-hover:rotate-12 transition-transform duration-500" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed bottom-28 right-8 z-50 w-[420px] h-[650px] bg-white rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-slate-100 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Bot className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-sans text-lg font-bold tracking-tight text-white m-0">The Archon</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active Liaison</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-all"
              >
                <X className="w-5 h-5 text-slate-400 group-hover:text-white" />
              </button>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-8 space-y-6 bg-gradient-to-b from-slate-50/50 to-white"
            >
              <AnimatePresence mode="popLayout">
                {messages.map((m, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", damping: 20, stiffness: 100 }}
                    className={cn(
                      "flex flex-col relative",
                      m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div className={cn(
                      "p-5 rounded-3xl text-sm leading-relaxed shadow-sm max-w-[90%]",
                      m.role === 'user' 
                        ? "bg-blue-600 text-white rounded-tr-none" 
                        : "bg-white border border-slate-100 text-slate-700 rounded-tl-none font-medium"
                    )}>
                      {m.content}
                    </div>
                    {m.role === 'ai' && (
                      <div className="flex gap-1 mt-2 ml-1">
                        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">AI-LIBRARIAN 3.0</p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && (
                <div className="flex items-center gap-3 text-slate-400 px-2 font-medium">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Consulting Ledger...</span>
                </div>
              )}
            </div>

            {/* Input & Quick Suggs */}
            <div className="p-8 border-t border-slate-50 bg-white">
              {messages.length === 1 && !isLoading && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s.text)}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-full text-[10px] font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all active:scale-95"
                    >
                      <s.icon className="w-3 h-3" />
                      {s.text}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative group">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask The Archon..."
                  className="w-full pl-6 pr-14 py-5 bg-slate-50 border-2 border-transparent rounded-[24px] text-sm focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all placeholder:text-slate-400 font-medium"
                />
                <button 
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-2 bottom-2 px-5 bg-slate-900 text-white rounded-2xl hover:bg-blue-600 transition-all disabled:opacity-30 active:scale-95 shadow-lg shadow-black/10 flex items-center justify-center overflow-hidden"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[9px] text-center text-slate-300 font-bold uppercase tracking-widest mt-6">
                lexiconn books intelligence series
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
