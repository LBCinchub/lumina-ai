import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2 } from 'lucide-react';

export default function ProjectTasks({ projectId, refreshKey }) {
  const [tasks, setTasks] = useState(null);

  const load = () => base44.entities.ProjectTask.filter({ project_id: projectId }, '-created_date', 100).then(setTasks);
  useEffect(() => { setTasks(null); load(); }, [projectId]);
  useEffect(() => { if (refreshKey) load(); }, [refreshKey]);

  const toggle = async (t) => {
    const status = t.status === 'done' ? 'todo' : 'done';
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, status } : x));
    await base44.entities.ProjectTask.update(t.id, { status });
  };
  const remove = async (id) => {
    setTasks(prev => prev.filter(x => x.id !== id));
    await base44.entities.ProjectTask.delete(id);
  };

  return (
    <div className="border-t border-border/40 px-3 py-3 max-h-[45%] overflow-y-auto scrollbar-minimal">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-medium mb-2">Tasks</p>
      {tasks === null ? <p className="text-[11px] text-muted-foreground/60">Loading…</p>
        : tasks.length === 0 ? <p className="text-[11px] text-muted-foreground/50">No tasks yet. Ask chat to "turn this into tasks for" this project.</p>
        : tasks.map(t => (
          <div key={t.id} className="flex items-start gap-2 py-1.5 group">
            <Checkbox checked={t.status === 'done'} onCheckedChange={() => toggle(t)} className="mt-0.5" />
            <div className="flex-1 min-w-0" title={t.details}>
              <p className={`text-[12px] ${t.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>{t.title}</p>
            </div>
            <button onClick={() => remove(t.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
    </div>
  );
}