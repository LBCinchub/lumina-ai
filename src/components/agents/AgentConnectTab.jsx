import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Send, MessageCircle, CheckCircle2, XCircle, Loader2, Smartphone, Info, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Connect tab — LBC AI phone channels. Telegram runs on the official LBC AI
// bot: users pair their phone with a short-lived single-use 6-digit code, and
// their LBC AI agent answers two-way on Telegram. WhatsApp and iMessage show
// honest availability states — no fake buttons, no simulated success.

export default function AgentConnectTab({ agent }) {
  const [botStatus, setBotStatus] = useState(null); // { ok, username }
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pairing, setPairing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null); // { type: 'ok' | 'error', text }

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

  const loadConnection = () => {
    return base44.entities.UserAgentConnection.filter({ agent_id: agent.id })
      .then(conns => setConnection((conns || [])[0] || null))
      .catch(() => {});
  };

  useEffect(() => {
    let alive = true;
    callFn('telegramConnect', { action: 'verify' }).then(res => {
      if (!alive) return;
      setBotStatus(res.error ? { ok: false, error: res.error } : { ok: true, username: res.data?.username || '' });
    });
    loadConnection().finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [agent.id]);

  const pending = !!(connection && connection.status === 'pending_pairing' && connection.pairing_code);
  const paired = !!(connection && connection.status === 'connected');

  // While a pairing is open, poll so the card flips to Connected the moment
  // the user sends /start from their phone.
  useEffect(() => {
    if (!pending) return undefined;
    const timer = setInterval(loadConnection, 10000);
    return () => clearInterval(timer);
  }, [pending, agent.id]);

  const handlePair = async () => {
    if (pairing) return;
    setPairing(true);
    setResult(null);
    const res = await callFn('telegramConnect', { action: 'pair', agent_id: agent.id });
    setPairing(false);
    if (res.error) {
      setResult({ type: 'error', text: res.error });
      return;
    }
    await loadConnection();
    setResult({ type: 'ok', text: 'Pairing Code Ready — It Expires In 15 Minutes And Works Once.' });
  };

  const handleTestMessage = async () => {
    if (testing) return;
    setTesting(true);
    setResult(null);
    const res = await callFn('telegramConnect', { action: 'test', agent_id: agent.id });
    setTesting(false);
    if (res.data?.sent) {
      setResult({ type: 'ok', text: 'Test Message Sent — Check Telegram On Your Phone.' });
    } else {
      setResult({ type: 'error', text: res.error || res.data?.reason || 'The Test Message Could Not Be Sent.' });
    }
  };

  const code = connection?.pairing_code || '';
  const formattedCode = code ? code.split('').join(' ') : '';

  return (
    <div className="flex-1 overflow-y-auto scrollbar-minimal">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-5 animate-fade-up">
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Chat with {agent.name} from your phone. The bot only carries messages — every answer comes from your LBC AI agent, with its own persona, instructions, and knowledge.
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

        {/* Telegram — official LBC AI bot, pairing flow */}
        <div className="rounded-xl border border-border/40 bg-card p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center">
                <Send className="w-4 h-4 text-foreground/70" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="text-sm font-medium">Telegram</h3>
                <p className="text-[11px] text-muted-foreground">
                  {botStatus?.ok
                    ? `Official LBC AI Bot${botStatus.username ? ` — @${botStatus.username}` : ''}`
                    : 'Two-Way Chat On Your Phone'}
                </p>
              </div>
            </div>
            {loading ? (
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
                <Loader2 className="w-3 h-3 animate-spin" /> Checking…
              </span>
            ) : paired ? (
              <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} />
                Connected{connection.bot_username ? ` — @${connection.bot_username}` : ''}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-border/50 bg-muted/30 text-muted-foreground font-medium">
                <XCircle className="w-3.5 h-3.5" strokeWidth={2} />
                Not Connected
              </span>
            )}
          </div>

          {botStatus && !botStatus.ok && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-[11.5px] text-destructive leading-relaxed">
              <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={2} />
              {botStatus.error}
            </div>
          )}

          {paired && (
            <div className="space-y-3">
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                {agent.name} answers you right here in Telegram — messages, replies, and Autopilot results all land in this chat.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleTestMessage}
                  disabled={testing}
                  className="px-3.5 py-2 rounded-lg text-[12px] border border-border/50 hover:bg-accent/50 transition-colors disabled:opacity-40 inline-flex items-center gap-1.5"
                >
                  {testing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Test Message
                </button>
                <button
                  onClick={handlePair}
                  disabled={pairing}
                  className="px-3.5 py-2 rounded-lg text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors disabled:opacity-40 inline-flex items-center gap-1.5"
                >
                  {pairing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Re-Pair This Agent
                </button>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-border/30 bg-muted/10 px-3.5 py-2.5 text-[11.5px] text-muted-foreground leading-relaxed">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={1.75} />
                <span>
                  How It Works — Your Phone ↔ The Official LBC AI Bot ↔ {agent.name} On LBC AI.
                  Every reply is logged in this agent's chat history.
                </span>
              </div>
            </div>
          )}

          {pending && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3.5">
              <div className="text-center">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium mb-2">
                  Your Pairing Code — Expires In 15 Minutes, Works Once
                </div>
                <div className="font-mono text-2xl tracking-[0.35em] font-medium py-2">{formattedCode}</div>
              </div>
              <div className="rounded-lg border border-border/30 bg-muted/10 p-4 space-y-2.5">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium">
                  Three Steps On Your Phone
                </div>
                <ol className="space-y-2">
                  {[
                    'Open Telegram On Your Phone.',
                    botStatus?.username
                      ? `Find The Official LBC AI Bot — @${botStatus.username}.`
                      : 'Find The Official LBC AI Bot.',
                    `Send This Message To The Bot: /start ${code}`,
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-[11px] font-medium flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-[12px] leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <p className="text-[11px] text-muted-foreground/70 leading-relaxed text-center">
                This page flips to Connected automatically once the bot receives your code.
                Generate A New Code if this one expires.
              </p>
              <button
                onClick={handlePair}
                disabled={pairing}
                className="w-full px-3.5 py-2 rounded-lg text-[12px] border border-border/50 hover:bg-accent/50 transition-colors disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
              >
                {pairing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Generate A New Code
              </button>
            </div>
          )}

          {!pending && !paired && (
            <div className="space-y-3.5">
              <div className="rounded-lg border border-border/30 bg-muted/10 p-4">
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  Pairing takes about a minute: generate a 6-digit code here, then send it to the official LBC AI bot on Telegram from your phone.
                </p>
              </div>
              <button
                onClick={handlePair}
                disabled={pairing || (botStatus && !botStatus.ok)}
                className="px-4 py-2 rounded-lg text-[12px] bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-40 inline-flex items-center gap-1.5"
              >
                {pairing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Pair My Telegram
              </button>
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
          Telegram Messages Are Answered In Seconds, With Hourly Reply Limits.
        </div>
      </div>
    </div>
  );
}