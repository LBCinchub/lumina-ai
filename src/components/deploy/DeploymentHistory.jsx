import React from 'react';
import { History, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function DeploymentHistory({ deployments }) {
  if (deployments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-16">
        <History className="w-12 h-12 text-muted-foreground/40 mb-4" strokeWidth={1.5} />
        <p className="text-muted-foreground">No deployments yet</p>
        <p className="text-sm text-muted-foreground/60">Trigger a deployment to see history here</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <h2 className="font-serif text-xl tracking-tight mb-6">Deployment History</h2>
      
      <div className="space-y-3">
        {deployments.map((dep, idx) => {
          const isSuccess = !dep.title?.includes('failed');
          const timestamp = new Date(dep.created_date);

          return (
            <div
              key={idx}
              className="p-4 border border-border/60 rounded-lg hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  {isSuccess ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-foreground truncate">
                      {dep.title || 'Deployment'}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      isSuccess
                        ? 'bg-green-500/10 text-green-600'
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {isSuccess ? 'Success' : 'Failed'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDistanceToNow(timestamp, { addSuffix: true })}
                  </div>

                  {dep.branch && (
                    <p className="text-sm text-muted-foreground/70 font-mono">
                      Branch: {dep.branch}
                    </p>
                  )}
                </div>

                <div className="text-right text-xs text-muted-foreground/60">
                  {timestamp.toLocaleDateString()}<br />
                  {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}