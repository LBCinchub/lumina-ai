// "@Agent Name do X" → assign X to that owned agent. Pure matcher: callers
// pass only agents already loaded through the user's own RLS scope.
export function matchAgentMention(message: string, agents: any[]) {
  if (typeof message !== 'string' || !message.includes('@')) return null;
  const sorted = (agents || [])
    .filter((a: any) => a?.id && a?.name && a.status !== 'archived')
    .sort((a: any, b: any) => b.name.length - a.name.length);
  const lower = message.toLowerCase();
  for (const agent of sorted) {
    const tag = '@' + String(agent.name).toLowerCase();
    let i = lower.indexOf(tag);
    while (i !== -1) {
      const before = i === 0 ? ' ' : lower[i - 1];
      const after = lower[i + tag.length] ?? ' ';
      if (!/[\w@]/.test(before) && !/\w/.test(after)) {
        const goal = (message.slice(0, i) + message.slice(i + tag.length))
          .replace(/^[\s,:;-]+/, '').replace(/\s{2,}/g, ' ').trim();
        return { agent, goal };
      }
      i = lower.indexOf(tag, i + 1);
    }
  }
  return null;
}