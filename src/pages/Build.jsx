import React, { useState, useRef, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import ProjectSidePanels from '@/components/build/ProjectSidePanels';
import PreviewPane from '@/components/build/PreviewPane';
import GitHubSyncDialog from '@/components/build/GitHubSyncDialog';
import { base44 } from '@/api/base44Client';
import {
  Code2, ArrowUp, Copy, Check, ChevronDown, ChevronUp,
  Monitor, Eye, Plus, Trash2, FolderOpen, Github,
  RefreshCw, ExternalLink, Download, Zap
} from 'lucide-react';
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

// Collaborator presence is not shown here; a stable callback keeps the
// presence hook from re-subscribing (and calling the server) on every render.
const IGNORE_COLLABORATORS = () => {};

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
  const [syncOpen, setSyncOpen] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const { syncSession } = useCollaborativeSession(activeProjectId, IGNORE_COLLABORATORS);

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
      // A blocked request comes back as an error response that carries the message.
      let limit;
      try {
        limit = (await base44.functions.invoke('checkBuildRequestLimit', {})).data;
      } catch (err) {
        limit = err?.response?.data;
        if (!limit?.blocked) throw err;
      }
      if (limit?.blocked) {
        setMessages(prev => [...prev, { role: 'assistant', content: limit.message, id: Date.now() + 1 }]);
        return;
      }

      const userMsg = { role: 'user', content: trimmed, id: Date.now() };
      const withUser = [...messages, userMsg];
      setMessages(withUser);
      setInput('');

      const history = withUser
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');

      // One call returns the design (description + image) and the live HTML.
      const buildRes = await base44.functions.invoke('orchestrateBuild', {
        step: 'design', message: trimmed, history, current_html: latestHTML || ''
      });
      const buildData = buildRes?.data || {};
      const imageUrl = buildData.image_url || null;
      const html = buildData.html || null;
      const nextHTML = html || latestHTML;
      const assistantMsg = {
        role: 'assistant',
        content: [
          imageUrl ? `Here's the design:\n\n![Design](${imageUrl})` : '',
          buildData.content || '',
          html
            ? 'The live page is in the preview. Open Code to see or edit its HTML.'
            : 'The live page could not be built this time, so the preview was not changed. Send your request again to retry.'
        ].filter(Boolean).join('\n\n'),
        id: Date.now() + 1
      };
      const finalMessages = [...withUser, assistantMsg];
      setMessages(finalMessages);
      if (imageUrl) setLatestImageUrl(imageUrl);
      if (html) setLatestHTML(html);
      setPreviewLoading(false);

      if (activeProjectId) {
        await syncSession(nextHTML, null, null);
      }

      let title = null;
      if (messages.length === 0) {
        try {
          const titleRes = await base44.functions.invoke('orchestrateBuild', { step: 'title', message: trimmed });
          const titleData = titleRes?.data || titleRes || {};
          title = (titleData.title || '').trim().slice(0, 60) || null;
        } catch (_) {
          title = trimmed.slice(0, 40);
          if (trimmed.length > 40) title += '…';
        }
      }

      const projectData = {
        messages: finalMessages,
        html: nextHTML,
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

      if (projectId && (nextHTML || imageUrl || latestImageUrl)) {
        base44.entities.ProjectHistory.create({
          project_id: projectId,
          html: nextHTML,
          image_url: imageUrl || latestImageUrl,
          messages: finalMessages,
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

  const downloadHTML = () => {
    if (!latestHTML) return;
    const link = document.createElement('a');
    link.href = 'data:text/html;charset=utf-8,' + encodeURIComponent(latestHTML);
    link.download = `${activeProject?.title || 'app'}.html`;
    link.click();
  };

  const downloadZip = async () => {
    if (!latestHTML && !latestImageUrl) return;
    const zip = new JSZip();
    const projectName = activeProject?.title || 'project';
    if (latestHTML) zip.file('index.html', latestHTML);
    if (messages.length > 0) zip.file('chat-history.json', JSON.stringify(messages, null, 2));
    const readme = `# ${projectName}\n\nBuilt with LBC AI.\nExported: ${new Date().toLocaleString()}\n`;
    zip.file('README.md', readme);
    const blob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${projectName.replace(/\s+/g, '-')}.zip`;
    link.click();
    URL.revokeObjectURL(link.href);
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
        {activeProjectId && <ProjectSidePanels projectId={activeProjectId} />}
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
              disabled={!latestHTML}
              title={latestHTML ? 'Show The Generated HTML' : 'Build A Page First'}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
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
            <textarea
              value={latestHTML}
              spellCheck={false}
              onChange={(e) => {
                const newCode = e.target.value;
                setLatestHTML(newCode);
                if (activeProjectId) {
                  base44.entities.BuildProject.update(activeProjectId, { html: newCode, last_built_at: new Date().toISOString() }).catch(() => {});
                }
              }}
              className="w-full h-full resize-none outline-none bg-background text-foreground/80 text-[12px] font-mono leading-relaxed p-4 scrollbar-minimal"
              style={{ fontFamily: "'Share Tech Mono', 'Courier New', monospace" }}
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
                      <span className="ml-2 text-[12px] text-muted-foreground">Designing And Building Your Page…</span>
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
              onClick={() => setPreviewKey(k => k + 1)}
              disabled={!latestHTML}
              className="p-1.5 rounded-md hover:bg-accent/40 text-muted-foreground/70 hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Refresh preview"
            >
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
            <button
              onClick={downloadZip}
              disabled={!latestHTML && !latestImageUrl}
              className="p-1.5 rounded-md hover:bg-accent/40 text-muted-foreground/70 hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Download ZIP archive"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
            <button
              onClick={() => latestHTML && window.open('data:text/html,' + encodeURIComponent(latestHTML), '_blank')}
              disabled={!latestHTML}
              className="p-1.5 rounded-md hover:bg-accent/40 text-muted-foreground/70 hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Open in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
            <button
              onClick={() => setSyncOpen(true)}
              disabled={!activeProject || !latestHTML || sending}
              className="p-1.5 rounded-md hover:bg-accent/40 text-muted-foreground/70 hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={activeProject && latestHTML ? 'Sync To GitHub' : 'Build A Page First, Then Sync It To GitHub'}
              aria-label="Sync To GitHub"
            >
              <Github className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <PreviewPane
          html={latestHTML}
          imageUrl={latestImageUrl}
          loading={previewLoading}
          deviceMode={deviceMode}
          refreshKey={previewKey}
        />
      </div>

      {syncOpen && activeProject && (
        <GitHubSyncDialog open onOpenChange={setSyncOpen} project={activeProject} onSynced={loadProjects} />
      )}
    </div>
  );
}