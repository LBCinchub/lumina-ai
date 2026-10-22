import React from 'react';
import { Sun, Moon, LogIn, LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/hooks/useTheme';
import NotificationCenter from '@/components/notifications/NotificationCenter';

const btn = 'flex items-center gap-2 w-full px-3 min-h-[40px] rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function AccountFooter({ user, showNotifications = true }) {
  const { theme, toggle } = useTheme();
  return (
    <div className="p-3 border-t border-sidebar-border space-y-1">
      {showNotifications && <NotificationCenter />}
      <button onClick={toggle} className={btn}>
        {theme === 'dark' ? <Sun className="w-3.5 h-3.5" aria-hidden="true" /> : <Moon className="w-3.5 h-3.5" aria-hidden="true" />}
        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
      </button>
      {/* Email shown exactly as stored — never case-transformed. */}
      <div className="px-3 pt-1 text-xs text-muted-foreground truncate" title={user?.email || ''}>{user?.email || '—'}</div>
      {user ? (
        <button onClick={() => base44.auth.logout('/').catch(() => {})} className={btn}>
          <LogOut className="w-3.5 h-3.5" aria-hidden="true" /> Sign Out
        </button>
      ) : (
        <button onClick={() => base44.auth.redirectToLogin()} className={btn}>
          <LogIn className="w-3.5 h-3.5" aria-hidden="true" /> Sign In
        </button>
      )}
    </div>
  );
}