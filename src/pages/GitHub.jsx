import React, { useState } from 'react';
import GitHubPanel from '@/components/github/GitHubPanel';
import PullRequestList from '@/components/github/PullRequestList';
import { Github } from 'lucide-react';

export default function GitHub() {
  const [connected, setConnected] = useState(false);

  return (
    <div className="max-w-2xl mx-auto px-5 py-10 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Github className="w-6 h-6" />
          <h1 className="font-serif text-2xl font-medium">Lumina × GitHub</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Connect your GitHub account to read files, push commits, and view open pull requests across your repositories.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <GitHubPanel onConnectionChange={setConnected} />
      </div>

      {connected && (
        <div className="bg-card border border-border rounded-xl p-6">
          <PullRequestList connected={connected} />
        </div>
      )}
    </div>
  );
}