import React, { useState, useEffect } from 'react';
import {
  Smartphone, ExternalLink, Loader2, CheckCircle2, AlertCircle,
  Info, RefreshCw, KeyRound, IdCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

const GUIDE_STEPS = [
  {
    title: 'Create A Free Base44 Account',
    text: 'Sign up at base44.com — free, and your Superagent comes with its own credits.',
    link: 'https://base44.com',
  },
  {
    title: 'Create Your Superagent',
    text: 'Click Agent at the top of the Base44 sidebar and describe what it should do. Keep it simple — it only carries messages.',
  },
  {
    title: 'Connect Your Phone Channel',
    text: 'In your Superagent: Agent Settings → Channels → connect Telegram, WhatsApp, or iMessage. This is how replies reach your phone.',
  },
  {
    title: 'Copy Your Agent ID And API Key',
    text: 'In your Superagent: Agent Settings → Customize → Developer. Copy the Agent ID from its API URL and the API Key, then paste both below.',
  },
];

// Connect tab for one agent's detail view — the unified Superagent Bridge
// (Bring Your Own Superagent). One flow covers every phone channel because
// the user's own Base44 Superagent holds the channel connections. Honest
// states only: no fake buttons, no simulated success, and the API key is
// stored encrypted server-side and never shown again.
export default function AgentConnectTab({ agent }) {
  const [connection, setConnection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [agentIdInput, setAgentIdInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectResult, setConnectResult] = useState(null); // { connected, reason, conversation_count }
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { sent, reason }
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null); // { note }
  const [aboutOpen, setAboutOpen] = useState(false);

  const loadConnection = async () => {
    setIsLoading(true);
    try {
      const conns = await base44.entities.UserAgentConnection.filter(
        { agent_id: agent.id }
      );
      const conn = (conns || []).find(
        c => c && c.status === 'connected' && c.superagent_agent_id && c.api_key_encrypted
      );
      setConnection(conn || null);
    } catch (_) {
      setConnection(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadConnection();
  }, [agent.id]); // eslint-disable-line

  const handleConnect = async () => {
    const superagentId = agentIdInput.trim();
    const apiKey = apiKeyInput.trim();
    if ((!superagentId || !apiKey) || connecting) return;
    setConnecting(true);
    setConnectResult(null);
    setTestResult(null);
    setSyncResult(null);
    try {
      const res = await base44.functions.invoke('saveUserAgentSuperagent', {
        agent_id: agent.id,
        superagent_agent_id: superagentId,
        api_key: apiKey,
      });
      const data = res?.data || res;
      if (data?.error) {
        setConnectResult({ connected: false, reason: data.error });
      } else if (data?.connected === false) {
        setConnectResult({ connected: false, reason: data.reason || 'Your Superagent Is Unreachable — Check Your Base44 Account' });
      } else {
        setAgentIdInput('');
        setApiKeyInput('');
        setConnectResult({ connected: true, conversation_count: data?.conversation_count });
        await loadConnection();
      }
    } catch (_) {
      setConnectResult({ connected: false, reason: 'Could not reach the bridge. Please try again.' });
    }
    setConnecting(false);
  };

  const handleTest = async () => {
    if (testing) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await base44.functions.invoke('testUserAgentSuperagent', { agent_id: agent.id });
      const data = res?.data || res;
      if (data?.error) {
        setTestResult({ sent: false, reason: data.error });
      } else {
        setTestResult({ sent: !!data?.sent, reason: data?.reason || null });
      }
    } catch (_) {
      setTestResult({ sent: false, reason: 'The test could not be sent. Please try again.' });
    }
    setTesting(false);
  };

  const handleSyncNow = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await base44.functions.invoke('superagentBridgeSync', { agent_id: agent.id });
      const data = res?.data || res;
      if (data?.error) {
        setSyncResult({ note: data.error });
      } else if (data?.note) {
        setSyncResult({ note: data.note });
      } else if ((data?.processed || 0) > 0) {
        setSyncResult({ note: `Synced — ${data.processed} new message(s) processed` });
      } else {
        setSyncResult({ note: 'No new messages' });
      }
    } catch (_) {
      setSyncResult({ note: 'The sync could not run. Please try again.' });
    }
    setSyncing(false);
  };

  const renderConnectForm = (compact) => (
    <div className={cn("space-y-3", compact && "mt-3 pt-3 border-t border-border/40")}>
      <div className="grid sm:grid-cols-2 gap-2">
        <div className="relative">
          <IdCard className="w-3.5 h-3.5 text-muted-foreground/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.75} />
          <input
            value={agentIdInput}
            onChange={e => setAgentIdInput(e.target.value)}
            placeholder="Superagent Agent ID"
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-muted/30 border border-border/40 rounded-lg pl-9 pr-3 py-2 text-[12px] outline-none focus:border-primary/40 transition-colors"
          />
        </div>
        <div className="relative">
          <KeyRound className="w-3.5 h-3.5 text-muted-foreground/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.75} />
          <input
            type="password"
            value={apiKeyInput}
            onChange={e => setApiKeyInput(e.target.value)}
            placeholder="Superagent API Key"
            autoComplete="off"
            className="w-full bg-muted/30 border border-border/40 rounded-lg pl-9 pr-3 py-2 text-[12px] outline-none focus:border-primary/40 transition-colors"
          />
        </div>
      </div>
      <button
        onClick={handleConnect}
        disabled={!agentIdInput.trim() || !apiKeyInput.trim() || connecting}
        className="px-3 py-2 rounded-lg text-[12px] bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-40 inline-flex items-center gap-1.5"
      >
        {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.75} />}
        Test Connection
      </button>
      {connectResult && !connectResult.connected && (
        <p className="text-[11px] text-destructive flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {connectResult.reason}
        </p>
      )}
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto scrollbar-minimal">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-4 animate-fade-up">
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Connect {agent.name} to your phone through your own Base44 Superagent. Chat from anywhere — your agent answers with its own persona, instructions, and knowledge.
        </p>

        {/* Unified connection card */}
        <div className="rounded-xl border border-border/40 bg-card">
          <div className="p-4 md:p-5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-md bg-accent flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4 text-foreground/70" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">Connect Your Phone</span>
                {isLoading ? (
                  <span className="text-[11px] text-muted-foreground/70">Checking…</span>
                ) : connection ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-foreground/70 bg-primary/10 border border-primary/30 rounded-full px-2 py-0.5">
                    <CheckCircle2 className="w-3 h-3" strokeWidth={2} />
                    Connected To Your Superagent
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground/70">Not Connected</span>
                )}
              </div>

              {!connection ? (
                <div className="mt-3 space-y-4">
                  <ol className="space-y-2.5">
                    {GUIDE_STEPS.map((step, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-accent text-foreground/70 text-[10px] font-medium flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        <div className="text-[12px] leading-relaxed">
                          <span className="text-foreground/80 font-medium">{step.title}</span>
                          <span className="text-muted-foreground"> — {step.text}</span>
                          {step.link && (
                            <a
                              href={step.link}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-1.5 inline-flex items-center gap-0.5 text-primary hover:underline"
                            >
                              base44.com <ExternalLink className="w-3 h-3" strokeWidth={1.75} />
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                  {renderConnectForm(false)}
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    {agent.name} is bridged to your Superagent. Messages you send it from your connected phone channel are answered by {agent.name} here — and replies, Autopilot results, and in-app chats are mirrored to your phone.
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleTest}
                      disabled={testing}
                      className="px-3 py-1.5 rounded-lg text-[12px] border border-border/40 hover:bg-accent/50 transition-colors disabled:opacity-40 inline-flex items-center gap-1.5"
                    >
                      {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.75} />}
                      Test Connection
                    </button>
                    <button
                      onClick={handleSyncNow}
                      disabled={syncing}
                      className="px-3 py-1.5 rounded-lg text-[12px] border border-border/40 hover:bg-accent/50 transition-colors disabled:opacity-40 inline-flex items-center gap-1.5"
                    >
                      {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />}
                      Sync Now
                    </button>
                  </div>
                  {testResult && (
                    <p className={cn(
                      "text-[11px] inline-flex items-start gap-1.5",
                      testResult.sent ? "text-foreground/70" : "text-muted-foreground"
                    )}>
                      {testResult.sent
                        ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={1.75} />
                        : <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                      {testResult.sent
                        ? 'Test Sent — check your phone for the reply'
                        : (testResult.reason || 'The test could not be sent.')}
                    </p>
                  )}
                  {syncResult && (
                    <p className="text-[11px] text-muted-foreground">{syncResult.note}</p>
                  )}
                  <div>
                    <div className="text-[11px] text-muted-foreground/80 font-medium">
                      Replace Your Superagent
                    </div>
                    {renderConnectForm(true)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Honest info section */}
        <div className="rounded-xl border border-border/40 bg-muted/20 p-4 md:p-5 flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-muted/40 flex items-center justify-center shrink-0">
            <Info className="w-4 h-4 text-muted-foreground/70" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground/80">What This Does</div>
            <div className="text-[12px] text-muted-foreground leading-relaxed mt-1.5 space-y-1.5">
              <p>
                Your Superagent runs on <span className="text-foreground/80">your own Base44 account and credits</span> — LBC AI never charges you for it. It only carries messages between your phone and {agent.name}.
              </p>
              <p>
                Phone channels (Telegram, WhatsApp, iMessage) are connected inside your Superagent on Base44 — LBC AI never sees your phone number.
              </p>
              <p>
                Your API key is stored encrypted server-side, never displayed again, and never shared.
              </p>
              <button
                onClick={() => setAboutOpen(true)}
                className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70 hover:text-foreground transition-colors inline-flex items-center gap-1.5 mt-1"
              >
                How The Bridge Works
              </button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>How The Bridge Works</DialogTitle>
            <DialogDescription>
              Your phone ↔ your Superagent on Base44 ↔ {agent.name} on LBC AI.
            </DialogDescription>
          </DialogHeader>
          <div className="text-[12px] text-muted-foreground leading-relaxed space-y-3">
            <p>
              <span className="text-foreground/80 font-medium">Phone → Agent:</span> you message your Superagent from Telegram, WhatsApp, or iMessage. The bridge picks it up, {agent.name} answers with its own persona, instructions, and knowledge, and the reply lands on your phone.
            </p>
            <p>
              <span className="text-foreground/80 font-medium">In-App → Phone:</span> when you chat with {agent.name} inside LBC AI, replies are mirrored to your phone (rate-limited to once every 30 seconds).
            </p>
            <p>
              <span className="text-foreground/80 font-medium">Autopilot → Phone:</span> scheduled task results are delivered to your phone in addition to the agent's chat history.
            </p>
            <p>
              The bridge checks for new messages every 5 minutes — use Sync Now to check instantly. If your Superagent is unreachable or out of credits, you will see an honest error, never a fake success.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}