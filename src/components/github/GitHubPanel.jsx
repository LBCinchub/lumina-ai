import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Github, GitBranch, CheckCircle2, AlertCircle, Loader2, Code, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

const CONNECTOR_ID = '69e99f17b40a584c51165b61';
const DEFAULT_REPO = 'LBCinchub/lumina-ai';

export default function GitHubPanel() {
  const [user, setUser] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pushing, setPushing] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', message }

  // Code editor state
  const [filePath, setFilePath] = useState('lumina/self-update.md');
  const [fileContent, setFileContent] = useState('');
  const [commitMsg, setCommitMsg] = useState('');

  const fetchFile = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('githubGetFile', {
        repo: DEFAULT_REPO,
        path: filePath,
      });
      setFileContent(res.data?.content || '');
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, [filePath]);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        const me = await base44.auth.me();
        setUser(me);
        await fetchFile();
      }
      setLoading(false);
    });
  }, [fetchFile]);

  const handleConnect = async () => {
    const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
    const popup = window.open(url, '_blank');
    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer);
        fetchFile();
      }
    }, 500);
  };

  const handleDisconnect = async () => {
    await base44.connectors.disconnectAppUser(CONNECTOR_ID);
    setConnected(false);
    setFileContent('');
  };

  const handlePush = async () => {
    if (!fileContent || !commitMsg) {
      setStatus({ type: 'error', message: 'Please add content and a commit message.' });
      return;
    }
    setPushing(true);
    setStatus(null);
    try {
      const res = await base44.functions.invoke('githubPushCode', {
        repo: DEFAULT_REPO,
        path: filePath,
        content: fileContent,
        message: commitMsg,
      });
      if (res.data?.success) {
        setStatus({ type: 'success', message: `Pushed! Commit: ${res.data.commit?.slice(0, 7)}` });
        setCommitMsg('');
      } else {
        setStatus({ type: 'error', message: res.data?.error || 'Push failed.' });
      }
    } catch (e) {
      setStatus({ type: 'error', message: e.message });
    } finally {
      setPushing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground mb-3">Sign in to use GitHub integration.</p>
        <Button onClick={() => base44.auth.redirectToLogin()}>Sign in</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Github className="w-5 h-5" />
          <span className="font-medium text-sm">{DEFAULT_REPO}</span>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full",
            connected ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
          )}>
            {connected ? 'Connected' : 'Not connected'}
          </span>
        </div>
        {connected ? (
          <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-xs text-muted-foreground">
            Disconnect
          </Button>
        ) : (
          <Button size="sm" onClick={handleConnect} className="gap-2">
            <Github className="w-4 h-4" /> Connect GitHub
          </Button>
        )}
      </div>

      {connected && (
        <>
          {/* File path */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">File path</label>
            <div className="flex gap-2">
              <input
                value={filePath}
                onChange={e => setFilePath(e.target.value)}
                className="flex-1 text-sm bg-muted/50 border border-border rounded-md px-3 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <Button variant="outline" size="sm" onClick={fetchFile}>
                <Code className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Content editor */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Content</label>
            <textarea
              value={fileContent}
              onChange={e => setFileContent(e.target.value)}
              rows={12}
              className="w-full text-sm bg-muted/50 border border-border rounded-md px-3 py-2 font-mono focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              placeholder="File content..."
            />
          </div>

          {/* Commit message */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <GitBranch className="w-3 h-3" /> Commit message
            </label>
            <input
              value={commitMsg}
              onChange={e => setCommitMsg(e.target.value)}
              className="w-full text-sm bg-muted/50 border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="feat: Lumina self-update"
            />
          </div>

          {/* Status */}
          {status && (
            <div className={cn(
              "flex items-center gap-2 text-sm px-3 py-2 rounded-md",
              status.type === 'success' ? "bg-green-500/10 text-green-700" : "bg-destructive/10 text-destructive"
            )}>
              {status.type === 'success'
                ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                : <AlertCircle className="w-4 h-4 shrink-0" />}
              {status.message}
            </div>
          )}

          {/* Push button */}
          <Button onClick={handlePush} disabled={pushing} className="w-full gap-2">
            {pushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {pushing ? 'Pushing…' : 'Push to GitHub'}
          </Button>
        </>
      )}

      {!connected && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Connect your GitHub account to let Lumina read and write code to <strong>{DEFAULT_REPO}</strong>.
        </div>
      )}
    </div>
  );
}