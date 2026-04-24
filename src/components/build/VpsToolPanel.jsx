import React, { useState } from 'react';
import { Server, Terminal, Copy, Check } from 'lucide-react';

export default function VpsToolPanel() {
  const [copied, setCopied] = useState(false);

  const copyCommand = (cmd) => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-minimal p-6">
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <Server className="w-5 h-5 text-foreground/60" />
          <h2 className="text-lg font-medium">VPS Deployment Tools</h2>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-lg border border-border bg-card">
            <h3 className="text-sm font-medium text-foreground/80 mb-2">Deploy to VPS</h3>
            <p className="text-xs text-muted-foreground mb-3">Push your project to a virtual private server for production deployment.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-muted/60 px-3 py-2 rounded text-foreground/80 truncate">
                npm run deploy:vps
              </code>
              <button
                onClick={() => copyCommand('npm run deploy:vps')}
                className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-border bg-card">
            <h3 className="text-sm font-medium text-foreground/80 mb-2">SSH Access</h3>
            <p className="text-xs text-muted-foreground mb-3">Connect to your server via SSH for direct control.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-muted/60 px-3 py-2 rounded text-foreground/80 truncate">
                ssh -i ~/.ssh/vps_key user@your-vps-ip
              </code>
              <button
                onClick={() => copyCommand('ssh -i ~/.ssh/vps_key user@your-vps-ip')}
                className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-border bg-card">
            <h3 className="text-sm font-medium text-foreground/80 mb-2">View Logs</h3>
            <p className="text-xs text-muted-foreground mb-3">Monitor your application logs in real-time.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-muted/60 px-3 py-2 rounded text-foreground/80 truncate">
                npm run logs:vps
              </code>
              <button
                onClick={() => copyCommand('npm run logs:vps')}
                className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-muted/40 border border-border/60">
          <div className="flex gap-2 items-start">
            <Terminal className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs font-medium text-foreground/70 mb-1">Getting Started</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Configure your VPS credentials in the project settings before deploying. Ensure you have SSH access set up and the deployment keys installed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}