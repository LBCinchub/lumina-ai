import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Code2, Globe, Layers, ArrowUp, Copy, Check, ChevronDown, ChevronUp,
  Monitor, Eye, LayoutDashboard, ShoppingCart, Users, BarChart2, Calendar,
  MessageSquare, FileText, Kanban, CreditCard, Map, Bell, Settings,
  Plus, Trash2, FolderOpen, Server
} from 'lucide-react';
import VpsToolPanel from '@/components/build/VpsToolPanel.jsx';
import LuminaMark from '@/components/layout/LuminaMark';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

const TEMPLATE_CATEGORIES = [
  {
    label: "Apps",
    items: [
      { icon: Kanban, label: "Kanban Board", prompt: "Build a full Kanban board app with drag-and-drop columns (To Do, In Progress, Done), task cards with priorities, and a clean modern UI." },
      { icon: Calendar, label: "Calendar App", prompt: "Build a monthly calendar app with event creation, color-coded events, and a sidebar showing upcoming events." },
      { icon: MessageSquare, label: "Chat UI", prompt: "Build a real-time chat app UI with a sidebar for conversations, message bubbles, and an input bar at the bottom." },
      { icon: FileText, label: "Notes App", prompt: "Build a notes app with a sidebar list of notes, rich text editing area, tags, and search." },
      { icon: Bell, label: "Notifications", prompt: "Build a notification center UI with grouped notifications, read/unread states, and filter tabs." },
      { icon: Settings, label: "Settings Page", prompt: "Build a clean settings page with sections for profile, notifications, security, and billing — with toggles, inputs, and save buttons." },
    ]
  },
  {
    label: "Dashboards",
    items: [
      { icon: LayoutDashboard, label: "Admin Dashboard", prompt: "Build a full admin dashboard with a sidebar nav, KPI stat cards, a bar chart, a data table, and recent activity feed." },
      { icon: BarChart2, label: "Analytics", prompt: "Build an analytics dashboard with line charts, bar charts, a stats overview row, and a recent events table." },
      { icon: Users, label: "CRM", prompt: "Build a CRM dashboard with a contacts table, deal pipeline stages, and a contact detail panel." },
      { icon: CreditCard, label: "Finance", prompt: "Build a personal finance dashboard with spending charts, balance overview, recent transactions list, and category breakdowns." },
    ]
  },
  {
    label: "Landing Pages",
    items: [
      { icon: Globe, label: "SaaS Landing", prompt: "Build a modern SaaS landing page with a hero section, feature grid, social proof, pricing table, and footer." },
      { icon: ShoppingCart, label: "E-commerce", prompt: "Build a product landing page for an e-commerce store with a hero, product grid with filters, and a cart sidebar." },
      { icon: Layers, label: "Portfolio", prompt: "Build a minimal personal portfolio site with hero, about, selected projects, and contact sections." },
      { icon: Map, label: "Agency Site", prompt: "Build a creative agency landing page with bold typography, services section, team grid, and contact form." },
    ]
  },
];

function extractHTML(content) {
  const match = content.match(/```html[\s\S]*?\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

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
        <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-foreground/85 bg-card scrollbar-minimal max-h-[400px]">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}

function ChatMessage({ msg }) {
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
              const firstLine = raw.split('\n')[0];
              const filenameMatch = firstLine.match(/^filename:\s*(.+)/i);
              const filename = filenameMatch ? filenameMatch[1].trim() : null;
              const code = filenameMatch ? raw.split('\n').slice(1).join('\n') : raw;
              if (!inline && match) return <CodeBlock code={code} lang={match[1]} filename={filename} />;
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

function PreviewPane({ html }) {
  const iframeRef = useRef(null);
  useEffect(() => {
    if (!iframeRef.current || !html) return;
    const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  if (!html) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Choose a template or describe what to build.
      </div>
    );
  }
  return <iframe ref={iframeRef} className="w-full flex-1 border-0" title="Live preview" sandbox="allow-scripts allow-same-origin" />;
}

export default function Build() {
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [latestHTML, setLatestHTML] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');
  const [loadingProjects, setLoadingProjects] = useState(true);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    const data = await base44.entities.BuildProject.list('-last_built_at', 50);
    setProjects(data);
    setLoadingProjects(false);
    return data;
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

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

  const selectProject = (project) => {
    setActiveProjectId(project.id);
    setMessages(project.messages || []);
    setLatestHTML(project.html || null);
    setActiveTab('preview');
  };

  const newProject = () => {
    setActiveProjectId(null);
    setMessages([]);
    setLatestHTML(null);
    setInput('');
  };

  const deleteProject = async (e, id) => {
    e.stopPropagation();
    await base44.entities.BuildProject.delete(id);
    if (activeProjectId === id) newProject();
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const send = async (text) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || sending) return;

    setSending(true);

    try {
      // Check build request limit
      const limitCheck = await base44.functions.invoke('checkBuildRequestLimit', {});
      if (limitCheck.data.blocked) {
        setMessages(prev => [...prev, { role: 'assistant', content: limitCheck.data.message, id: Date.now() + 1 }]);
        setSending(false);
        return;
      }

      const userMsg = { role: 'user', content: trimmed, id: Date.now() };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput('');
      const history = newMessages
        .map(m => `${m.role === 'user' ? 'User' : 'Lumina'}: ${m.content}`)
        .join('\n\n');
      
      // Update reference to newMessages
      const finalMessages = newMessages;

      const prompt = `You are Lumina — an expert full-stack developer and product designer. Your primary role here is to BUILD apps and websites when asked.

When building, always:
- Produce a COMPLETE, single-file HTML document that runs entirely in the browser (no external dependencies except CDN links like Tailwind CDN or Google Fonts)
- Use inline CSS and/or Tailwind CDN for styling
- Make designs visually polished, modern, and responsive — not generic
- Include realistic sample data / placeholder content
- Wrap the file in a single \`\`\`html code block — just ONE code block containing the full HTML
- After the code block, give a brief 2-3 sentence rationale

CONVERSATION SO FAR:
${history}

Respond as Lumina. Build exactly what was asked. Do not add disclaimers.`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        model: 'gemini_3_1_pro'
      });

      const content = typeof res === 'string' ? res : (res?.content || String(res));
      const html = extractHTML(content);
      const assistantMsg = { role: 'assistant', content, id: Date.now() + 1 };
      finalMessages.push(assistantMsg);

      if (html) {
        setLatestHTML(html);
        setActiveTab('preview');
      }
      setMessages(finalMessages);

      // Generate smart title from chat on first message
      let title = null;
      if (messages.length === 0) {
        try {
          const titleRes = await base44.integrations.Core.InvokeLLM({
            prompt: `Write a 3-5 word title (no quotes, no punctuation at the end, sentence case) that captures what this build request is about:\n\n"${trimmed}"\n\nTitle:`
          });
          title = (typeof titleRes === 'string' ? titleRes : '').trim().replace(/^["']|["']$/g, '').slice(0, 60);
        } catch (_) {
          title = trimmed.slice(0, 40);
          if (trimmed.length > 40) title += '…';
        }
      }

      // Save / update project
      const projectData = {
        messages: finalMessages,
        html: html || latestHTML,
        last_built_at: new Date().toISOString(),
        ...(title ? { title } : {})
      };

      if (activeProjectId) {
        await base44.entities.BuildProject.update(activeProjectId, projectData);
      } else {
        const created = await base44.entities.BuildProject.create({
          title: title || 'Untitled project',
          ...projectData
        });
        setActiveProjectId(created.id);
      }

      loadProjects();
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
  const activeProject = projects.find(p => p.id === activeProjectId);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen overflow-hidden">

      {/* Projects sidebar */}
      <aside className="hidden lg:flex w-52 shrink-0 border-r border-border flex-col bg-sidebar/60">
        <div className="px-4 py-4 border-b border-border/60 flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground/60 font-medium">Projects</span>
          <button
            onClick={newProject}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="New project"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-minimal py-2">
          {loadingProjects ? (
            <div className="px-4 py-3 text-xs text-muted-foreground">Loading…</div>
          ) : projects.length === 0 ? (
            <div className="px-4 py-3 text-xs text-muted-foreground/60">No projects yet</div>
          ) : (
            projects.map(p => (
              <button
                key={p.id}
                onClick={() => selectProject(p)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2.5 text-left group transition-colors",
                  activeProjectId === p.id
                    ? "bg-accent text-foreground"
                    : "text-foreground/70 hover:bg-accent/60 hover:text-foreground"
                )}
              >
                <FolderOpen className="w-3.5 h-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-xs truncate flex-1">{p.title}</span>
                <button
                  onClick={(e) => deleteProject(e, p.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-destructive transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Chat panel */}
      <div className="flex flex-col w-full md:w-[420px] lg:w-[420px] shrink-0 border-r border-border">
        <div className="shrink-0 px-5 py-4 border-b border-border/60 flex items-center gap-3">
          <Code2 className="w-4 h-4 text-foreground/60" strokeWidth={1.75} />
          <h1 className="font-serif text-lg tracking-tight truncate">
            {activeProject?.title || 'Build'}
          </h1>
          {!activeProject && <span className="text-xs text-muted-foreground/60 ml-1">— apps & websites</span>}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-minimal">
          {isEmpty ? (
            <div className="h-full overflow-y-auto scrollbar-minimal px-5 py-6 animate-fade-up">
              <div className="mb-6">
                <h2 className="font-serif text-2xl tracking-tight mb-1">What should I build?</h2>
                <p className="text-sm text-muted-foreground">Pick a template or describe anything below.</p>
              </div>
              <div className="space-y-6">
                {TEMPLATE_CATEGORIES.map(cat => (
                  <div key={cat.label}>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60 font-medium mb-2.5 px-0.5">
                      {cat.label}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {cat.items.map(item => (
                        <button
                          key={item.label}
                          onClick={() => send(item.prompt)}
                          className={cn(
                            "flex items-center gap-3 px-3.5 py-3 rounded-xl border border-border bg-card",
                            "hover:bg-accent hover:border-foreground/20 transition-all duration-150 text-left group"
                          )}
                        >
                          <div className="shrink-0 w-8 h-8 rounded-lg bg-accent flex items-center justify-center group-hover:bg-background transition-colors">
                            <item.icon className="w-4 h-4 text-foreground/60" strokeWidth={1.5} />
                          </div>
                          <span className="text-sm text-foreground/80 group-hover:text-foreground leading-tight">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-5 py-6 space-y-6">
              {messages.map(m => <ChatMessage key={m.id} msg={m} />)}
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

        <div className="shrink-0 border-t border-border/60 bg-background/80 backdrop-blur-xl p-4">
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
        </div>
      </div>

      {/* Preview panel */}
      <div className="hidden md:flex flex-col flex-1 min-w-0 relative">
        <div className="shrink-0 px-5 py-3 border-b border-border/60 flex items-center gap-1">
          <button
            onClick={() => setActiveTab('preview')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
              activeTab === 'preview' ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
            )}
          >
            <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />
            Preview
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
              activeTab === 'code' ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
            )}
          >
            <Monitor className="w-3.5 h-3.5" strokeWidth={1.75} />
            Code
          </button>
          <button
            onClick={() => setActiveTab('vps')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
              activeTab === 'vps' ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
            )}
          >
            <Server className="w-3.5 h-3.5" strokeWidth={1.75} />
            VPS
          </button>
          {sending && <span className="ml-auto text-xs text-muted-foreground animate-pulse">Building…</span>}
        </div>

        {activeTab === 'preview' ? (
          <PreviewPane html={latestHTML} />
        ) : activeTab === 'vps' ? (
          <VpsToolPanel />
        ) : (
          <div className="flex-1 overflow-y-auto scrollbar-minimal p-5">
            {latestHTML ? (
              <CodeBlock code={latestHTML} lang="html" filename={`${activeProject?.title || 'index'}.html`} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No code yet. Ask Lumina to build something.
              </div>
            )}
          </div>
        )}


      </div>
    </div>
  );
}