import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Code2, ArrowUp, Copy, Check, ChevronDown, ChevronUp,
  Monitor, Eye, Plus, Trash2, FolderOpen, Github, History,
  RefreshCw, ExternalLink, Maximize2, Loader, Zap
} from 'lucide-react';
import VpsToolPanel from '@/components/build/VpsToolPanel.jsx';
import GitHubSyncPanel from '@/components/build/GitHubSyncPanel.jsx';
import HistorySidebar from '@/components/build/HistorySidebar.jsx';
import CollaborativeCodeEditor from '@/components/build/CollaborativeCodeEditor.jsx';
import LuminaMark from '@/components/layout/LuminaMark';
import { useCollaborativeSession } from '@/hooks/useCollaborativeSession';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

const TEMPLATE_CATEGORIES = [
  {
    label: "Apps",
    items: [
      { icon: "📋", label: "Kanban Board", prompt: "Build a full Kanban board app with drag-and-drop columns (To Do, In Progress, Done), task cards with priorities, and a clean modern UI." },
      { icon: "📅", label: "Calendar App", prompt: "Build a monthly calendar app with event creation, color-coded events, and a sidebar showing upcoming events." },
      { icon: "💬", label: "Chat UI", prompt: "Build a real-time chat app UI with a sidebar for conversations, message bubbles, and an input bar at the bottom." },
      { icon: "📝", label: "Notes App", prompt: "Build a notes app with a sidebar list of notes, rich text editing area, tags, and search." },
    ]
  },
  {
    label: "Dashboards",
    items: [
      { icon: "📊", label: "Admin Dashboard", prompt: "Build a full admin dashboard with a sidebar nav, KPI stat cards, a bar chart, a data table, and recent activity feed." },
      { icon: "📈", label: "Analytics", prompt: "Build an analytics dashboard with line charts, bar charts, a stats overview row, and a recent events table." },
      { icon: "👥", label: "CRM", prompt: "Build a CRM dashboard with a contacts table, deal pipeline stages, and a contact detail panel." },
    ]
  },
  {
    label: "Landing Pages",
    items: [
      { icon: "🚀", label: "SaaS Landing", prompt: "Build a modern SaaS landing page with a hero section, feature grid, social proof, pricing table, and footer." },
      { icon: "🛍️", label: "E-commerce", prompt: "Build a product landing page for an e-commerce store with a hero, product grid with filters, and a cart sidebar." },
    ]
  },
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
    <div className="rounded-lg border border-border/40 overflow-hidden my-3">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Code2 className="w-3 h-3 text-muted-foreground" strokeWidth={2} />
          <span className="text-[11px] font-medium text-foreground/70">{filename || lang || 'code'}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setExpanded(e => !e)} className="p-1 rounded hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-colors">
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <button onClick={copy} className="p-1 rounded hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-colors">
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>
      {expanded && (
        <pre className="overflow-x-auto p-3 text-[12px] leading-relaxed text-foreground/75 bg-background scrollbar-minimal max-h-[300px]">
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
        <div className="max-w-[80%] bg-primary/20 border border-primary/30 rounded-xl rounded-tr-sm px-3 py-2 text-[13px] leading-relaxed">
          {msg.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3 animate-fade-up">
      <div className="shrink-0 mt-0.5">
        <LuminaMark size={18} className="text-foreground/60" />
      </div>
      <div className="flex-1 min-w-0 text-[13px] text-foreground/80">
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
              return <code className="px-1.5 py-0.5 rounded bg-muted/60 text-[12px]">{children}</code>;
            },
            p: ({ children }) => <p className="leading-relaxed mb-2 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>,
            strong: ({ children }) => <strong className="font-medium text-foreground/90">{children}</strong>,
            h2: ({ children }) => <h2 className="font-medium text-sm mt-3 mb-2">{children}</h2>,
          }}
        >
          {msg.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function PreviewPane({ html, latestImageUrl, loading, deviceMode }) {
  const iframeRef = useRef(null);
  
  useEffect(() => {
    if (!iframeRef.current || !html) return;
    const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  const widthMap = { desktop: '100%', tablet: '768px', mobile: '390px' };
  const width = widthMap[deviceMode] || '100%';
  const isMobile = deviceMode === 'mobile';
  const isTablet = deviceMode === 'tablet';

  if (!html && !latestImageUrl) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/60 text-sm">
        <LuminaMark size={48} className="mb-4 opacity-40" />
        <p>Your app will appear here</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex-1 flex flex-col items-center justify-center overflow-auto",
      isMobile || isTablet ? "bg-muted/20 p-4" : "p-0"
    )}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-20">
          <Loader className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
      {latestImageUrl ? (
        <img src={latestImageUrl} alt="Design" className="max-w-full h-auto rounded-lg shadow-lg" />
      ) : (
        <iframe
          ref={iframeRef}
          className={cn(
            "border-0",
            isMobile || isTablet ? "rounded-lg shadow-xl" : ""
          )}
          style={{ width, height: isMobile || isTablet ? 'auto' : '100%' }}
          title="Live preview"
          sandbox="allow-scripts allow-same-origin"
        />
      )}
    </div>
  );
}

export default function Build() {
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [latestHTML, setLatestHTML] = useState(null);
  const [latestImageUrl, setLatestImageUrl] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [user, setUser] = useState(null);
  const [deviceMode, setDeviceMode] = useState('desktop');
  const [showCode, setShowCode] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const { syncSession } = useCollaborativeSession(activeProjectId, () => {});

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    const data = await base44.entities.BuildProject.list('-last_built_at', 50);
    setProjects(data);
    setLoadingProjects(false);
    return data;
  }, []);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        const me = await base44.auth.me();
        setUser(me);
      }
    });
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, sending]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [input]);

  const selectProject = (project) => {
    setActiveProjectId(project.id);
    setMessages(project.messages || []);
    setLatestHTML(project.html || null);
    setLatestImageUrl(project.image_url || null);
    setShowCode(false);
  };

  const newProject = () => {
    setActiveProjectId(null);
    setMessages([]);
    setLatestHTML(null);
    setLatestImageUrl(null);
    setInput('');
    setShowCode(false);
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
    setPreviewLoading(true);

    try {
      const limitCheck = await base44.functions.invoke('checkBuildRequestLimit', {});
      if (limitCheck.data.blocked) {
        setMessages(prev => [...prev, { role: 'assistant', content: limitCheck.data.message, id: Date.now() + 1 }]);
        setSending(false);
        setPreviewLoading(false);
        return;
      }

      const userMsg = { role: 'user', content: trimmed, id: Date.now() };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput('');

      const history = newMessages
        .map(m => `${m.role === 'user' ? 'User' : 'Lumina'}: ${m.content}`)
        .join('\n\n');

      const prompt = `You are Lumina — an expert product designer and UI/UX specialist. Your role is to visualize and design beautiful interfaces.

When someone asks you to build something, describe what the design would look like as a detailed visual prompt. Focus on:
- Layout and structure
- Colors, typography, and visual hierarchy
- Key UI elements and their positioning
- Overall aesthetic and mood
- Specific details that make it unique

Respond with a detailed image description (2-3 sentences) that captures the complete visual design.

CONVERSATION SO FAR:
${history}

Respond as Lumina. Describe the visual design clearly and concisely for image generation.`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        model: 'gemini_3_1_pro'
      });

      const content = typeof res === 'string' ? res : (res?.content || String(res));
      
      const imageRes = await base44.integrations.Core.GenerateImage({
        prompt: content
      });
      
      const imageUrl = imageRes?.url;
      const assistantMsg = { 
        role: 'assistant', 
        content: imageUrl ? `Here's the design:\n\n![Design](${imageUrl})\n\n${content}` : content, 
        id: Date.now() + 1 
      };
      newMessages.push(assistantMsg);

      if (imageUrl) {
        setLatestImageUrl(imageUrl);
      }
      setMessages(newMessages);

      if (activeProjectId) {
        await syncSession(latestHTML, null, null);
      }

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

      const projectData = {
        messages: newMessages,
        html: latestHTML,
        image_url: imageUrl || latestImageUrl,
        last_built_at: new Date().toISOString(),
        ...(title ? { title } : {})
      };

      let projectId = activeProjectId;
      if (activeProjectId) {
        await base44.entities.BuildProject.update(activeProjectId, projectData);
      } else {
        const created = await base44.entities.BuildProject.create({
          title: title || 'Untitled project',
          ...projectData
        });
        projectId = created.id;
        setActiveProjectId(projectId);
      }

      loadProjects();

      if (projectId && (imageUrl || latestImageUrl)) {
        base44.entities.ProjectHistory.create({
          project_id: projectId,
          html: latestHTML,
          image_url: imageUrl || latestImageUrl,
          messages: newMessages,
          is_auto: true
        }).catch(() => {});
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Something went wrong. Try again.", id: Date.now() + 1 }]);
    } finally {
      setSending(false);
      setPreviewLoading(false);
    }
  };

  const isEmpty = messages.length === 0;
  const activeProject = projects.find(p => p.id === activeProjectId);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen overflow-hidden bg-background">
      {/* LEFT PANEL — Project Tree (240px) */}
      <aside className="hidden lg:flex w-60 shrink-0 border-r border-border/40 flex-col bg-muted/10">
        <div className="shrink-0 px-4 py-3.5 border-b border-border/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-medium">Projects</span>
            <button
              onClick={newProject}
              className="p-1 -mr-1 rounded hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-colors"
              title="New project"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-minimal py-2">
          {loadingProjects ? (
            <div className="px-4 py-2 text-[11px] text-muted-foreground/60">Loading…</div>
          ) : projects.length === 0 ? (
            <div className="px-4 py-2 text-[11px] text-muted-foreground/50">No projects yet</div>
          ) : (
            projects.map(p => (
              <button
                key={p.id}
                onClick={() => selectProject(p)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2.5 text-left rounded transition-all group",
                  activeProjectId === p.id
                    ? "bg-primary/20 border border-primary/30 text-foreground"
                    : "text-foreground/60 hover:bg-accent/40 hover:text-foreground/80"
                )}
              >
                <FolderOpen className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                <span className="text-[12px] truncate flex-1">{p.title}</span>
                <button
                  onClick={(e) => deleteProject(e, p.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-destructive transition-all shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* CENTER PANEL — Chat + Code Editor (~55%) */}
      <div className="flex flex-col flex-1 min-w-0 md:w-1/2 border-r border-border/40">
        <div className="shrink-0 px-4 py-3 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary/70" strokeWidth={2} />
            <span className="font-medium text-[13px] truncate">
              {activeProject?.title || 'New Build'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowCode(!showCode)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] transition-colors",
                showCode ? "bg-primary/20 border border-primary/30 text-foreground" : "text-muted-foreground/70 hover:text-foreground hover:bg-accent/40"
              )}
            >
              <Code2 className="w-3.5 h-3.5" strokeWidth={1.75} />
              Code
            </button>
            <button
              onClick={() => setShowCode(false)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] transition-colors",
                !showCode && messages.length > 0 ? "bg-primary/20 border border-primary/30 text-foreground" : "text-muted-foreground/70 hover:text-foreground hover:bg-accent/40"
              )}
            >
              <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />
              Chat
            </button>
          </div>
        </div>

        {showCode && latestHTML ? (
          <div className="flex-1 overflow-hidden">
            <CollaborativeCodeEditor
              code={latestHTML}
              projectId={activeProjectId}
              collaborators={[]}
              currentUser={user}
              onCodeChange={(newCode) => {
                setLatestHTML(newCode);
                if (activeProjectId) {
                  base44.entities.BuildProject.update(activeProjectId, { html: newCode, last_built_at: new Date().toISOString() }).catch(() => {});
                }
              }}
            />
          </div>
        ) : (
          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-minimal">
            {isEmpty ? (
              <div className="h-full flex flex-col items-center justify-center px-4 py-8 animate-fade-up">
                <h2 className="font-medium text-[14px] text-center mb-2">Choose a template or describe what to build</h2>
                <div className="space-y-3 w-full max-h-[60vh] overflow-y-auto scrollbar-minimal">
                  {TEMPLATE_CATEGORIES.map(cat => (
                    <div key={cat.label}>
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium px-0.5 block mb-2">
                        {cat.label}
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {cat.items.map(item => (
                          <button
                            key={item.label}
                            onClick={() => send(item.prompt)}
                            className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border/40 bg-muted/20 hover:bg-accent/50 hover:border-primary/40 transition-all text-left"
                          >
                            <span className="text-sm">{item.icon}</span>
                            <span className="text-[11px] font-medium truncate">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-4 py-4 space-y-4">
                {messages.map(m => <ChatMessage key={m.id} msg={m} />)}
                {sending && (
                  <div className="flex gap-3 animate-fade-up">
                    <LuminaMark size={18} className="shrink-0 text-foreground/60" />
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
        )}

        <div className="shrink-0 border-t border-border/40 bg-muted/10 p-3">
          <div className={cn(
            "relative flex items-end gap-2 bg-muted/30 border border-border/40 rounded-xl px-3 py-2",
            "focus-within:border-primary/40 focus-within:bg-muted/40 transition-all"
          )}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Build something beautiful…"
              rows={1}
              disabled={sending}
              className="flex-1 bg-transparent resize-none outline-none text-[13px] leading-relaxed placeholder:text-muted-foreground/50 scrollbar-minimal"
              style={{ maxHeight: '120px' }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || sending}
              className={cn(
                "shrink-0 w-7 h-7 rounded-lg flex items-center justify-center",
                "bg-primary text-background transition-all",
                "hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
              )}
            >
              <ArrowUp className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — Live Preview (~45%) */}
      <div className="hidden md:flex flex-col flex-1 min-w-0">
        <div className="shrink-0 px-4 py-3 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDeviceMode('desktop')}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] transition-colors",
                deviceMode === 'desktop' ? "bg-primary/20 border border-primary/30 text-foreground" : "text-muted-foreground/70 hover:text-foreground hover:bg-accent/40"
              )}
            >
              <Monitor className="w-3.5 h-3.5" strokeWidth={1.75} />
              Desktop
            </button>
            <button
              onClick={() => setDeviceMode('tablet')}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] transition-colors",
                deviceMode === 'tablet' ? "bg-primary/20 border border-primary/30 text-foreground" : "text-muted-foreground/70 hover:text-foreground hover:bg-accent/40"
              )}
            >
              <Monitor className="w-3 h-3" strokeWidth={1.75} />
              Tablet
            </button>
            <button
              onClick={() => setDeviceMode('mobile')}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] transition-colors",
                deviceMode === 'mobile' ? "bg-primary/20 border border-primary/30 text-foreground" : "text-muted-foreground/70 hover:text-foreground hover:bg-accent/40"
              )}
            >
              <Monitor className="w-3 h-3 rotate-90" strokeWidth={1.75} />
              Mobile
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setPreviewLoading(true);
                setTimeout(() => setPreviewLoading(false), 1000);
              }}
              className="p-1.5 rounded-md hover:bg-accent/40 text-muted-foreground/70 hover:text-foreground transition-colors"
              title="Refresh preview"
            >
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
            <button
              onClick={() => latestHTML && window.open('data:text/html,' + encodeURIComponent(latestHTML), '_blank')}
              disabled={!latestHTML}
              className="p-1.5 rounded-md hover:bg-accent/40 text-muted-foreground/70 hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Open in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <PreviewPane
          html={latestHTML}
          latestImageUrl={latestImageUrl}
          loading={previewLoading}
          deviceMode={deviceMode}
        />
      </div>
    </div>
  );
}