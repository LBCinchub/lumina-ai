import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Code2, Globe, Layers, ArrowUp, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import LuminaMark from '@/components/layout/LuminaMark';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

const STARTERS = [
  { icon: Globe, label: "Landing page", prompt: "Build a modern SaaS landing page with hero, features, pricing, and footer sections." },
  { icon: Code2, label: "Web app", prompt: "Build a full React task management app with a sidebar, kanban board, and dark mode." },
  { icon: Layers, label: "Portfolio site", prompt: "Build a minimal portfolio website for a designer/developer with project showcase and contact section." },
];

function CodeBlock({ code, lang, filename }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden my-3">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/60 border-b border-border">
        <div className="flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />
          <span className="text-xs font-medium text-foreground/80">{filename || lang || 'code'}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setExpanded(e => !e)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button onClick={copy} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      {expanded && (
        <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-foreground/85 bg-card scrollbar-minimal max-h-[500px]">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === 'user';
  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-up">
        <div className="max-w-[85%] bg-accent text-accent-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-[15px] leading-relaxed">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 animate-fade-up">
      <div className="shrink-0 mt-1">
        <LuminaMark size={22} className="text-foreground/80" />
      </div>
      <div className="flex-1 min-w-0 text-[15px] text-foreground/90">
        <ReactMarkdown
          components={{
            code({ inline, className, children }) {
              const match = /language-(\w+)/.exec(className || '');
              const raw = String(children).replace(/\n$/, '');
              // Extract filename from first line if present (e.g. "filename: index.html")
              const firstLine = raw.split('\n')[0];
              const filenameMatch = firstLine.match(/^filename:\s*(.+)/i);
              const filename = filenameMatch ? filenameMatch[1].trim() : null;
              const code = filenameMatch ? raw.split('\n').slice(1).join('\n') : raw;

              if (!inline && match) {
                return <CodeBlock code={code} lang={match[1]} filename={filename} />;
              }
              return <code className="px-1.5 py-0.5 rounded bg-muted text-sm">{children}</code>;
            },
            p: ({ children }) => <p className="leading-relaxed mb-3 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="my-2 ml-5 list-disc space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="my-2 ml-5 list-decimal space-y-1">{children}</ol>,
            strong: ({ children }) => <strong className="font-medium text-foreground">{children}</strong>,
            h2: ({ children }) => <h2 className="font-serif text-lg font-medium mt-4 mb-2">{children}</h2>,
            h3: ({ children }) => <h3 className="font-medium mt-3 mb-1">{children}</h3>,
          }}
        >
          {msg.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export default function Build() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, sending]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [input]);

  const send = async (text) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || sending) return;

    const userMsg = { role: 'user', content: trimmed, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      // Use a dedicated build conversation (stateless per session — just pass history inline)
      const history = [...messages, userMsg]
        .map(m => `${m.role === 'user' ? 'User' : 'Lumina'}: ${m.content}`)
        .join('\n\n');

      const prompt = `You are Lumina — an expert full-stack developer and product designer. Your primary role here is to BUILD apps and websites when asked.

When building, always:
- Produce complete, working, production-quality code
- Use React + Tailwind CSS for web apps/dashboards
- Use clean HTML + embedded CSS for static websites (single file, ready to open in browser)
- Wrap each file in a labeled code block: start with \`\`\`html\\nfilename: index.html or \`\`\`jsx\\nfilename: App.jsx
- Make designs visually polished, modern, and responsive — not generic
- Include realistic sample data / placeholder content
- After code, give a brief rationale for key decisions

CONVERSATION SO FAR:
${history}

Respond as Lumina. Build exactly what was asked. Do not add disclaimers.`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: 'claude_sonnet_4_6'
      });

      const content = typeof res === 'string' ? res : (res?.content || String(res));
      setMessages(prev => [...prev, { role: 'assistant', content, id: Date.now() + 1 }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Something went wrong. Try again.", id: Date.now() + 1 }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-border/60 flex items-center gap-3">
        <Code2 className="w-4 h-4 text-foreground/60" strokeWidth={1.75} />
        <h1 className="font-serif text-lg tracking-tight">Build</h1>
        <span className="text-xs text-muted-foreground/60 ml-1">— apps & websites</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-minimal">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center px-6 animate-fade-up">
            <LuminaMark size={48} className="text-foreground/60 mb-6" />
            <h2 className="font-serif text-2xl md:text-3xl tracking-tight text-center mb-2">
              What should I build?
            </h2>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-8">
              Describe any app or website. I'll produce complete, working code — ready to use.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {STARTERS.map(s => (
                <button
                  key={s.label}
                  onClick={() => send(s.prompt)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-sm"
                >
                  <s.icon className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 space-y-6">
            {messages.map(m => <Message key={m.id} msg={m} />)}
            {sending && (
              <div className="flex gap-4 animate-fade-up">
                <div className="shrink-0 mt-1">
                  <LuminaMark size={22} className="text-foreground/80" />
                </div>
                <div className="flex items-center gap-1.5 py-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse-soft" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse-soft" style={{ animationDelay: '200ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse-soft" style={{ animationDelay: '400ms' }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-5 md:px-8 py-4">
          <div className={cn(
            "relative flex items-end gap-2 bg-card border border-border rounded-2xl px-4 py-3",
            "focus-within:border-foreground/30 focus-within:shadow-[0_2px_20px_-8px_hsl(var(--foreground)/0.15)]",
            "transition-all duration-300"
          )}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you want me to build…"
              rows={1}
              disabled={sending}
              className="flex-1 bg-transparent resize-none outline-none text-[15px] leading-relaxed placeholder:text-muted-foreground/60 scrollbar-minimal"
              style={{ maxHeight: '200px' }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || sending}
              className={cn(
                "shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                "bg-foreground text-background transition-all",
                "hover:scale-105 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
              )}
            >
              <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
          <p className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground/60 text-center mt-3">
            Lumina builds · you ship
          </p>
        </div>
      </div>
    </div>
  );
}