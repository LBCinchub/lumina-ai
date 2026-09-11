import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, MessageSquare, Zap, Clock, Activity } from 'lucide-react';
import { format, subDays, startOfDay, getDay } from 'date-fns';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { WEEKDAYS } from './agentTemplates';

// Dashboard tab for one agent's detail view — activity, active tasks, and
// recent engagement over time, charted from this user's own RLS-scoped data.

const TOOLTIP_STYLE = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
  padding: '8px 10px',
};
const AXIS_STYLE = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

export default function AgentDashboardTab({ agent }) {
  const [messages, setMessages] = useState(null);
  const [tasks, setTasks] = useState(null);

  useEffect(() => {
    let alive = true;
    base44.entities.UserAgentMessage.filter({ agent_id: agent.id }, '-created_date', 300)
      .then(data => { if (alive) setMessages(data || []); })
      .catch(() => { if (alive) setMessages([]); });
    base44.entities.UserAgentTask.filter({ agent_id: agent.id }, '-created_date', 50)
      .then(data => { if (alive) setTasks(data || []); })
      .catch(() => { if (alive) setTasks([]); });
    return () => { alive = false; };
  }, [agent.id]);

  const loading = messages === null || tasks === null;
  const enabledTasks = useMemo(() => (tasks || []).filter(t => t.enabled), [tasks]);
  const hasData = (messages || []).length > 0 || enabledTasks.length > 0;

  // Messages Per Day — last 14 days, split You / Agent.
  const daySeries = useMemo(() => {
    if (!messages) return [];
    const days = [];
    for (let i = 13; i >= 0; i--) {
      days.push({ key: startOfDay(subDays(new Date(), i)).getTime(), You: 0, Agent: 0 });
    }
    const index = new Map(days.map(d => [d.key, d]));
    for (const m of messages) {
      const at = m.created_date ? new Date(m.created_date) : null;
      if (!at || Number.isNaN(at.getTime())) continue;
      const bucket = index.get(startOfDay(at).getTime());
      if (!bucket) continue;
      if (m.role === 'user') bucket.You += 1;
      else if (m.role === 'assistant') bucket.Agent += 1;
    }
    return days.map(d => ({ ...d, label: format(new Date(d.key), 'MMM d') }));
  }, [messages]);

  // Engagement By Weekday — all of this agent's messages.
  const weekdaySeries = useMemo(() => {
    if (!messages) return [];
    const counts = [0, 0, 0, 0, 0, 0, 0]; // Sunday..Saturday
    for (const m of messages) {
      const at = m.created_date ? new Date(m.created_date) : null;
      if (!at || Number.isNaN(at.getTime())) continue;
      counts[getDay(at)] += 1;
    }
    // Monday-first display order.
    const order = [1, 2, 3, 4, 5, 6, 0];
    const names = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
    return order.map(d => ({ label: names[d], Messages: counts[d] }));
  }, [messages]);

  // Autopilot Schedule — enabled task runs per weekday (Monday-first).
  const taskSeries = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const t of enabledTasks) {
      if (t.schedule_type === 'daily') {
        counts[1] += 1; counts[2] += 1; counts[3] += 1;
        counts[4] += 1; counts[5] += 1; counts[6] += 1; counts[0] += 1;
      } else if (t.schedule_type === 'weekly') {
        const wd = Number(t.schedule_weekday);
        if (wd >= 0 && wd <= 6) counts[wd] += 1;
      }
    }
    const order = [1, 2, 3, 4, 5, 6, 0];
    const names = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
    return order.map(d => ({ label: names[d], Tasks: counts[d] }));
  }, [enabledTasks]);

  const lastMessage = (messages && messages.length > 0) ? messages[0] : null;
  const lastActive = lastMessage?.created_date
    ? format(new Date(lastMessage.created_date), 'MMM d, h:mm a')
    : '—';

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/50" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-minimal">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-5 animate-fade-up">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/40 bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span className="text-[11px] uppercase tracking-wider">Total Messages</span>
            </div>
            <div className="text-2xl font-medium">{(messages || []).length}</div>
          </div>
          <div className="rounded-xl border border-border/40 bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Zap className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span className="text-[11px] uppercase tracking-wider">Active Tasks</span>
            </div>
            <div className="text-2xl font-medium">{enabledTasks.length}</div>
          </div>
          <div className="rounded-xl border border-border/40 bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span className="text-[11px] uppercase tracking-wider">Last Active</span>
            </div>
            <div className="text-2xl font-medium">{lastActive}</div>
          </div>
        </div>

        {!hasData ? (
          <div className="rounded-xl border border-dashed border-border/40 p-10 text-center">
            <Activity className="w-6 h-6 mx-auto text-muted-foreground/50 mb-3" strokeWidth={1.5} />
            <h3 className="text-sm font-medium mb-1">No Activity Yet</h3>
            <p className="text-[12px] text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Chat with {agent.name} or schedule an Autopilot task — charts appear here as your agent works.
            </p>
          </div>
        ) : (
          <>
            {/* Activity — messages per day */}
            {(messages || []).length > 0 && (
              <div className="rounded-xl border border-border/40 bg-card p-4 md:p-5">
                <h3 className="text-sm font-medium mb-1">Activity — Messages Per Day</h3>
                <p className="text-[11.5px] text-muted-foreground mb-4">The Last 14 Days, Split By Speaker.</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={daySeries} margin={{ top: 4, right: 8, bottom: 0, left: -22 }}>
                      <defs>
                        <linearGradient id="youFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="agentFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="label" tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
                      <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: 'hsl(var(--foreground))' }} cursor={{ stroke: 'hsl(var(--border))' }} />
                      <Area type="monotone" dataKey="You" stroke="hsl(var(--chart-1))" fill="url(#youFill)" strokeWidth={2} />
                      <Area type="monotone" dataKey="Agent" stroke="hsl(var(--chart-2))" fill="url(#agentFill)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: 'hsl(var(--chart-1))' }} />
                    You
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: 'hsl(var(--chart-2))' }} />
                    {agent.name}
                  </span>
                </div>
              </div>
            )}

            {/* Engagement — messages by weekday */}
            {(messages || []).length > 0 && (
              <div className="rounded-xl border border-border/40 bg-card p-4 md:p-5">
                <h3 className="text-sm font-medium mb-1">Engagement — Messages By Weekday</h3>
                <p className="text-[11.5px] text-muted-foreground mb-4">When This Agent Is Used Most.</p>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekdaySeries} margin={{ top: 4, right: 8, bottom: 0, left: -22 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="label" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                      <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: 'hsl(var(--foreground))' }} cursor={{ fill: 'hsl(var(--muted))' }} />
                      <Bar dataKey="Messages" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Active tasks — scheduled runs by weekday */}
            {enabledTasks.length > 0 && (
              <div className="rounded-xl border border-border/40 bg-card p-4 md:p-5">
                <h3 className="text-sm font-medium mb-1">Active Tasks — Scheduled Runs By Weekday</h3>
                <p className="text-[11.5px] text-muted-foreground mb-4">
                  {enabledTasks.length} Enabled Task{enabledTasks.length === 1 ? '' : 's'} — Daily Tasks Run Every Day, Weekly Tasks On Their Day.
                </p>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={taskSeries} margin={{ top: 4, right: 8, bottom: 0, left: -22 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="label" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                      <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: 'hsl(var(--foreground))' }} cursor={{ fill: 'hsl(var(--muted))' }} />
                      <Bar dataKey="Tasks" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}