import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Rocket, AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DeploymentTrigger({ onDeploymentStart }) {
  const [deploying, setDeploying] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [environment, setEnvironment] = useState('staging');

  const handleDeploy = async () => {
    setDeploying(true);
    setError(null);
    setStatus('initializing');

    try {
      // Trigger deployment via lbcDeployer
      const res = await base44.functions.invoke('lbcDeployer', {
        environment,
        action: 'deploy',
      });

      if (res.data?.success) {
        setStatus('success');
        setTimeout(() => {
          setDeploying(false);
          if (onDeploymentStart) onDeploymentStart();
        }, 2000);
      } else {
        setError(res.data?.message || 'Deployment failed');
        setStatus('error');
        setDeploying(false);
      }
    } catch (err) {
      setError(err.message || 'Deployment error');
      setStatus('error');
      setDeploying(false);
    }
  };

  const handleForge = async () => {
    setDeploying(true);
    setError(null);
    setStatus('forging');

    try {
      // Trigger deployment forge for advanced builds
      const res = await base44.functions.invoke('lbcDeploymentForge', {
        environment,
        buildMode: 'production',
      });

      if (res.data?.success) {
        setStatus('success');
        setTimeout(() => {
          setDeploying(false);
          if (onDeploymentStart) onDeploymentStart();
        }, 2000);
      } else {
        setError(res.data?.message || 'Forge failed');
        setStatus('error');
        setDeploying(false);
      }
    } catch (err) {
      setError(err.message || 'Forge error');
      setStatus('error');
      setDeploying(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h2 className="font-serif text-xl tracking-tight mb-2">Production Deployment</h2>
        <p className="text-sm text-muted-foreground">
          Trigger a build and deploy to your selected environment. Choose between standard deployment or advanced forge mode.
        </p>
      </div>

      {/* Environment Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Target Environment</label>
        <select
          value={environment}
          onChange={(e) => setEnvironment(e.target.value)}
          disabled={deploying}
          className={cn(
            "w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground",
            "disabled:opacity-60 disabled:cursor-not-allowed text-sm"
          )}
        >
          <option value="staging">Staging</option>
          <option value="production">Production</option>
          <option value="canary">Canary</option>
        </select>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-6 flex gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Deployment Error</p>
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="mb-6 flex gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/30 animate-fade-up">
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-500">Deployment Successful</p>
            <p className="text-sm text-green-500/80">Your changes are now being deployed.</p>
          </div>
        </div>
      )}

      {(status === 'initializing' || status === 'forging') && (
        <div className="mb-6 flex gap-3 p-4 rounded-lg bg-accent/10 border border-accent/30">
          <Loader className="w-5 h-5 text-accent shrink-0 mt-0.5 animate-spin" />
          <div>
            <p className="font-medium text-accent">
              {status === 'forging' ? 'Forge in Progress' : 'Initializing Deployment'}
            </p>
            <p className="text-sm text-accent/80">This may take a few moments…</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={handleDeploy}
          disabled={deploying}
          className={cn(
            "flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all",
            "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
          )}
        >
          {deploying && status === 'initializing' ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <Rocket className="w-4 h-4" strokeWidth={1.75} />
          )}
          Standard Deploy
        </button>
        <button
          onClick={handleForge}
          disabled={deploying}
          className={cn(
            "flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all",
            "bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-60 disabled:cursor-not-allowed"
          )}
        >
          {deploying && status === 'forging' ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <Rocket className="w-4 h-4" strokeWidth={1.75} />
          )}
          Advanced Forge
        </button>
      </div>

      {/* Info Section */}
      <div className="mt-8 p-4 rounded-lg bg-muted/40 border border-border/60">
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">How it works</p>
        <ul className="space-y-1 text-sm text-muted-foreground/80">
          <li>• <strong>Standard Deploy</strong> builds and deploys with default configurations</li>
          <li>• <strong>Advanced Forge</strong> performs optimized builds with enhanced artifact generation</li>
          <li>• Deployments are tracked in the History tab</li>
          <li>• Manage environment variables in the Configuration tab</li>
        </ul>
      </div>
    </div>
  );
}