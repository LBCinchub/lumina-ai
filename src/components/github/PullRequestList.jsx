import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { GitPullRequest, ExternalLink, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

function PRCard({ pr }) {
  return (
    <a
      href={pr.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 px-4 py-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors group"
    >
      <img
        src={pr.user_avatar}
        alt={pr.user}
        className="w-7 h-7 rounded-full shrink-0 mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
            {pr.draft && (
              <span className="mr-1.5 text-[10px] uppercase tracking-wider bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">
                Draft
              </span>
            )}
            {pr.title}
          </p>
          <ExternalLink className="w-3.5 h-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-[11px] text-muted-foreground font-mono">
            {pr.repo} <span className="text-muted-foreground/60">#{pr.number}</span>
          </span>
          <span className="text-[11px] text-muted-foreground">
            by <span className="font-medium">{pr.user}</span>
          </span>
          <span className="text-[11px] text-muted-foreground">
            · {formatDistanceToNow(new Date(pr.updated_at), { addSuffix: true })}
          </span>
        </div>
        {pr.labels.length > 0 && (
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {pr.labels.map(label => (
              <span
                key={label.name}
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: `#${label.color}22`,
                  color: `#${label.color}`,
                  border: `1px solid #${label.color}44`,
                }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}

export default function PullRequestList({ connected }) {
  const [prs, setPRs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fetched, setFetched] = useState(false);

  const fetchPRs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('githubListPRs', {});
      if (res.data?.error) throw new Error(res.data.error);
      setPRs(res.data?.prs || []);
      setFetched(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (connected) fetchPRs();
  }, [connected]);

  if (!connected) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitPullRequest className="w-4 h-4 text-foreground/60" />
          <span className="text-sm font-medium">Open Pull Requests</span>
          {fetched && !loading && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {prs.length}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={fetchPRs} disabled={loading} className="h-7 gap-1.5 text-xs">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          Scanning repositories…
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {!loading && fetched && prs.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No open pull requests found 🎉</p>
      )}

      {!loading && prs.length > 0 && (
        <div className="space-y-2">
          {prs.map(pr => <PRCard key={pr.id} pr={pr} />)}
        </div>
      )}
    </div>
  );
}