import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import TerminalInput from '@/components/terminal/TerminalInput';
import TerminalLines from '@/components/terminal/TerminalLines';

// Private command console for the signed-in LBC AI workspace. Every command
// acts through the same backend functions and RLS-scoped reads as the rest
// of the app — nothing extra is exposed here.

const WORKSPACES = {
  chat: '/',
  agents: '/agents',
  build: '/build',
  knowledge: '/knowledge',
  projects: '/projects',
  pricing: '/pricing',
};

const HELP_LINES = [
  '/ask <message>   Ask LBC AI — the reply prints right here',
  '/agents           List your agents',
  '/tasks            List your Autopilot tasks',
  '/go <workspace>   Open chat · agents · build · knowledge · projects · pricing',
  '/status           Show your session',
  '/clear            Clear the terminal',
];

let lineSeq = 0;
const line = (type, text) => ({ id: 'l' + (++lineSeq), type, text });

export default function Terminal() {
  const [lines, setLines] = useState(() => [
    line('system', 'LBC AI ULTRA — Private Terminal'),
    line('out', 'Type /help for commands. Everything here is private to your account.'),
  ]);
  const [busy, setBusy] = useState(false);
  const convoRef = useRef(null);
  const scrollRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines, busy]);

  const print = (...newLines) => setLines(prev => [...prev, ...newLines]);
  const printOut = (texts) => print(...texts.map(t => line('out', t)));

  const askLumina = async (message) => {
    setBusy(true);
    try {
      if (!convoRef.current) {
        const createRes = await base44.functions.invoke('createConversation', { title: 'Terminal Session' });
        convoRef.current = (createRes?.data || createRes)?.id || null;
      }
      const res = await base44.functions.invoke('chatWithLumina', {
        conversation_id: convoRef.current,
        message,
      });
      const data = res?.data || res || {};
      if (data.content) print(line('assistant', data.content));
      else print(line('err', data.error || 'No Response From LBC AI — Please Try Again.'));
    } catch (err) {
      const serverError = err?.response?.data?.error || err?.data?.error || err?.error;
      print(line('err', serverError || 'The Request Failed — Please Try Again.'));
    }
    setBusy(false);
  };

  const listAgents = async () => {
    setBusy(true);
    try {
      const agents = await base44.entities.UserAgent.list('-created_date', 100);
      if (!agents.length) {
        print(line('out', 'No Agents Yet — Create One In My Agents.'));
      } else {
        print(...agents.map(a => line('out', `— ${a.name} · ${a.persona || 'Agent'} · ${a.status === 'active' ? 'Active' : 'Archived'}`)));
      }
    } catch (err) {
      print(line('err', 'Could Not Load Your Agents — Please Try Again.'));
    }
    setBusy(false);
  };

  const listTasks = async () => {
    setBusy(true);
    try {
      const tasks = await base44.entities.UserAgentTask.list('-created_date', 100);
      if (!tasks.length) {
        print(line('out', 'No Autopilot Tasks Yet — Add One From An Agent.'));
      } else {
        print(...tasks.map(t => line('out', `— ${t.name} · ${t.enabled ? 'Enabled' : 'Paused'}`)));
      }
    } catch (err) {
      print(line('err', 'Could Not Load Your Tasks — Please Try Again.'));
    }
    setBusy(false);
  };

  const showStatus = async () => {
    setBusy(true);
    try {
      const user = await base44.auth.me();
      print(line('out', `Signed In As ${user?.email || '—'}`));
    } catch (err) {
      print(line('err', 'Could Not Load Your Session — Please Try Again.'));
    }
    setBusy(false);
  };

  const handleSubmit = async (raw) => {
    print(line('cmd', raw));
    const [cmd, ...rest] = raw.split(/\s+/);
    const arg = rest.join(' ').trim();

    switch ((cmd || '').toLowerCase()) {
      case '/help':
        printOut(HELP_LINES);
        break;
      case '/clear':
        setLines([]);
        break;
      case '/ask':
        if (!arg) print(line('err', 'Usage — /ask <message>'));
        else await askLumina(arg);
        break;
      case '/agents':
        await listAgents();
        break;
      case '/tasks':
        await listTasks();
        break;
      case '/go':
        if (!arg || !WORKSPACES[arg.toLowerCase()]) {
          print(line('err', 'Usage — /go chat · agents · build · knowledge · projects · pricing'));
        } else {
          const to = WORKSPACES[arg.toLowerCase()];
          print(line('ok', `Opening ${arg[0].toUpperCase() + arg.slice(1).toLowerCase()}…`));
          navigate(to);
        }
        break;
      case '/status':
        await showStatus();
        break;
      default:
        print(line('err', `Unknown Command — ${cmd}. Type /help for commands.`));
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 px-4 md:px-6 py-6">
      <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col min-h-0 rounded-xl border border-border bg-card overflow-hidden">
        {/* Terminal header */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-border" />
            <span className="ml-2 font-mono text-[11px] text-muted-foreground">LBC — Private Terminal</span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border border-pink-400/30 bg-pink-500/10 text-pink-300">
            Private
          </span>
        </div>

        {/* Log */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-minimal p-4 md:p-5">
          <TerminalLines lines={lines} />
          {busy && (
            <div className="mt-3 font-mono text-[12.5px] text-pink-400 animate-pulse">▌ Working…</div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border px-4 py-3 bg-background/40">
          <TerminalInput onSubmit={handleSubmit} busy={busy} />
        </div>
      </div>
    </div>
  );
}