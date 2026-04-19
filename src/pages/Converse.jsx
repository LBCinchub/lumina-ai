import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useSearchParams } from 'react-router-dom';
import ConversationList from '@/components/chat/ConversationList';
import MessageBubble from '@/components/chat/MessageBubble';
import ThinkingIndicator from '@/components/chat/ThinkingIndicator';
import Composer from '@/components/chat/Composer';
import LuminaMark from '@/components/layout/LuminaMark';
import { PanelLeft, Download, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExportPDF } from '@/hooks/useExportPDF';
import { useSpeechOutput } from '@/hooks/useSpeechOutput';

const OPENERS = [
  "What are you circling right now?",
  "Where's the friction today?",
  "Name the thing you're avoiding.",
  "What shifted since we last spoke?"
];

export default function Converse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const convoIdFromUrl = searchParams.get('c');

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingConvos, setIsLoadingConvos] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasContext, setHasContext] = useState(null);
  const [opener] = useState(() => OPENERS[Math.floor(Math.random() * OPENERS.length)]);

  const scrollRef = useRef(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const lastSpokenIdRef = useRef(null);
  const { speak, stop: stopSpeaking, speaking } = useSpeechOutput();

  const loadConversations = useCallback(async () => {
    setIsLoadingConvos(true);
    const data = await base44.entities.Conversation.list('-last_message_at', 50);
    setConversations(data);
    setIsLoadingConvos(false);
    return data;
  }, []);

  const loadMessages = useCallback(async (convoId) => {
    if (!convoId) {
      setMessages([]);
      return;
    }
    setIsLoadingMessages(true);
    const data = await base44.entities.Message.filter({ conversation_id: convoId }, 'created_date', 200);
    setMessages(data);
    setIsLoadingMessages(false);
  }, []);

  useEffect(() => {
    loadConversations();
    base44.entities.UserContext.list().then(ctxs => setHasContext(ctxs.length > 0));
  }, [loadConversations]);

  useEffect(() => {
    if (convoIdFromUrl && convoIdFromUrl !== activeId) {
      setActiveId(convoIdFromUrl);
      loadMessages(convoIdFromUrl);
    } else if (!convoIdFromUrl) {
      setActiveId(null);
      setMessages([]);
    }
  }, [convoIdFromUrl, activeId, loadMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isSending]);

  // Auto-speak latest Lumina message in voice mode
  useEffect(() => {
    if (!voiceMode || isSending) return;
    const last = [...messages].reverse().find(m => m.role === 'assistant');
    if (last && last.id !== lastSpokenIdRef.current) {
      lastSpokenIdRef.current = last.id;
      speak(last.content);
    }
  }, [messages, isSending, voiceMode, speak]);

  const handleSelect = (id) => {
    setSearchParams({ c: id });
    setSidebarOpen(false);
  };

  const handleNew = () => {
    setSearchParams({});
    setSidebarOpen(false);
  };

  const handleSubmit = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || isSending) return;

    let convoId = activeId;
    const isNew = !convoId;

    if (isNew) {
      const convo = await base44.entities.Conversation.create({
        title: 'New conversation',
        last_message_at: new Date().toISOString()
      });
      convoId = convo.id;
      setActiveId(convoId);
      setSearchParams({ c: convoId });
    }

    // Optimistic user message
    const optimistic = { id: 'tmp-' + Date.now(), role: 'user', content: text, conversation_id: convoId };
    setMessages(prev => [...prev, optimistic]);
    setInput('');
    setIsSending(true);

    try {
      await base44.functions.invoke('chatWithLumina', { conversation_id: convoId, message: text });
      await loadMessages(convoId);
      loadConversations();
    } catch (err) {
      setMessages(prev => [...prev, {
        id: 'err-' + Date.now(),
        role: 'assistant',
        content: "Something blocked that response. Try again."
      }]);
    } finally {
      setIsSending(false);
    }
  };

  const { exportThread } = useExportPDF();
  const activeTitle = activeId ? (conversations.find(c => c.id === activeId)?.title || 'Conversation') : 'New thread';

  const handleExport = () => {
    exportThread(activeTitle, messages);
  };

  const toggleVoiceMode = () => {
    if (voiceMode) {
      stopSpeaking();
      setVoiceMode(false);
    } else {
      setVoiceMode(true);
    }
  };

  const showEmpty = !activeId && messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen">
      {/* Conversation sidebar */}
      <aside className={cn(
        "w-72 shrink-0 border-r border-border bg-sidebar/60 flex-col",
        "hidden lg:flex",
        sidebarOpen && "fixed inset-y-0 left-0 md:left-60 z-30 flex bg-sidebar shadow-xl lg:shadow-none lg:static"
      )}>
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={handleSelect}
          onNew={handleNew}
          isLoading={isLoadingConvos}
        />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="absolute top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/60">
          <div className="flex items-center justify-between px-5 h-14">
            <button
              onClick={() => setSidebarOpen(s => !s)}
              className="lg:hidden p-1.5 -ml-1.5 text-foreground/70 hover:text-foreground"
              aria-label="Threads"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 text-center lg:text-left lg:pl-0">
              <div className="text-sm font-medium text-foreground/80 truncate px-8 lg:px-0">
                {activeTitle}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleVoiceMode}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors",
                  voiceMode
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                title={voiceMode ? "Stop voice chat" : "Start voice chat"}
              >
                <Radio className={cn("w-3.5 h-3.5", voiceMode && speaking && "animate-pulse text-red-500")} strokeWidth={1.75} />
                <span className="hidden sm:inline">{voiceMode ? 'Live' : 'Voice'}</span>
              </button>
              {activeId && messages.length > 0 && (
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  title="Export thread as PDF"
                >
                  <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span className="hidden sm:inline">Export</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto scrollbar-minimal pt-14"
        >
          {showEmpty ? (
            <div className="h-full flex flex-col items-center justify-center px-6 animate-fade-up">
              <LuminaMark size={56} className="text-foreground/70 mb-8" />
              <h1 className="font-serif text-3xl md:text-4xl tracking-tight text-center mb-3">
                {opener}
              </h1>
              <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
                Lumina reasons from what you've shared. The more context, the sharper the mirror.
              </p>
              {hasContext === false && (
                <a
                  href="/context"
                  className="mt-6 text-xs uppercase tracking-[0.14em] text-foreground/70 hover:text-foreground border-b border-foreground/30 hover:border-foreground pb-0.5"
                >
                  Build your context
                </a>
              )}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 space-y-6">
              {isLoadingMessages ? (
                <div className="text-center text-sm text-muted-foreground">Loading…</div>
              ) : (
                messages.map((m, i) => (
                  <MessageBubble key={m.id} message={m} isLatest={i === messages.length - 1} />
                ))
              )}
              {isSending && <ThinkingIndicator />}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-border/60 bg-background/80 backdrop-blur-xl">
          <div className="max-w-3xl mx-auto px-5 md:px-8 py-4">
            <Composer
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              disabled={isSending}
              voiceMode={voiceMode}
              luminaSpeaking={speaking}
            />
            <p className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground/60 text-center mt-3">
              Lumina reflects · not advises
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}