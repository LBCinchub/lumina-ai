import React, { useState } from 'react';
import { Rocket, Server, Cpu, Database, ChevronRight, Terminal as TerminalIcon, CheckCircle2, Loader2 } from 'lucide-react';

const TemplateCard = ({ icon: Icon, title, desc, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-start gap-4 p-5 rounded-2xl border transition-all duration-300 ${
      active 
        ? 'bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500/50' 
        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
    }`}
  >
    <div className={`p-3 rounded-xl ${active ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
      <Icon size={20} />
    </div>
    <div className="text-left">
      <h3 className={`font-medium ${active ? 'text-white' : 'text-slate-200'}`}>{title}</h3>
      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</p>
    </div>
  </button>
);

export default function LBCDeploymentEngine() {
  const [step, setStep] = useState('idle');
  const [selectedTemplate, setSelectedTemplate] = useState('twin');
  const [logs, setLogs] = useState([]);

  const templates = [
    { id: 'twin', title: 'Frontend Twin', desc: 'Deploy a new UI node synced with lbc-hub.com aesthetics.', icon: Server },
    { id: 'api', title: 'Protocol API', desc: 'Scale the lbchub.io logic with a new high-speed worker.', icon: Cpu },
    { id: 'mesh', title: 'Database Mesh', desc: 'Redundant storage node connecting to the Mother Node.', icon: Database },
  ];

  const addLog = (msg) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-8));
  };

  const startDeployment = () => {
    setStep('provisioning');
    addLog(`Initiating deployment for ${selectedTemplate}...`);
    
    setTimeout(() => {
      addLog("Allocating resources on lbc.network...");
      setStep('routing');
      
      setTimeout(() => {
        addLog("Establishing cryptographic tunnel to lbchub.io...");
        setStep('verifying');
        
        setTimeout(() => {
          addLog("Hardware signature verified via Architect Tablet.");
          setStep('complete');
          addLog("Deployment successful. Node live at Edge.");
        }, 1500);
      }, 1500);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Deployment Engine</h2>
            <p className="text-slate-500 text-sm">Orchestrate new instances across the LBC mesh.</p>
          </div>
          <Rocket className={`w-6 h-6 ${step === 'idle' ? 'text-slate-700' : 'text-indigo-400 animate-pulse'}`} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {templates.map(t => (
            <TemplateCard 
              key={t.id} 
              {...t} 
              active={selectedTemplate === t.id} 
              onClick={() => step === 'idle' && setSelectedTemplate(t.id)} 
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-black/40 border border-slate-800 rounded-2xl p-6 font-mono overflow-hidden">
            <div className="flex items-center gap-2 mb-4 text-xs text-slate-500 uppercase tracking-widest font-sans">
              <TerminalIcon size={14} /> System Logs
            </div>
            <div className="space-y-2 h-48 overflow-y-auto scrollbar-minimal">
              {logs.length === 0 && <span className="text-slate-700 italic">Waiting for trigger...</span>}
              {logs.map((log, i) => (
                <div key={i} className="text-sm text-indigo-300/80 animate-in fade-in slide-in-from-left-2">
                  <span className="text-slate-600 mr-2">$</span> {log}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-8 flex flex-col justify-center">
            <div className="space-y-6">
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-slate-400">Deployment Status</span>
                <span className="text-indigo-400 font-medium capitalize">{step}</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-1000 ease-out"
                  style={{ width: step === 'idle' ? '0%' : step === 'provisioning' ? '25%' : step === 'routing' ? '50%' : step === 'verifying' ? '85%' : '100%' }}
                />
              </div>

              {step === 'complete' ? (
                <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
                  <CheckCircle2 size={18} /> Node is now operational in the LBC Mesh.
                </div>
              ) : (
                <button
                  disabled={step !== 'idle'}
                  onClick={startDeployment}
                  className="w-full py-4 bg-white text-black font-semibold rounded-xl hover:bg-slate-200 disabled:bg-slate-800 disabled:text-slate-500 transition-all flex items-center justify-center gap-2"
                >
                  {step === 'idle' ? (
                    <>Deploy to Mesh <ChevronRight size={18} /></>
                  ) : (
                    <><Loader2 className="animate-spin" size={18} /> Provisioning...</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}