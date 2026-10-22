import React, { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import DeviceVerification from '@/components/device/DeviceVerification';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import BrandLogo from '@/components/brand/BrandLogo';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { useSessionAutopilotDriver } from '@/hooks/useSessionAutopilotDriver';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import NavSections from './NavSections';
import AccountFooter from './AccountFooter';
import { MOBILE_BAR } from './navConfig';

// Owner Operations is listed only for role === 'admin'; the route stays
// behind AdminGate and founder checks stay server-side.
function Brand({ size = 28 }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <BrandLogo size={size} />
      <span className="font-serif text-lg tracking-tight">LBC AI</span>
    </Link>
  );
}

export default function AppShell({ children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState(null);
  useSessionAutopilotDriver();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <DeviceVerification />

      <aside className="hidden md:flex w-64 shrink-0 border-r border-sidebar-border bg-sidebar flex-col h-[100dvh] sticky top-0">
        <div className="px-5 h-16 flex items-center"><Brand /></div>
        <NavSections isAdmin={isAdmin} />
        <AccountFooter user={user} />
      </aside>

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 bg-background/95 border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between px-3 h-14">
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-11 h-11 -ml-1 flex items-center justify-center rounded-lg text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Open Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Brand size={24} />
          <NotificationCenter />
        </div>
      </header>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-[86vw] max-w-[320px] p-0 bg-sidebar flex flex-col">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">LBC AI Workspaces And Tools</SheetDescription>
          <div className="px-5 h-16 flex items-center"><Brand /></div>
          <NavSections isAdmin={isAdmin} onNavigate={() => setDrawerOpen(false)} />
          <AccountFooter user={user} showNotifications={false} />
        </SheetContent>
      </Sheet>

      <main className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        {children ?? <Outlet />}
      </main>

      <nav aria-label="Primary" className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 border-t border-border flex pb-[env(safe-area-inset-bottom)]">
        {MOBILE_BAR.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => cn(
              'flex-1 min-h-[56px] flex flex-col items-center justify-center gap-1 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
              isActive ? 'text-primary font-medium' : 'text-muted-foreground'
            )}
          >
            <item.icon className="w-5 h-5" strokeWidth={1.6} aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex-1 min-h-[56px] flex flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <Menu className="w-5 h-5" strokeWidth={1.6} aria-hidden="true" />
          More
        </button>
      </nav>
    </div>
  );
}