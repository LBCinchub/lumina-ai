import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useSearchParams } from 'react-router-dom';
import ChatHistoryDrawer from '@/components/chat/ChatHistoryDrawer';
import ChatContextDrawer from '@/components/chat/ChatContextDrawer';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatEmptyState from '@/components/chat/ChatEmptyState';
import MessageBubble from '@/components/chat/MessageBubble';
import ThinkingIndicator from '@/components/chat/ThinkingIndicator';
import Composer from '@/components/chat/Composer';
import BrandLogo from '@/components/brand/BrandLogo';
import JumpToLatest from '@/components/chat/JumpToLatest';
import { useChatScroll } from '@/hooks/useChatScroll';
import ContextSelector from '@/components/converse/ContextSelector';
import DeepSearchDialog from '@/components/research/DeepSearchDialog';
import DocumentDialog from '@/components/documents/DocumentDialog';
import { useExportPDF } from '@/hooks/useExportPDF';
import { useSpeechOutput } from '@/hooks/useSpeechOutput';
import LiveCallOverlay from '@/components/chat/LiveCallOverlay';
import ExportDialog from '@/components/chat/ExportDialog';
import ImageStudio from '@/components/twin/ImageStudio';
import { useTwinLearning } from '@/components/twin/useTwinLearning';

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
  const [contextOpen, setContextOpen] = useState(false);
  const [hasContext, setHasContext] = useState(null);
  const [opener] = useState(() => OPENERS[Math.floor(Math.random() * OPENERS.length)]);
  const [currentContext, setCurrentContext] = useState('yours');
  const [sisterMessages, setSisterMessages] = useState([]);
  const [selectedContext, setSelectedContext] = useState({ documents: [], conversations: [] });

  const activeIdRef = useRef(null);
  const [sendingConvoId, setSendingConvoId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = checking
  const [voiceMode, setVoiceMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const lastSpokenIdRef = useRef(null);
  const voiceModeRef = useRef(false);
  const startMicRef = useRef(null);
  const composerRef = useRef(null);
  const { speak, stop: stopSpeaking, speaking, unlock: unlockSpeech } = useSpeechOutput();
  const [imageOpen, setImageOpen] = useState(false);
  const [deepSearchOpen, setDeepSearchOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const { logInteraction } = useTwinLearning();

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
    // Ignore a late load for a thread the user already left.
    if (activeIdRef.current !== convoId) return;
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

  const { scrollRef, contentRef, onScroll, atBottom, hasNew, pin } = useChatScroll(messages.length, activeId);


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

    if (speaking) stopSpeaking();

    let convoId = activeIdRef.current || activeId;
    const isNew = !convoId;

    const fileUrls = attachments.map(a => a.url);
    const displayText = text || (attachments.length ? `[${attachments.map(a => a.name).join(', ')}]` : '');

    logInteraction('general', 'chat', { text: displayText.slice(0, 120) });

    if (isNew) {
      // Generate smart title from first message
      let title = 'New conversation';
      try {
        const titleRes = await base44.functions.invoke('orchestrateBuild', { step: 'title', message: displayText });
        const titleData = titleRes?.data || titleRes || {};
        title = (titleData.title || '').trim().slice(0, 60) || 'New conversation';
      } catch (_) {
        title = displayText.slice(0, 40);
        if (displayText.length > 40) title += '…';
      }
      
      // Server-side creation: owner_email + ownership_state are derived from
      // the authenticated session inside createConversation — never set here.
      const createRes = await base44.functions.invoke('createConversation', { title: title || 'New conversation' });
      const createdConvo = createRes?.data || createRes || {};
      convoId = createdConvo.id;
      activeIdRef.current = convoId;
      setActiveId(convoId);
      setSearchParams({ c: convoId }, { replace: true });
    }

    // Optimistic user message
    const optimistic = { id: 'tmp-' + Date.now(), role: 'user', content: displayText, conversation_id: convoId, file_urls: fileUrls, fresh: true };
    setMessages(prev => [...prev, optimistic]);
    isSendingRef.current = true;
    setIsSending(true);
    setSendingConvoId(convoId);
    pin();

    try {
      // Single request: the server saves the turn, so an automatic client
      // retry could generate a duplicate reply. The user retries manually.
      const result = await base44.functions.invoke('chatWithLumina', { 
            conversation_id: convoId, 
            message: displayText, 
            file_urls: fileUrls,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            explicit_context: {
              document_ids: selectedContext.documents.map(d => d.id),
              conversation_ids: selectedContext.conversations.map(c => c.id)
            }
          });

      if (!result?.data?.content) {
        throw new Error('Empty response from LBC AI');
      }

      const content = result.data.content;

      // Insert the full reply once, only into the thread it belongs to. If the
      // user switched threads, the server copy appears when they return.
      if (activeIdRef.current === convoId) {
        const now = Date.now();
        const extra = (result.data.images || []).map((img, i) => ({ id: `assistant-img-${now}-${i}`, role: 'assistant', content: img, conversation_id: convoId, fresh: true }));
        const assistantMsg = { id: 'assistant-' + now, role: 'assistant', content, conversation_id: convoId, fresh: true };
        setMessages(prev => [...prev, ...extra, assistantMsg]);
      }

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
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      // If session expired, redirect to login
      if (err?.message?.includes('401') || err?.message?.toLowerCase().includes('auth') || err?.message?.toLowerCase().includes('unauthorized')) {
        setIsAuthenticated(false);
        return;
      }
      // Keep the user's words: put them back in the composer for a manual retry.
      if (text) setInput(prev => prev || text);
      const serverError = err?.response?.data?.error || err?.data?.error || err?.error;
      if (activeIdRef.current === convoId) {
        setMessages(prev => [...prev, {
          id: 'error-' + Date.now(),
          role: 'assistant',
          fresh: true,
          content: serverError || 'The Reply Did Not Arrive. Your Message Is Back In The Box Below, So You Can Send It Again.'
        }]);
      }
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
      setSendingConvoId(null);
    }
  };

  const { exportThread } = useExportPDF();
  const activeTitle = activeId ? (conversations.find(c => c.id === activeId)?.title || 'Conversation') : 'New Chat';

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
        <BrandLogo size={56} alt="LBC AI" className="mb-8" />
        <h1 className="font-serif text-3xl tracking-tight mb-3">Welcome To LBC AI</h1>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-8">
          Sign in to start a conversation.
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
    <ImageStudio open={imageOpen} onOpenChange={setImageOpen} />
    <DeepSearchDialog open={deepSearchOpen} onOpenChange={setDeepSearchOpen} />
    <DocumentDialog open={docOpen} onOpenChange={setDocOpen} conversationId={activeId} messages={messages} />
    {voiceMode && (
      <LiveCallOverlay
        speaking={speaking}
        listening={listening}
        isSending={isSending}
        onEnd={toggleVoiceMode}
      />
    )}
    <ChatHistoryDrawer
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
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
    <ChatContextDrawer
      open={contextOpen}
      onOpenChange={setContextOpen}
      currentContext={currentContext}
      onContextChange={handleContextChange}
      onRecommendation={(r) => logInteraction(r.vertical, r.action_type, { recommendation: r.id })}
    />
    <div className="flex h-[calc(100dvh-7.5rem-env(safe-area-inset-bottom))] md:h-[100dvh] overflow-hidden">
      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <ChatHeader
          title={activeTitle}
          hasThread={!!activeId && messages.length > 0}
          voiceMode={voiceMode}
          onHistory={() => setSidebarOpen(true)}
          onNew={handleNew}
          onContext={() => setContextOpen(true)}
          onDeepSearch={() => setDeepSearchOpen(true)}
          onDraft={() => setDocOpen(true)}
          onImage={() => setImageOpen(true)}
          onExport={handleExportClick}
          onVoice={toggleVoiceMode}
        />

        {/* Messages */}
        <div className="flex-1 min-h-0 relative">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="h-full overflow-y-auto overscroll-contain scrollbar-minimal pt-14"
        >
          {showEmpty ? (
            <ChatEmptyState
              opener={opener}
              hasContext={hasContext}
              onDeepSearch={() => setDeepSearchOpen(true)}
              onImage={() => setImageOpen(true)}
            />
          ) : (
            <div ref={contentRef} className="max-w-3xl mx-auto px-5 md:px-8 py-8 space-y-7">
              {isLoadingMessages ? (
                <div className="text-center text-sm text-muted-foreground">Loading…</div>
              ) : (
                (currentContext === 'yours' ? messages : sisterMessages).map((m, i) => {
                  const msgs = currentContext === 'yours' ? messages : sisterMessages;
                  return <MessageBubble key={m.id} message={m} isLatest={i === msgs.length - 1} />;
                })
              )}
              {isSending && sendingConvoId === activeId && <ThinkingIndicator />}
            </div>
          )}
        </div>
        <JumpToLatest visible={!showEmpty && !atBottom} hasNew={hasNew} onClick={pin} />
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-border/60 bg-background md:pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-3xl mx-auto px-3 md:px-8 py-3">
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
                handleSubmit(text, attachments);
              }}
              disabled={isSending}
              voiceMode={voiceMode}
              luminaSpeaking={speaking}
              onListeningChange={setListening}
              onBargeIn={stopSpeaking}
            />
            <p className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground/60 text-center mt-3">
              LBC AI · Reflects · Not Advises
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}