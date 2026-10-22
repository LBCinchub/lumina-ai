import { Bot, MessageSquare, Code2, Database, FolderKanban, Terminal as TerminalIcon, Settings, SlidersHorizontal, Zap, LayoutDashboard, LayoutTemplate } from 'lucide-react';

// Presentation-only grouping of the existing routes. No routes are added or
// removed here. Operations is appended by the shell only for role === 'admin';
// the route itself stays wrapped in AdminGate and server-side checks.
export const NAV_GROUPS = [
  {
    label: 'Workspace',
    items: [
      { to: '/', label: 'Chat', icon: MessageSquare, end: true },
      { to: '/agents', label: 'My Agents', icon: Bot, end: true },
      { to: '/build', label: 'Build', icon: Code2 },
      { to: '/knowledge', label: 'Knowledge', icon: Database },
      { to: '/projects', label: 'Projects', icon: FolderKanban },
      { to: '/autopilot', label: 'Autopilot', icon: Zap, end: true },
      { to: '/autopilot/dashboard', label: 'Autopilot Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/terminal', label: 'Terminal', icon: TerminalIcon },
      { to: '/templates', label: 'Templates', icon: LayoutTemplate },
    ],
  },
];

export const UTILITY_NAV = [{ to: '/settings', label: 'Settings', icon: SlidersHorizontal }];
export const ADMIN_NAV = { to: '/operations', label: 'Owner Operations', icon: Settings };

// Mobile bottom bar: four prominent workspaces; everything else is in the drawer.
export const MOBILE_BAR = [
  NAV_GROUPS[0].items[0], NAV_GROUPS[0].items[1], NAV_GROUPS[0].items[2], NAV_GROUPS[0].items[5],
];