import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useSearchParams } from 'react-router-dom';
import ConversationList from '@/components/chat/ConversationList';
import MessageBubble from '@/components/chat/MessageBubble';
import ThinkingIndicator from '@/components/chat/ThinkingIndicator';
import Composer from '@/components/chat/Composer';
import LuminaMark from '@/components/layout/LuminaMark';
import ContextToggle from '@/components/converse/ContextToggle';
import ContextSelector from '@/components/converse/ContextSelector';
import { PanelLeft, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExportPDF } from '@/hooks/useExportPDF';
import { useSpeechOutput } from '@/hooks/useSpeechOutput';
import LiveCallOverlay from '@/components/chat/LiveCallOverlay';
import ExportDialog from '@/components/chat/ExportDialog';

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
  const isSendingRef = useRef(false);
  const [isLoadingConvos, setIsLoadingConvos] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasContext, setHasContext] = useState(null);
  const [opener] = useState(() => OPENERS[Math.floor(Math.random() * OPENERS.length)]);
  const [currentContext, setCurrentContext] = useState('yours');
  const [sisterMessages, setSisterMessages] = useState([]);
  const [selectedContext, setSelectedContext] = useState({ documents: [], conversations: [] });

  const scrollRef = useRef(null);
  const activeIdRef = useRef(null);
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = checking
  const [voiceMode, setVoiceMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const lastSpokenIdRef = useRef(null);
  const voiceModeRef = useRef(false);
  const startMicRef = useRef(null);
  const composerRef = useRef(null);
  const { speak, stop: stopSpeaking, speaking, unlock: unlockSpeech } = useSpeechOutput();

  // Wire composerRef to startMicRef once available
  useEffect(() => {
    startMicRef.current = () => composerRef.current?.start();
  }, []);

  // In voice mode, keep mic running even while Lumina speaks
  // When user speaks, stopSpeaking() is called inside handleSubmit to interrupt
  const restartMicRef = useRef(null);
  useEffect(() => {
    restartMicRef.current = () => composerRef.current?.restart();
  }, []);

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
    base44.auth.isAuthenticated().then(authed => {
      setIsAuthenticated(authed);
      if (authed) {
        loadConversations();
        base44.entities.UserContext.list().then(ctxs => setHasContext(ctxs.length > 0));
      }
    });
  }, [loadConversations]);

  useEffect(() => {
    if (convoIdFromUrl) {
      // Only reload if it's genuinely a different conversation (not the one we just created)
      if (convoIdFromUrl !== activeIdRef.current) {
        activeIdRef.current = convoIdFromUrl;
        setActiveId(convoIdFromUrl);
        loadMessages(convoIdFromUrl);
      }
    } else {
      activeIdRef.current = null;
      setActiveId(null);
      setMessages([]);
    }
  }, [convoIdFromUrl, loadMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isSending]);

  // Keep ref in sync so callbacks don't close over stale voiceMode
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);

  // Auto-speak latest Lumina message in voice mode
  // Fire whenever messages change — guard on voiceMode only
  useEffect(() => {
    if (!voiceMode) return;
    const last = [...messages].reverse().find(m => m.role === 'assistant');
    if (!last || last.id === lastSpokenIdRef.current) return;
    // Don't speak optimistic/tmp messages
    if (String(last.id).startsWith('tmp-')) return;
    lastSpokenIdRef.current = last.id;
    speak(last.content, () => {
      // Lumina finished speaking naturally — restart mic if not already running
      if (voiceModeRef.current && restartMicRef.current) {
        restartMicRef.current();
      }
    });
  }, [messages, voiceMode, speak]);

  const handleSelect = (id) => {
    setSearchParams({ c: id });
    setSidebarOpen(false);
  };

  const handleNew = () => {
    setSearchParams({});
    setSidebarOpen(false);
  };

  const handleContextChange = async (contextData) => {
    if (contextData.contextType === 'yours') {
      setCurrentContext('yours');
      setMessages(messages);
    } else if (contextData.contextType === 'sister') {
      setCurrentContext('sister');
      const conv = contextData.conversation;
      setSisterMessages(conv.messages || []);
    }
  };

  const handleSubmit = async (rawText, attachments = []) => {
    const text = rawText?.trim() || '';
    if (!text && !attachments.length) return;
    if (isSendingRef.current) return;

    console.log('[Converse] Submitting message:', { text, attachments });

    // If Lumina is speaking, interrupt her immediately
    if (speaking) stopSpeaking();

    let convoId = activeIdRef.current || activeId;
    const isNew = !convoId;

    const fileUrls = attachments.map(a => a.url);
    const displayText = text || (attachments.length ? `[${attachments.map(a => a.name).join(', ')}]` : '');

    if (isNew) {
      // Generate smart title from first message
      let title = 'New conversation';
      try {
        const titleRes = await base44.integrations.Core.InvokeLLM({
          prompt: `Write a 3-5 word title (no quotes, no punctuation at the end, sentence case) that captures what the user wants to discuss:\n\n"${displayText}"\n\nTitle:`
        });
        title = (typeof titleRes === 'string' ? titleRes : '').trim().replace(/^["']|["']$/g, '').slice(0, 60);
      } catch (_) {
        title = displayText.slice(0, 40);
        if (displayText.length > 40) title += '…';
      }
      
      const convo = await base44.entities.Conversation.create({
        title: title || 'New conversation',
        last_message_at: new Date().toISOString()
      });
      convoId = convo.id;
      activeIdRef.current = convoId;
      setActiveId(convoId);
      setSearchParams({ c: convoId }, { replace: true });
    }

    // Optimistic user message
    const optimistic = { id: 'tmp-' + Date.now(), role: 'user', content: displayText, conversation_id: convoId, file_urls: fileUrls };
    setMessages(prev => [...prev, optimistic]);
    isSendingRef.current = true;
    setIsSending(true);

    try {
      let result = null;
      let retries = 0;
      const maxRetries = 2;

      // Retry logic for reliability
      while (retries <= maxRetries) {
        try {
          result = await base44.functions.invoke('chatWithLumina', { 
            conversation_id: convoId, 
            message: displayText, 
            file_urls: fileUrls,
            explicit_context: {
              document_ids: selectedContext.documents.map(d => d.id),
              conversation_ids: selectedContext.conversations.map(c => c.id)
            }
          });
          break; // Success, exit retry loop
        } catch (err) {
          retries++;
          if (retries > maxRetries) throw err;
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }

      // Only proceed if we got a valid response
      if (!result?.data?.content) {
        throw new Error('Empty response from Lumina');
      }

      const content = result.data.content;

      // Optimistically show assistant response immediately
      const assistantMsg = { id: 'assistant-' + Date.now(), role: 'assistant', content, conversation_id: convoId };
      setMessages(prev => [...prev.filter(m => m.id !== optimistic.id), { ...optimistic, id: optimistic.id }, assistantMsg]);

      // Sync to shared pool if in your context
      if (currentContext === 'yours') {
        try {
          await base44.functions.invoke('syncConversation', {
            conversationId: convoId,
            platformOrigin: 'lbchub.site'
          });
        } catch (_) {
          // Non-critical, don't break flow
        }
      }

      // Reload conversations list only (not messages — backend saves async, don't overwrite optimistic)
      loadConversations();
    } catch (err) {
      console.error('Message send failed:', err);
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      // If session expired, redirect to login
      if (err?.message?.includes('401') || err?.message?.toLowerCase().includes('auth') || err?.message?.toLowerCase().includes('unauthorized')) {
        setIsAuthenticated(false);
        return;
      }
      setMessages(prev => [...prev, { 
        id: 'error-' + Date.now(), 
        role: 'assistant', 
        content: '⚠️ Message failed to send. Please try again.' 
      }]);
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  };

  const { exportThread } = useExportPDF();
  const activeTitle = activeId ? (conversations.find(c => c.id === activeId)?.title || 'Conversation') : 'New thread';

  const handleExportClick = () => {
    setExportOpen(true);
  };

  const handleExport = () => {
    exportThread(activeTitle, messages);
  };

  const toggleVoiceMode = () => {
    if (voiceMode) {
      stopSpeaking();
      composerRef.current?.stop();
      voiceModeRef.current = false;
      setVoiceMode(false);
      setListening(false);
    } else {
      unlockSpeech(); // unlock speech synthesis on this direct user gesture
      voiceModeRef.current = true;
      setVoiceMode(true);
      // Start mic immediately — it will stay on for the whole call
      setTimeout(() => {
        if (startMicRef.current) startMicRef.current();
      }, 100);
    }
  };

  const showEmpty = !activeId && messages.length === 0;

  // Auth gate — show sign-in screen for unauthenticated users (common on mobile)
  if (isAuthenticated === false) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-6 text-center animate-fade-up">
        <LuminaMark size={56} className="text-foreground/70 mb-8" />
        <h1 className="font-serif text-3xl tracking-tight mb-3">Welcome to Luna</h1>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-8">
          Sign in to start a conversation. Lumina Ultra remembers your context and grows with you.
        </p>
        <button
          onClick={() => base44.auth.redirectToLogin()}
          className="flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-full text-sm font-medium hover:opacity-90 transition-all"
        >
          Sign in to continue
        </button>
      </div>
    );
  }

  // Still checking auth
  if (isAuthenticated === null) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
    <ExportDialog
      open={exportOpen}
      onOpenChange={setExportOpen}
      title={activeTitle}
      messages={messages}
      onDownload={handleExport}
    />
    {voiceMode && (
      <LiveCallOverlay
        speaking={speaking}
        listening={listening}
        isSending={isSending}
        onEnd={toggleVoiceMode}
      />
    )}
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
          voiceMode={voiceMode}
          speaking={speaking}
          listening={listening}
          onToggleVoice={toggleVoiceMode}
        />
        <ContextToggle
          currentContext={currentContext}
          onContextChange={handleContextChange}
          myPlatform="lbchub.site"
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
              {activeId && messages.length > 0 && (
                <button
                  onClick={handleExportClick}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  title="Export thread"
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
                Lumina Ultra — Sister Twin to Lumina AI at lbc-hub.com. She reasons from what you've shared. The more context, the sharper the mirror.
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
                (currentContext === 'yours' ? messages : sisterMessages).map((m, i) => {
                  const msgs = currentContext === 'yours' ? messages : sisterMessages;
                  return <MessageBubble key={m.id} message={m} isLatest={i === msgs.length - 1} />;
                })
              )}
              {isSending && <ThinkingIndicator />}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-border/60 bg-background/80 backdrop-blur-xl">
          <div className="max-w-3xl mx-auto px-5 md:px-8 py-3">
            <div className="flex items-center justify-between mb-2">
              <ContextSelector onContextChange={setSelectedContext} />
              {selectedContext.documents.length > 0 || selectedContext.conversations.length > 0 ? (
                <span className="text-[10px] text-muted-foreground">
                  {selectedContext.documents.length + selectedContext.conversations.length} context item(s) selected
                </span>
              ) : null}
            </div>
            <Composer
              ref={composerRef}
              value={input}
              onChange={setInput}
              onSubmit={(text, attachments) => {
                console.log('[Converse] Composer submitted:', { text, attachments });
                handleSubmit(text, attachments);
              }}
              disabled={isSending}
              voiceMode={voiceMode}
              luminaSpeaking={speaking}
              onListeningChange={setListening}
              onBargeIn={stopSpeaking}
            />
            <p className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground/60 text-center mt-3">
              Lumina Ultra reflects · not advises · Sister Twin to Lumina AI
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}