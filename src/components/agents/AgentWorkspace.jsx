import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import AgentGallery from './AgentGallery';
import AgentCreateWizard from './AgentCreateWizard';
import AgentChat from './AgentChat';
import AgentEditDialog from './AgentEditDialog';
import AgentDetailHeader from './AgentDetailHeader';
import AgentAutopilotTab from './AgentAutopilotTab';
import AgentConnectTab from './AgentConnectTab';
import { AGENT_ACTIVE_LIMIT } from './agentTemplates';

// Container for the My Agents workspace (gallery / create wizard / agent chat).
// Every mutation routes through the backend functions so ownership is stamped
// and verified server-side; entity reads arrive RLS-scoped to this user only.
export default function AgentWorkspace({ onBack }) {
  const [view, setView] = useState('gallery'); // gallery | create | chat
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [knowledgeSources, setKnowledgeSources] = useState([]);
  const [activeAgent, setActiveAgent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailTab, setDetailTab] = useState('chat'); // chat | autopilot | connect

  const callFn = async (name, payload) => {
    try {
      const res = await base44.functions.invoke(name, payload);
      const data = res?.data || res;
      if (data?.error) return { error: data.error };
      return { data };
    } catch (err) {
      const errData = err?.response?.data || err?.data || {};
      return { error: errData.error || 'Something Went Wrong. Please Try Again.' };
    }
  };

  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await base44.entities.UserAgent.list('-created_date', 100);
      setAgents(data);
    } catch (_) {
      setError('Could Not Load Your Agents.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAgents();
    base44.entities.KnowledgeSource.list('-created_date', 100)
      .then(setKnowledgeSources)
      .catch(() => setKnowledgeSources([]));
  }, [loadAgents]);

  const openChat = async (agent) => {
    setActionError(null);
    setActiveAgent(agent);
    setDetailTab('chat');
    setView('chat');
    setLoadingMessages(true);
    try {
      const data = await base44.entities.UserAgentMessage.filter(
        { agent_id: agent.id }, 'created_date', 200
      );
      setMessages(data);
    } catch (_) {
      setMessages([]);
    }
    setLoadingMessages(false);
  };

  const handleCreate = async (payload) => {
    const res = await callFn('createUserAgent', payload);
    if (res.error) return res;
    await loadAgents();
    if (res.data?.agent) {
      openChat(res.data.agent);
    } else {
      setView('gallery');
    }
    return { ok: true };
  };

  const handleSend = async (text) => {
    if (!text.trim() || sending) return;
    const optimistic = { id: 'tmp-' + Date.now(), role: 'user', content: text };
    setMessages(prev => [...prev, optimistic]);
    setSending(true);
    const res = await callFn('chatWithUserAgent', { agent_id: activeAgent.id, message: text });
    if (res.error) {
      setMessages(prev => [
        ...prev.filter(m => m.id !== optimistic.id),
        optimistic,
        { id: 'err-' + Date.now(), role: 'assistant', content: `⚠️ ${res.error}` },
      ]);
    } else {
      setMessages(prev => [
        ...prev.filter(m => m.id !== optimistic.id),
        optimistic,
        { id: 'a-' + Date.now(), role: 'assistant', content: res.data?.content || '' },
      ]);
    }
    setSending(false);
  };

  const handleArchive = async (agent) => {
    setActionError(null);
    const res = await callFn('updateUserAgent', { agent_id: agent.id, status: 'archived' });
    if (res.error) setActionError(res.error);
    loadAgents();
  };

  const handleRestore = async (agent) => {
    setActionError(null);
    const res = await callFn('updateUserAgent', { agent_id: agent.id, status: 'active' });
    if (res.error) setActionError(res.error);
    loadAgents();
  };

  const handleUpdate = async (agentId, updates) => {
    const res = await callFn('updateUserAgent', { agent_id: agentId, ...updates });
    if (res.error) return res;
    setEditing(null);
    loadAgents();
    return { ok: true };
  };

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden">
      {view === 'gallery' && (
        <AgentGallery
          agents={agents}
          loading={loading}
          error={error}
          limit={AGENT_ACTIVE_LIMIT}
          actionError={actionError}
          onRetry={loadAgents}
          onCreate={() => { setActionError(null); setView('create'); }}
          onOpenChat={openChat}
          onEdit={(a) => setEditing(a)}
          onArchive={handleArchive}
          onRestore={handleRestore}
        />
      )}

      {view === 'create' && (
        <AgentCreateWizard
          knowledgeSources={knowledgeSources}
          onCancel={() => setView('gallery')}
          onCreate={handleCreate}
        />
      )}

      {view === 'chat' && activeAgent && (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AgentDetailHeader
            agent={activeAgent}
            onBack={() => { setView('gallery'); loadAgents(); }}
            activeTab={detailTab}
            onTabChange={setDetailTab}
          />
          {detailTab === 'chat' && (
            <AgentChat
              agent={activeAgent}
              messages={messages}
              loadingMessages={loadingMessages}
              sending={sending}
              onSend={handleSend}
            />
          )}
          {detailTab === 'autopilot' && <AgentAutopilotTab agent={activeAgent} />}
          {detailTab === 'connect' && <AgentConnectTab agent={activeAgent} />}
        </div>
      )}

      {editing && (
        <AgentEditDialog
          agent={editing}
          knowledgeSources={knowledgeSources}
          onClose={() => setEditing(null)}
          onSave={handleUpdate}
        />
      )}
    </div>
  );
}