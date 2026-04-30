import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { MessageSquare, User, Sparkles, Code2, Menu, X, Sun, Moon, LayoutDashboard, BookOpen, LogIn, Briefcase, Github, Server, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { useLBCHandshake } from '@/hooks/useLBCHandshake';
import LuminaMark from './LuminaMark';

const navItems = [
  { to: '/', label: 'Converse', icon: MessageSquare, end: true },
  { to: '/build', label: 'Build', icon: Code2 },
  { to: '/context', label: 'Context', icon: User },
  { to: '/twin', label: 'Your Twin', icon: Sparkles },
  { to: '/insights', label: 'Insights', icon: Sparkles },
  { to: '/resources', label: 'Resources', icon: BookOpen },
  { to: '/github', label: 'GitHub', icon: Github },
  { to: '/knowledge', label: 'Knowledge', icon: Database },
  { to: '/vps', label: 'VPS', icon: Server },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/lbc-command-center', label: 'LBC Hub', icon: LayoutDashboard },
  { to: '/lbc-deployment', label: 'Deployment', icon: Code2 },
];

export default function AppShell() {
  useLBCHandshake();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const { theme, toggle } = useTheme();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleLogin = async () => {
    await base44.auth.redirectToLogin();
  };

  const handleLogout = async () => {
    try {
      await base44.auth.logout('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 border-r border-border bg-sidebar flex-col">
        <div className="px-6 py-6 flex items-center gap-2.5">
          <LuminaMark size={24} className="text-foreground" />
          <span className="font-serif text-xl tracking-tight">Luna</span>
        </div>

        <nav className="px-3 flex-1 flex flex-col gap-0.5">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                isActive && "bg-sidebar-accent text-sidebar-foreground font-medium"
              )}
            >
              <item.icon className="w-4 h-4" strokeWidth={1.5} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-2">
          {/* LBC.Network branding */}
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/50 mb-3">
            by <span className="font-medium text-muted-foreground/70">LBC.Network</span>
          </div>

          <div className="flex items-center justify-between -mx-1">
            {/* Dark mode toggle */}
            <button
              onClick={toggle}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            >
              {theme === 'dark'
                ? <Sun className="w-3.5 h-3.5" strokeWidth={1.5} />
                : <Moon className="w-3.5 h-3.5" strokeWidth={1.5} />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
          </div>

          <div className="text-xs text-muted-foreground truncate pt-1">
            {user?.email || '—'}
          </div>
          {user ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-xs text-muted-foreground hover:text-foreground -ml-2"
            >
              Sign out
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogin}
              className="w-full justify-start text-xs text-muted-foreground hover:text-foreground -ml-2"
            >
              <Briefcase className="w-3 h-3 mr-2" />
              Sign in
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <a href="/" className="flex items-center gap-2">
            <LuminaMark size={20} className="text-foreground" />
          <span className="font-serif text-lg tracking-tight">Luna</span>
          </a>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 -mr-2 text-foreground"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-border bg-background animate-fade-up">
            <nav className="p-3 flex flex-col gap-1">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm",
                    "text-foreground/70",
                    isActive && "bg-accent text-foreground font-medium"
                  )}
                >
                  <item.icon className="w-4 h-4" strokeWidth={1.5} />
                  {item.label}
                </NavLink>
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-muted-foreground mt-2 border-t border-border pt-4"
              >
                Sign out
              </button>
            </nav>
          </div>
        )}
      </div>

      <main className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}