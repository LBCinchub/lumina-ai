import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowUp, Bot, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Messages + composer for one of the user's own agents. The detail header
// (back button, identity, tabs) lives in AgentDetailHeader. Message history
// is persisted per agent per user; every send goes through the
// chatWithUserAgent backend function (server-side LLM only — no
// client-side InvokeLLM).
export default function AgentChat({ agent, messages, loadingMessages, sending, onSend }) {
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, loadingMessages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }, [input]);

  const submit = () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    onSend(text);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-minimal">
        {loadingMessages ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/50" strokeWidth={1.75} />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 animate-fade-up">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4">
              <Bot className="w-6 h-6 text-foreground/70" strokeWidth={1.5} />
            </div>
            <h3 className="font-serif text-lg tracking-tight mb-1">Say Hello To {agent.name}</h3>
            <p className="text-[12px] text-muted-foreground max-w-xs leading-relaxed">
              Your agent keeps every message here — private to you.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-5">
            {messages.map(m => m.role === 'user' ? (
              <div key={m.id} className="flex justify-end animate-fade-up">
                <div className="max-w-[80%] bg-primary/20 border border-primary/30 rounded-xl rounded-tr-sm px-3.5 py-2.5 text-[13px] leading-relaxed">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex gap-3 animate-fade-up">
                <div className="shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-foreground/50" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0 text-[13px] text-foreground/85 prose-lumina">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-3 animate-fade-up">
                <Bot className="w-4 h-4 shrink-0 mt-0.5 text-foreground/50" strokeWidth={1.5} />
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse" style={{ animationDelay: '200ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse" style={{ animationDelay: '400ms' }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-border/40 bg-muted/10 p-3">
        <div className="max-w-3xl mx-auto">
          <div className={cn(
            "relative flex items-end gap-2 bg-muted/30 border border-border/40 rounded-xl px-3 py-2",
            "focus-within:border-primary/40 focus-within:bg-muted/40 transition-all"
          )}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={`Message ${agent.name}…`}
              rows={1}
              disabled={sending}
              className="flex-1 bg-transparent resize-none outline-none text-[13px] leading-relaxed placeholder:text-muted-foreground/50 scrollbar-minimal"
              style={{ maxHeight: '140px' }}
            />
            <button
              onClick={submit}
              disabled={!input.trim() || sending}
              className={cn(
                "shrink-0 w-7 h-7 rounded-lg flex items-center justify-center",
                "bg-primary text-primary-foreground transition-all",
                "hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
              )}
            >
              <ArrowUp className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60 text-center mt-2.5">
            LBC AI · Your Agent · Private To You
          </p>
        </div>
      </div>
    </div>
  );
}