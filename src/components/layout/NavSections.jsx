import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { NAV_GROUPS, UTILITY_NAV, ADMIN_NAV } from './navConfig';

function Item({ item, onNavigate }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) => cn(
        'relative flex items-center gap-3 px-3 min-h-[40px] rounded-lg text-sm transition-colors',
        'text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/70',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-primary'
      )}
    >
      {({ isActive }) => (
        <>
          <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.6} aria-hidden="true" />
          <span className="truncate">{item.label}</span>
          {isActive && <span className="sr-only">(Current)</span>}
        </>
      )}
    </NavLink>
  );
}

function Group({ label, items, onNavigate }) {
  return (
    <div className="space-y-0.5">
      <div className="px-3 pb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground">{label}</div>
      {items.map(i => <Item key={i.to} item={i} onNavigate={onNavigate} />)}
    </div>
  );
}

export default function NavSections({ isAdmin, onNavigate }) {
  const utility = isAdmin ? [...UTILITY_NAV, ADMIN_NAV] : UTILITY_NAV;
  return (
    <nav aria-label="Main" className="flex-1 flex flex-col gap-6 px-3 overflow-y-auto scrollbar-minimal">
      {NAV_GROUPS.map(g => <Group key={g.label} label={g.label} items={g.items} onNavigate={onNavigate} />)}
      <div className="mt-auto pt-2">
        <Group label="Account" items={utility} onNavigate={onNavigate} />
      </div>
    </nav>
  );
}