import React from 'react';
import AgentWorkspace from '@/components/agents/AgentWorkspace';

// Top-level My Agents workspace — the first item in the sidebar nav.
export default function Agents() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <AgentWorkspace />
    </div>
  );
}