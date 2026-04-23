import React from 'react';
import GitHubPanel from '@/components/github/GitHubPanel';
import { Github } from 'lucide-react';

export default function GitHub() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Github className="w-6 h-6" />
          <h1 className="font-serif text-2xl font-medium">Lumina × GitHub</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Let Lumina read and write code directly to <strong>LBCinchub/lumina-ai</strong>. Connect your GitHub account, edit files, and push commits — all from here.
        </p>
      </div>
      <div className="bg-card border border-border rounded-xl p-6">
        <GitHubPanel />
      </div>
    </div>
  );
}