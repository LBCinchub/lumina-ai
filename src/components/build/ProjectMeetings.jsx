import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { CalendarPlus, Loader2, Trash2 } from 'lucide-react';
import MeetingPicker from '@/components/build/MeetingPicker';

export default function ProjectMeetings({ projectId, onTasksCreated }) {
  const [meetings, setMeetings] = useState(null);
  const [picking, setPicking] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => base44.entities.ProjectMeeting.filter({ project_id: projectId }, '-start', 50).then(setMeetings);
  useEffect(() => { setMeetings(null); setPicking(false); setMsg(''); load(); }, [projectId]);

  const attach = async (eventId, createTasks) => {
    const res = await base44.functions.invoke('projectMeetings', { action: 'attach', project_id: projectId, event_id: eventId, create_tasks: createTasks });
    const d = res.data;
    setMsg(createTasks ? (d.had_notes ? `Added ${d.tasks_created} action item${d.tasks_created === 1 ? '' : 's'}.` : 'Meeting has no notes, so no action items were created.') : 'Meeting added.');
    setPicking(false);
    load();
    if (d.tasks_created) onTasksCreated?.();
  };

  const remove = async (id) => {
    setMeetings(prev => prev.filter(m => m.id !== id));
    await base44.entities.ProjectMeeting.delete(id);
  };

  return (
    <div className="border-t border-border/40 px-3 py-3 max-h-[40%] overflow-y-auto scrollbar-minimal">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-medium">Meetings</p>
        <button onClick={() => setPicking(p => !p)} title="Import a meeting" className="text-muted-foreground hover:text-foreground">
          <CalendarPlus className="w-3.5 h-3.5" />
        </button>
      </div>
      {picking && <MeetingPicker onAttach={attach} />}
      {msg && <p className="text-[11px] text-primary mb-2">{msg}</p>}
      {meetings === null ? <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
        : meetings.length === 0 ? <p className="text-[11px] text-muted-foreground/50">No meetings yet. <Link to="/settings" className="underline">Connect Google Calendar</Link> to import.</p>
        : meetings.map(m => (
          <div key={m.id} className="py-1.5 group flex gap-2" title={m.notes || 'No notes'}>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] truncate">{m.title}</p>
              <p className="text-[10px] text-muted-foreground">{m.start ? new Date(m.start).toLocaleString() : ''}</p>
            </div>
            <button onClick={() => remove(m.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
    </div>
  );
}