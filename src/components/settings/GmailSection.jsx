import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, RefreshCw, Send, Unplug } from 'lucide-react';

const GMAIL_CONNECTOR_ID = '6aac167efa382a764028ad72';

// Gmail — each user connects their own inbox (Ultra tier, enforced server-side).
export default function GmailSection() {
  const [status, setStatus] = useState('loading'); // loading | connected | disconnected | upgrade
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ to: '', subject: '', body: '' });
  const [sendState, setSendState] = useState(''); // idle | sending | sent | error
  const [sendError, setSendError] = useState('');

  // Connection status doubles as the inbox loader.
  const loadInbox = async () => {
    setError('');
    try {
      const res = await base44.functions.invoke('gmailOperations', { action: 'list' });
      setMessages(res?.data?.messages || []);
      setStatus('connected');
    } catch (err) {
      const data = err?.response?.data || err?.data || {};
      if (data.upgrade_required) {
        setStatus('upgrade');
      } else {
        setStatus('disconnected');
        if (!data.not_connected) setError('Gmail Is Unavailable Right Now — Please Try Again.');
      }
    }
  };

  useEffect(() => { loadInbox(); }, []);

  const handleConnect = async () => {
    try {
      const { url } = await base44.connectors.connectAppUser(GMAIL_CONNECTOR_ID);
      const popup = window.open(url, '_blank');
      setStatus('loading');
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          loadInbox();
        }
      }, 500);
    } catch (_) {
      setStatus('disconnected');
      setError('Could Not Start The Gmail Connection — Please Try Again.');
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      await base44.connectors.disconnectAppUser(GMAIL_CONNECTOR_ID);
      setMessages([]);
      setStatus('disconnected');
    } catch (_) {
      setError('Could Not Disconnect Gmail — Please Try Again.');
    }
    setBusy(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSendState('sending');
    setSendError('');
    try {
      await base44.functions.invoke('gmailOperations', {
        action: 'send',
        to: form.to,
        subject: form.subject,
        body: form.body,
      });
      setSendState('sent');
      setForm({ to: '', subject: '', body: '' });
      setTimeout(() => setSendState('idle'), 3000);
    } catch (err) {
      setSendState('error');
      setSendError('Gmail Could Not Send This Message — Please Try Again.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> Gmail
          </span>
          {status === 'connected' && (
            <Button variant="ghost" size="sm" onClick={loadInbox} disabled={busy}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-[12px] text-muted-foreground">
          Connect Your Own Inbox — LBC AI Sends And Reads Only From Your Gmail, Never Anyone Else's.
        </p>

        {error && <p className="text-[12px] text-destructive">{error}</p>}

        {status === 'loading' && (
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse-soft" /> Checking Your Gmail Connection…
          </div>
        )}

        {status === 'upgrade' && (
          <p className="text-[13px] text-muted-foreground">
            Gmail Is An LBC AI Ultra Capability — Upgrade To Ultra In Plans To Connect Your Inbox.
          </p>
        )}

        {status === 'disconnected' && (
          <Button onClick={handleConnect} className="w-full sm:w-auto">
            <Mail className="h-4 w-4" /> Connect Gmail
          </Button>
        )}

        {status === 'connected' && (
          <>
            <div className="space-y-2">
              {messages.length === 0 && (
                <p className="text-[13px] text-muted-foreground">Your Inbox Is Empty.</p>
              )}
              {messages.map(m => (
                <div key={m.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[13px] font-medium truncate">{m.subject}</p>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {m.date ? new Date(m.date).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{m.from}</p>
                  <p className="text-[12px] text-muted-foreground truncate mt-1">{m.snippet}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSend} className="space-y-3 pt-2 border-t border-border">
              <p className="text-[13px] font-medium pt-2">Compose From Your Gmail</p>
              <div className="space-y-1.5">
                <Label htmlFor="gmail-to">To</Label>
                <Input
                  id="gmail-to"
                  type="email"
                  required
                  value={form.to}
                  onChange={e => setForm(f => ({ ...f, to: e.target.value }))}
                  placeholder="name@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gmail-subject">Subject</Label>
                <Input
                  id="gmail-subject"
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Subject"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gmail-body">Message</Label>
                <Textarea
                  id="gmail-body"
                  rows={4}
                  value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="Write Your Message…"
                />
              </div>
              {sendState === 'error' && <p className="text-[12px] text-destructive">{sendError}</p>}
              {sendState === 'sent' && <p className="text-[12px] text-primary">Message Sent.</p>}
              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={sendState === 'sending'}>
                  <Send className="h-3.5 w-3.5" /> {sendState === 'sending' ? 'Sending…' : 'Send'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={handleDisconnect} disabled={busy}>
                  <Unplug className="h-3.5 w-3.5" /> Disconnect
                </Button>
              </div>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}