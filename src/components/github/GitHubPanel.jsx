import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Github, GitBranch, CheckCircle2, AlertCircle, Loader2, Code, Upload, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const CONNECTOR_ID = '69e99f17b40a584c51165b61';
const DEFAULT_REPO = 'LBCinchub/lumina-ai';

export default function GitHubPanel() {
  const [user, setUser] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [status, setStatus] = useState(null);

  const [repo, setRepo] = useState(DEFAULT_REPO);
  const [filePath, setFilePath] = useState('README.md');
  const [fileContent, setFileContent] = useState('');
  const [commitMsg, setCommitMsg] = useState('');

  const checkConnection = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('githubGetFile', {
        repo,
        path: filePath,
      });
      if (res.data?.content !== undefined) {
        setFileContent(res.data.content);
        setConnected(true);
      } else {
        setConnected(false);
      }
    } catch {
      setConnected(false);
    }
  }, [repo, filePath]);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        const me = await base44.auth.me();
        setUser(me);
        // Check if we just came back from OAuth (URL has code param)
        const params = new URLSearchParams(window.location.search);
        if (params.get('code') || params.get('connected')) {
          // Clean up URL
          window.history.replaceState({}, '', window.location.pathname);
        }
        await checkConnection();
      }
      setLoading(false);
    });
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    setStatus(null);
    try {
      const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
      // Open in same tab to avoid popup blockers
      window.location.href = url;
    } catch (e) {
      setStatus({ type: 'error', message: e.message });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await base44.connectors.disconnectAppUser(CONNECTOR_ID);
    setConnected(false);
    setFileContent('');
    setStatus(null);
  };

  const handleFetchFile = async () => {
    setFetching(true);
    setStatus(null);
    try {
      const res = await base44.functions.invoke('githubGetFile', { repo, path: filePath });
      if (res.data?.content !== undefined) {
        setFileContent(res.data.content);
        setConnected(true);
      } else {
        setStatus({ type: 'error', message: res.data?.error || 'File not found.' });
      }
    } catch (e) {
      setStatus({ type: 'error', message: e.message });
    } finally {
      setFetching(false);
    }
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
        repo,
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
      <div className="flex items-center justify-center py-16">
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
          <span className="font-medium text-sm">GitHub</span>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium",
            connected ? "bg-green-500/15 text-green-600" : "bg-muted text-muted-foreground"
          )}>
            {connected ? '● Connected' : '○ Not connected'}
          </span>
        </div>
        {connected ? (
          <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-xs text-muted-foreground">
            Disconnect
          </Button>
        ) : (
          <Button size="sm" onClick={handleConnect} disabled={connecting} className="gap-2">
            {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
            {connecting ? 'Connecting…' : 'Connect GitHub'}
          </Button>
        )}
      </div>

      {!connected && !connecting && (
        <div className="rounded-xl border border-border bg-muted/30 p-6 text-center space-y-3">
          <Github className="w-8 h-8 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Connect your GitHub account to read and push code to any repository.
          </p>
          <Button onClick={handleConnect} disabled={connecting} className="gap-2">
            {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
            Sign in with GitHub
          </Button>
        </div>
      )}

      {connected && (
        <>
          {/* Repo */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Repository</label>
            <input
              value={repo}
              onChange={e => setRepo(e.target.value)}
              className="w-full text-sm bg-muted/50 border border-border rounded-md px-3 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="owner/repo"
            />
          </div>

          {/* File path */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">File path</label>
            <div className="flex gap-2">
              <input
                value={filePath}
                onChange={e => setFilePath(e.target.value)}
                className="flex-1 text-sm bg-muted/50 border border-border rounded-md px-3 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="path/to/file.md"
              />
              <Button variant="outline" size="sm" onClick={handleFetchFile} disabled={fetching} className="gap-1.5">
                {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Fetch
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
              placeholder="File content…"
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
              placeholder="feat: update via Lumina"
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
    </div>
  );
}