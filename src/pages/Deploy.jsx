import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Rocket, History, Settings, AlertCircle, Check } from 'lucide-react';
import DeploymentTrigger from '@/components/deploy/DeploymentTrigger';
import DeploymentHistory from '@/components/deploy/DeploymentHistory';
import EnvironmentConfig from '@/components/deploy/EnvironmentConfig';
import { cn } from '@/lib/utils';

export default function Deploy() {
  const [activeTab, setActiveTab] = useState('trigger');
  const [deployments, setDeployments] = useState([]);
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load deployment history
        const history = await base44.entities.ProjectHistory.filter(
          { branch: { $regex: 'deployment' } },
          '-created_date',
          20
        ).catch(() => []);
        setDeployments(history);

        // Load environment configs from user context or local state
        const userCtx = await base44.entities.UserContext.filter(
          { created_by: user?.email }
        ).catch(() => []);
        setConfigs(userCtx[0]?.context_notes ? JSON.parse(userCtx[0].context_notes) : {});
      } finally {
        setLoading(false);
      }
    };

    if (user?.email) loadData();
  }, [user]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-5 border-b border-border/60 flex items-center gap-3">
        <Rocket className="w-5 h-5 text-foreground/60" strokeWidth={1.75} />
        <h1 className="font-serif text-2xl tracking-tight">Deploy</h1>
        <span className="text-xs text-muted-foreground/60 ml-auto">Production & Environment Management</span>
      </div>

      {/* Tabs */}
      <div className="shrink-0 px-6 py-4 border-b border-border/60 flex items-center gap-2">
        <button
          onClick={() => setActiveTab('trigger')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors",
            activeTab === 'trigger'
              ? "bg-accent text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
          )}
        >
          <Rocket className="w-4 h-4" strokeWidth={1.75} />
          Trigger Build
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors",
            activeTab === 'history'
              ? "bg-accent text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
          )}
        >
          <History className="w-4 h-4" strokeWidth={1.75} />
          History
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors",
            activeTab === 'config'
              ? "bg-accent text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
          )}
        >
          <Settings className="w-4 h-4" strokeWidth={1.75} />
          Configuration
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-minimal">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="w-6 h-6 border-2 border-muted rounded-full animate-spin border-t-foreground" />
          </div>
        ) : activeTab === 'trigger' ? (
          <DeploymentTrigger onDeploymentStart={() => setActiveTab('history')} />
        ) : activeTab === 'history' ? (
          <DeploymentHistory deployments={deployments} />
        ) : (
          <EnvironmentConfig configs={configs} onUpdate={setConfigs} userEmail={user?.email} />
        )}
      </div>
    </div>
  );
}