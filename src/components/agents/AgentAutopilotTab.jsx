import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Trash2, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { Switch } from '@/components/ui/switch';
import { AGENT_TASK_ACTIVE_LIMIT, WEEKDAYS } from './agentTemplates';

const scheduleSummary = (task) => {
  const time = task.schedule_time || '08:00';
  if (task.schedule_type === 'weekly') {
    const day = WEEKDAYS.find(d => d.value === Number(task.schedule_weekday));
    return `${day ? day.label : 'Weekly'} At ${time} UTC`;
  }
  return `Daily At ${time} UTC`;
};

// Autopilot tab for one agent's detail view: recurring tasks that run the
// agent server-side on a schedule. All AI runs server-side only — this UI
// never calls the LLM directly.
export default function AgentAutopilotTab({ agent }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [scheduleType, setScheduleType] = useState('daily');
  const [weekday, setWeekday] = useState(1);
  const [time, setTime] = useState('08:00');
  const [instruction, setInstruction] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.UserAgentTask.filter(
        { agent_id: agent.id }, '-created_date', 50
      );
      setTasks(data);
    } catch (_) {
      setTasks([]);
    }
    setLoading(false);
  }, [agent.id]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const activeCount = tasks.filter(t => t.enabled).length;

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('createUserAgentTask', {
        agent_id: agent.id,
        name,
        schedule_type: scheduleType,
        ...(scheduleType === 'weekly' ? { schedule_weekday: weekday } : {}),
        schedule_time: time || '08:00',
        instruction,
      });
      const data = res?.data || res;
      if (data?.error) {
        setError(data.error);
      } else {
        setName('');
        setInstruction('');
        await loadTasks();
      }
    } catch (_) {
      setError('Could not create the task. Please try again.');
    }
    setCreating(false);
  };

  const handleToggle = async (task, enabled) => {
    setBusyId(task.id);
    try {
      const res = await base44.functions.invoke('updateUserAgentTask', {
        task_id: task.id,
        enabled,
      });
      const data = res?.data || res;
      if (data?.error) {
        setError(data.error);
      } else {
        setTasks(prev => prev.map(t => t.id === task.id ? (data.task || { ...t, enabled }) : t));
      }
    } catch (_) {
      setError('Could not update the task. Please try again.');
    }
    setBusyId(null);
  };

  const handleDelete = async (task) => {
    setBusyId(task.id);
    try {
      await base44.entities.UserAgentTask.delete(task.id);
      setTasks(prev => prev.filter(t => t.id !== task.id));
    } catch (_) {
      setError('Could not delete the task. Please try again.');
    }
    setBusyId(null);
  };

  const canCreate = name.trim() && instruction.trim() && activeCount < AGENT_TASK_ACTIVE_LIMIT;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-minimal">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-5 animate-fade-up">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[12px] text-muted-foreground leading-relaxed max-w-md">
            Recurring tasks your agent runs on a schedule — fully server-side. Results land in the agent's chat history, and in Telegram when connected.
          </p>
          <span className="text-[11px] text-muted-foreground/70">
            {activeCount} / {AGENT_TASK_ACTIVE_LIMIT} Active Tasks
          </span>
        </div>

        {error && (
          <p className="text-[11px] text-destructive flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
          </p>
        )}

        {/* Task list */}
        {loading ? (
          <div className="h-24 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/50" strokeWidth={1.75} />
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/40 p-8 text-center">
            <Clock className="w-6 h-6 mx-auto text-muted-foreground/50 mb-3" strokeWidth={1.5} />
            <h3 className="text-sm font-medium mb-1">No Autopilot Tasks Yet</h3>
            <p className="text-[12px] text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Create one below — for example, a morning briefing of your knowledge sources.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {tasks.map(task => (
              <div
                key={task.id}
                className={cn(
                  "rounded-xl border p-4 transition-colors",
                  task.enabled ? "border-border/40 bg-card" : "border-border/30 bg-muted/20 opacity-70"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{task.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {scheduleSummary(task)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {busyId === task.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground/60" />}
                    <Switch
                      checked={!!task.enabled}
                      disabled={busyId === task.id}
                      onCheckedChange={(v) => handleToggle(task, v)}
                    />
                    <button
                      onClick={() => handleDelete(task)}
                      disabled={busyId === task.id}
                      className="p-1.5 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Delete Task"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
                {task.instruction && (
                  <p className="text-[12px] text-muted-foreground/80 mt-2.5 leading-relaxed line-clamp-2">
                    {task.instruction}
                  </p>
                )}
                <div className="mt-3 pt-3 border-t border-border/30">
                  {task.last_run_at ? (
                    <>
                      <div className="text-[11px] text-muted-foreground/60">
                        Last Run: {format(new Date(task.last_run_at), 'MMM d, h:mm a')}
                      </div>
                      {task.last_result && (
                        <p className="text-[12px] text-foreground/70 mt-1.5 leading-relaxed line-clamp-2">
                          {task.last_result}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-[11px] text-muted-foreground/50">
                      Has Not Run Yet — waiting for its next scheduled time
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create form */}
        <div className="rounded-xl border border-border/40 bg-muted/10 p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-muted-foreground/70" strokeWidth={2} />
            <h3 className="text-sm font-medium">New Autopilot Task</h3>
          </div>

          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Task Name — e.g. Morning Briefing"
            maxLength={60}
            className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-primary/40 transition-colors"
          />

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-border/40 overflow-hidden">
              {['daily', 'weekly'].map(t => (
                <button
                  key={t}
                  onClick={() => setScheduleType(t)}
                  className={cn(
                    "px-3 py-1.5 text-[12px] transition-colors",
                    scheduleType === t ? "bg-primary/15 text-foreground" : "text-muted-foreground/70 hover:text-foreground"
                  )}
                >
                  {t === 'daily' ? 'Daily' : 'Weekly'}
                </button>
              ))}
            </div>
            {scheduleType === 'weekly' && (
              <select
                value={weekday}
                onChange={e => setWeekday(Number(e.target.value))}
                className="bg-muted/30 border border-border/40 rounded-lg px-2.5 py-1.5 text-[12px] outline-none focus:border-primary/40"
              >
                {WEEKDAYS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            )}
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <span>At</span>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="bg-muted/30 border border-border/40 rounded-lg px-2.5 py-1.5 text-[12px] outline-none focus:border-primary/40"
              />
              <span>UTC</span>
            </div>
          </div>

          <textarea
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            placeholder="Instruction — e.g. Give me a morning briefing of my knowledge sources"
            rows={2}
            maxLength={1000}
            className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-[12px] leading-relaxed outline-none focus:border-primary/40 transition-colors resize-none scrollbar-minimal"
          />

          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground/60">
              Daily tasks default to 08:00 UTC unless you set another time.
            </p>
            <button
              onClick={handleCreate}
              disabled={!canCreate || creating}
              className="px-3.5 py-1.5 rounded-lg text-[12px] bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-40 inline-flex items-center gap-1.5 shrink-0"
            >
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Add Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}