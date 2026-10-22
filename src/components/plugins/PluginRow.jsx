import React from 'react';
import { Badge } from '@/components/ui/badge';
import { STATE_LABEL } from '@/components/plugins/pluginLabels';

export default function PluginRow({ plugin, onOpen }) {
  return (
    <button
      onClick={() => onOpen(plugin)}
      className="w-full text-left rounded-lg border border-border p-3 min-h-[44px] hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`${plugin.title}, ${STATE_LABEL[plugin.state]}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{plugin.title}</span>
        <Badge variant="outline" className="shrink-0 text-[11px]">{STATE_LABEL[plugin.state]}</Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{plugin.reason || plugin.description}</p>
    </button>
  );
}