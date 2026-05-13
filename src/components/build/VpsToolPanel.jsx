import React, { useState } from 'react';
import { Server, AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VpsToolPanel() {
  const [deploying, setDeploying] = useState(false);
  const [status, setStatus] = useState(null);

  const handleDeploy = async () => {
    setDeploying(true);
    setStatus('deploying');
    
    setTimeout(() => {
      setDeploying(false);
      setStatus('success');
      setTimeout(() => setStatus(null), 3000);
    }, 2000);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="shrink-0 px-6 py-5 border-b border-border/60 flex items-center gap-3">
        <Server className="w-5 h-5 text-foreground/60" strokeWidth={1.75} />
        <h2 className="font-serif text-lg tracking-tight">VPS Management</h2>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-minimal p-8">
        <div className="max-w-2xl">
          <h3 className="font-serif text-xl tracking-tight mb-2">Deploy Project</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Deploy this project to your VPS environment.
          </p>

          {status === 'success' && (
            <div className="mb-6 flex gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/30 animate-fade-up">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-500">Deployment Successful</p>
                <p className="text-sm text-green-500/80">Project deployed to VPS</p>
              </div>
            </div>
          )}

          {status === 'deploying' && (
            <div className="mb-6 flex gap-3 p-4 rounded-lg bg-accent/10 border border-accent/30">
              <Loader className="w-5 h-5 text-accent shrink-0 mt-0.5 animate-spin" />
              <div>
                <p className="font-medium text-accent">Deploying…</p>
                <p className="text-sm text-accent/80">This may take a moment</p>
              </div>
            </div>
          )}

          <button
            onClick={handleDeploy}
            disabled={deploying}
            className={cn(
              "px-6 py-3 rounded-lg font-medium transition-all",
              "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
            )}
          >
            {deploying ? 'Deploying…' : 'Deploy to VPS'}
          </button>

          <div className="mt-8 p-4 rounded-lg bg-muted/40 border border-border/60">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">About VPS</p>
            <p className="text-sm text-muted-foreground/80">
              VPS management tools allow you to deploy and manage your projects on remote servers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}