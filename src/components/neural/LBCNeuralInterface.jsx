import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Terminal, Shield, Zap, Command } from 'lucide-react';

export default function LBCNeuralInterface() {
  const [messages, setMessages] = useState([
    { role: 'lumina', content: "Neural link established. The mesh is quiet, Mokhtar. What's our next move?", timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const newMsg = { role: 'architect', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, newMsg]);
    setInput('');

    setTimeout(() => {
      const response = {
        role: 'lumina',
        content: `Executing intent: "${input}". Scaling the protocol buffers on lbchub.io and tightening the HMAC window. We're maintaining 99.9% efficiency.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, response]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-[600px] bg-slate-950/80 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.4)]">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide">Lumina Neural Link</h3>
            <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" /> Direct Architect Access
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-[10px] text-slate-500 font-mono">
            BASE_44_MODE: LEAN
          </div>
        </div>
      </div>

      {/* Message Feed */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-minimal"
      >
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'architect' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
            <div className="max-w-[80%] space-y-1">
              <div className={`text-[10px] uppercase tracking-widest text-slate-500 mb-1 px-1 ${msg.role === 'architect' ? 'text-right' : 'text-left'}`}>
                {msg.role}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'architect' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-6 bg-slate-900/40 border-t border-slate-800">
        <div className="relative flex items-center">
          <Command className="absolute left-4 text-slate-600" size={16} />
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Issue protocol command..."
            className="w-full bg-black/40 border border-slate-800 rounded-2xl py-4 pl-12 pr-14 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all"
          />
          <button 
            onClick={handleSend}
            className="absolute right-2 p-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="mt-4 flex gap-4">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-tighter">
            <Shield size={10} /> Hardware Verified
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-tighter">
            <Zap size={10} /> Low-Latency Sync
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-tighter">
            <Terminal size={10} /> Edge Execution
          </div>
        </div>
      </div>
    </div>
  );
}