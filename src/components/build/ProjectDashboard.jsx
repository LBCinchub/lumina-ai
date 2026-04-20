import React from 'react';
import { Card } from '@/components/ui/card';
import { Code2, Eye } from 'lucide-react';

export default function ProjectDashboard({ project }) {
  if (!project) return null;

  return (
    <Card className="p-4 bg-card/95 backdrop-blur-sm border-border shadow-lg">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          <div className="text-xs font-medium text-foreground/80 truncate">
            {project.title || 'Project'}
          </div>
        </div>
        
        <div className="text-[13px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Live preview ready</span>
          </div>
        </div>

        {project.last_built_at && (
          <div className="text-[11px] text-muted-foreground/60">
            Updated {new Date(project.last_built_at).toLocaleDateString()}
          </div>
        )}
      </div>
    </Card>
  );
}