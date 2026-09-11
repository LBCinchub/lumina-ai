import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Send, MessageCircle, CheckCircle2, XCircle, Loader2, Bot, Smartphone, Info, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Connect tab — LBC AI phone channels. Telegram is fully functional: the user
// creates their own Telegram bot with the official BotFather inside Telegram,
// pastes the token here, and their LBC AI agent answers on their phone — the
// bot only carries messages, the brain is LBC AI. WhatsApp and iMessage show
// honest availability states — no fake buttons, no simulated success.

const SETUP_STEPS = [
  { title: 'Open Telegram', text: 'Open The Telegram App And Search For The Official BotFather Bot.' },
  { title: 'Create A New Bot', text: 'Send /newbot To BotFather, Choose A Name, Then Choose A Username Ending In "bot".' },
  { title: 'Copy The Token', text: 'BotFather Replies With A Token Like 123456789:ABC-DEF1234 — Copy It Exactly.' },
  { title: 'Paste It Below', text: 'Paste The Token Into The Field Below And Press Connect — LBC AI Verifies It Live With Telegram.' },
];

export default function AgentConnectTab({ agent }) {
  const [token, setToken] = useState('');
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null); // { type: 'ok' | 'error', text }

  useEffect(() => {
    let alive = true;
    base44.entities.UserAgentConnection.filter({ agent_id: agent.id })
      .then(conns => {
        if (!alive) return;
        setConnection((conns || []).find(c => c.status === 'connected') || null);
        setLoading(false);
      })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [agent.id]);

  const callFn = async (name, payload) => {
    try {
      const res = await base44.functions.invoke(name, payload);
      const data = res?.data || res;
      if (data?.error) return { error: data.error };
      return { data };
    } catch (err) {
      const errData = err?.response?.data || err?.data || {};
      return { error: errData.error || errData.reason || 'Something Went Wrong. Please Try Again.' };
    }
  };

  const connected = !!(connection && connection.telegram_bot_username);

  const handleConnect = async () => {
    const t = token.trim();
    if (!t || connecting) return;
    setConnecting(true);
    setResult(null);
    const res = await callFn('saveUserAgentTelegram', { agent_id: agent.id, bot_token: t });
    setConnecting(false);
    if (res.error || res.data?.connected === false) {
      setResult({ type: 'error', text: res.error || res.data?.reason || 'Telegram Could Not Verify This Token. Check It And Try Again.' });
      return;
    }
    setToken('');
    const uname = res.data?.bot_username ? `@${res.data.bot_username}` : 'Your Bot';
    setResult({ type: 'ok', text: `Connected — ${uname} Is Live On Telegram. Send It A Message To Start Chatting With ${agent.name}.` });
    base44.entities.UserAgentConnection.filter({ agent_id: agent.id })
      .then(conns => setConnection((conns || []).find(c => c.status === 'connected') || null))
      .catch(() => {});
  };

  const handleTestMessage = async () => {
    if (testing) return;
    setTesting(true);
    setResult(null);
    const res = await callFn('testUserAgentTelegram', { agent_id: agent.id, send_test: true });
    setTesting(false);
    if (res.data?.sent) {
      setResult({ type: 'ok', text: 'Test Message Sent — Check Telegram On Your Phone.' });
    } else {
      setResult({ type: 'error', text: res.error || res.data?.reason || 'The Test Message Could Not Be Sent.' });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-minimal">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-5 animate-fade-up">
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Chat with {agent.name} from your phone. Your bot only carries messages — every answer comes from your LBC AI agent, with its own persona, instructions, and knowledge.
        </p>

        {result && (
          <div
            className={cn(
              "flex items-start gap-2 rounded-lg border px-3.5 py-2.5 text-[12px] leading-relaxed",
              result.type === 'ok'
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            )}
          >
            {result.type === 'ok'
              ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} />
              : <XCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} />}
            {result.text}
          </div>
        )}

        {/* Telegram — fully functional */}
        <div className="rounded-xl border border-border/40 bg-card p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center">
                <Send className="w-4 h-4 text-foreground/70" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="text-sm font-medium">Telegram</h3>
                <p className="text-[11px] text-muted-foreground">Two-Way Chat On Your Phone</p>
              </div>
            </div>
            {loading ? (
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
                <Loader2 className="w-3 h-3 animate-spin" /> Checking…
              </span>
            ) : connected ? (
              <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} />
                Connected — @{connection.telegram_bot_username}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-border/50 bg-muted/30 text-muted-foreground font-medium">
                <XCircle className="w-3.5 h-3.5" strokeWidth={2} />
                Not Connected
              </span>
            )}
          </div>

          {!connected && (
            <div className="rounded-lg border border-border/30 bg-muted/10 p-4 space-y-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium">
                Create Your Bot In Telegram — 4 Steps
              </div>
              <ol className="space-y-2.5">
                {SETUP_STEPS.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-[11px] font-medium flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div>
                      <div className="text-[12px] font-medium">{step.title}</div>
                      <div className="text-[11.5px] text-muted-foreground leading-relaxed mt-0.5">{step.text}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="space-y-2.5">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium">
              {connected ? 'Replace Your Bot' : 'Connect Your Bot'}
            </div>
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Paste Your Telegram Bot Token"
              disabled={connecting}
              className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2.5 text-[12px] font-mono outline-none focus:border-primary/40 transition-colors disabled:opacity-50"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleConnect}
                disabled={!token.trim() || connecting}
                className="px-3.5 py-2 rounded-lg text-[12px] bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-40 inline-flex items-center gap-1.5"
              >
                {connecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {connected ? 'Replace Bot' : 'Connect'}
              </button>
              {connected && (
                <button
                  onClick={handleTestMessage}
                  disabled={testing}
                  className="px-3.5 py-2 rounded-lg text-[12px] border border-border/50 hover:bg-accent/50 transition-colors disabled:opacity-40 inline-flex items-center gap-1.5"
                >
                  {testing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Test Message
                </button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
              Your token is stored encrypted — LBC AI never shows it again after connecting.
            </p>
          </div>

          {connected && (
            <div className="flex items-start gap-2 rounded-lg border border-border/30 bg-muted/10 px-3.5 py-2.5 text-[11.5px] text-muted-foreground leading-relaxed">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={1.75} />
              <span>
                How It Works — Your Phone ↔ Your Telegram Bot ↔ {agent.name} On LBC AI.
                Send your bot a message and {agent.name} answers within about 5 minutes.
                Autopilot results are delivered to your Telegram too.
              </span>
            </div>
          )}
        </div>

        {/* WhatsApp — honest coming-soon state */}
        <div className="rounded-xl border border-border/40 bg-card p-4 md:p-5">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-md bg-muted/40 flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4 text-muted-foreground/60" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-medium mb-1">WhatsApp</h3>
              <p className="text-[12.5px] text-foreground/80 font-medium">
                Coming Soon — LBC Is Setting Up LBC-Branded WhatsApp Access
              </p>
              <p className="text-[11.5px] text-muted-foreground leading-relaxed mt-1.5">
                No Connection Needed Today. This Space Will Activate Automatically When LBC-Branded WhatsApp Access Is Live.
              </p>
            </div>
          </div>
        </div>

        {/* iMessage — honest unavailable state */}
        <div className="rounded-xl border border-border/40 bg-card p-4 md:p-5">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-md bg-muted/40 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4 text-muted-foreground/60" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-medium mb-1">iMessage</h3>
              <p className="text-[12.5px] text-foreground/80 font-medium">
                Not Available — Apple Does Not Provide An API
              </p>
              <p className="text-[11.5px] text-muted-foreground leading-relaxed mt-1.5">
                Apple Does Not Offer A Public API For iMessage, So No App Can Connect To It.
                This Will Not Change Until Apple Provides One.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 pt-1">
          <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />
          New Telegram Messages Are Answered Within About 5 Minutes.
        </div>
      </div>
    </div>
  );
}