import React, { useState, useEffect } from 'react';
import { Send, MessageCircle, Smartphone, Info, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

const GUIDE_STEPS = [
  'Open Telegram and search for @BotFather (or visit t.me/BotFather).',
  'Send /newbot, then choose a name and a username for your bot.',
  'BotFather replies with a token that looks like 123456789:ABCdefGh…. Copy it.',
  'Paste the token below. It is stored encrypted server-side and never shown again.',
];

// Connect tab for one agent's detail view. Telegram is fully functional via
// the user's own BotFather bot; WhatsApp and iMessage show honest unavailable
// states — no fake connect buttons, no simulated success.
export default function AgentConnectTab({ agent }) {
  const [connection, setConnection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { sent, reason }
  const [limitsOpen, setLimitsOpen] = useState(false);

  const loadConnection = async () => {
    setIsLoading(true);
    try {
      const conns = await base44.entities.UserAgentConnection.filter(
        { agent_id: agent.id, channel: 'telegram' }
      );
      setConnection(conns && conns[0] && conns[0].status === 'connected' ? conns[0] : null);
    } catch (_) {
      setConnection(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadConnection();
  }, [agent.id]); // eslint-disable-line

  const handleConnect = async () => {
    const t = token.trim();
    if (!t || connecting) return;
    setConnecting(true);
    setConnectError(null);
    setTestResult(null);
    try {
      const res = await base44.functions.invoke('saveUserAgentTelegram', {
        agent_id: agent.id,
        bot_token: t,
      });
      const data = res?.data || res;
      if (data?.error) {
        setConnectError(data.error);
      } else {
        setToken('');
        await loadConnection();
      }
    } catch (_) {
      setConnectError('Could not connect the bot. Please try again.');
    }
    setConnecting(false);
  };

  const handleTest = async () => {
    if (testing) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await base44.functions.invoke('testUserAgentTelegram', { agent_id: agent.id });
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

  return (
    <div className="flex-1 overflow-y-auto scrollbar-minimal">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-4 animate-fade-up">
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Connect {agent.name} to your phone and chat from anywhere. Credentials are stored encrypted server-side — never in your browser.
        </p>

        {/* Telegram — fully functional */}
        <div className="rounded-xl border border-border/40 bg-card">
          <div className="p-4 md:p-5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-md bg-accent flex items-center justify-center shrink-0">
              <Send className="w-4 h-4 text-foreground/70" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">Telegram</span>
                {isLoading ? (
                  <span className="text-[11px] text-muted-foreground/70">Checking…</span>
                ) : connection ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-foreground/70 bg-primary/10 border border-primary/30 rounded-full px-2 py-0.5">
                    <CheckCircle2 className="w-3 h-3" strokeWidth={2} />
                    Connected
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground/70">Not Connected</span>
                )}
              </div>

              {!connection ? (
                <div className="mt-3 space-y-3">
                  <ol className="space-y-1.5 text-[12px] text-muted-foreground leading-relaxed">
                    {GUIDE_STEPS.map((step, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-foreground/60 font-medium shrink-0">{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={token}
                      onChange={e => setToken(e.target.value)}
                      placeholder="Paste your bot token"
                      autoComplete="off"
                      className="flex-1 bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-primary/40 transition-colors"
                    />
                    <button
                      onClick={handleConnect}
                      disabled={!token.trim() || connecting}
                      className="px-3 py-2 rounded-lg text-[12px] bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-40 inline-flex items-center gap-1.5"
                    >
                      {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Connect'}
                    </button>
                  </div>
                  {connectError && (
                    <p className="text-[11px] text-destructive flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {connectError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    Your bot <span className="text-foreground/80">@{connection.bot_username || 'bot'}</span> forwards messages to {agent.name}. Open Telegram, message your bot, and the agent replies right there.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleTest}
                      disabled={testing}
                      className="px-3 py-1.5 rounded-lg text-[12px] border border-border/40 hover:bg-accent/50 transition-colors disabled:opacity-40 inline-flex items-center gap-1.5"
                    >
                      {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Test Message'}
                    </button>
                    {testResult && (
                      <span className={cn(
                        "text-[11px] inline-flex items-center gap-1.5",
                        testResult.sent ? "text-foreground/70" : "text-muted-foreground"
                      )}>
                        {testResult.sent
                          ? '✓ Sent — check Telegram'
                          : (testResult.reason || 'The test could not be sent.')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* WhatsApp — honest unavailable state */}
        <div className="rounded-xl border border-border/40 bg-muted/20 p-4 md:p-5 flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-muted/40 flex items-center justify-center shrink-0">
            <MessageCircle className="w-4 h-4 text-muted-foreground/70" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground/60">WhatsApp</div>
            <div className="text-[12px] text-muted-foreground mt-1 font-medium">
              Coming Soon — Requires WhatsApp Business API Onboarding
            </div>
            <p className="text-[12px] text-muted-foreground/80 leading-relaxed mt-1.5">
              Automating a personal WhatsApp number is not permitted. Per-user WhatsApp access requires Meta business verification and an approved business account — we will add it when a compliant path exists.
            </p>
          </div>
        </div>

        {/* iMessage — honest unavailable state */}
        <div className="rounded-xl border border-border/40 bg-muted/20 p-4 md:p-5 flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-muted/40 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4 text-muted-foreground/70" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground/60">iMessage</div>
            <div className="text-[12px] text-muted-foreground mt-1 font-medium">
              Not Available — Apple Provides No API For Third-Party Apps
            </div>
            <p className="text-[12px] text-muted-foreground/80 leading-relaxed mt-1.5">
              Apple offers no public API for third-party apps to send or receive iMessages. This is not a setting we can complete later — it requires an Apple-sanctioned channel that does not exist today.
            </p>
          </div>
        </div>

        <button
          onClick={() => setLimitsOpen(true)}
          className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70 hover:text-foreground transition-colors inline-flex items-center gap-1.5"
        >
          <Info className="w-3.5 h-3.5" strokeWidth={1.75} />
          Why These Limits?
        </button>
      </div>

      <Dialog open={limitsOpen} onOpenChange={setLimitsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Why These Limits?</DialogTitle>
            <DialogDescription>
              We only ship connections that genuinely work for personal accounts.
            </DialogDescription>
          </DialogHeader>
          <div className="text-[12px] text-muted-foreground leading-relaxed space-y-3">
            <p>
              <span className="text-foreground/80 font-medium">Telegram works today</span> because it offers an official Bot API that anyone can use with their own bot in a few minutes.
            </p>
            <p>
              <span className="text-foreground/80 font-medium">WhatsApp</span> restricts automation to verified businesses through the WhatsApp Business API — a personal number cannot be connected, so we show Coming Soon rather than a button that cannot work.
            </p>
            <p>
              <span className="text-foreground/80 font-medium">iMessage</span> has no third-party API at all. Any service claiming to send iMessages for you is doing something Apple does not sanction, and we will not do that.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}