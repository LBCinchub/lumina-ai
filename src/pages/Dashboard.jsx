import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Copy, Check, Users, Share2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LuminaMark from '@/components/layout/LuminaMark';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [copied, setCopied] = useState(false);
  const [visibility, setVisibility] = useState('private');

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const copyInviteLink = () => {
    const link = `${window.location.origin}?invited_by=${user?.email}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inviteUser = async () => {
    const email = prompt('Enter user email:');
    if (!email) return;
    try {
      await base44.users.inviteUser(email, 'user');
      alert(`Invitation sent to ${email}`);
    } catch (err) {
      alert('Failed to send invitation');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-12 md:py-20">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-accent flex items-center justify-center">
                <LuminaMark size={32} className="text-foreground" />
              </div>
              <div>
                <h1 className="font-serif text-3xl tracking-tight mb-1">Lumina AI</h1>
                <p className="text-sm text-muted-foreground">Your personal AI companion</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-1">Status</div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Active
              </div>
            </div>
          </div>
          <p className="text-[15px] text-muted-foreground max-w-2xl">
            A deeply personal AI tool that synthesizes your professional vision and life context to act as a digital mirror for high-level decision making.
          </p>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* App Visibility */}
          <div className="rounded-2xl border border-border p-8 bg-card/40">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-serif text-xl tracking-tight">App Visibility</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground block mb-2">Access level</label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-foreground/30"
                >
                  <option value="private">Private — Only you</option>
                  <option value="link">Anyone with link</option>
                  <option value="public">Public</option>
                </select>
              </div>
              {visibility === 'private' && (
                <p className="text-xs text-muted-foreground">Only authenticated users can access this app.</p>
              )}
              {visibility === 'link' && (
                <p className="text-xs text-muted-foreground">Anyone with the share link can access this app.</p>
              )}
            </div>
          </div>

          {/* Invite Users */}
          <div className="rounded-2xl border border-border p-8 bg-card/40">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-serif text-xl tracking-tight">Invite Users</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Share access with your team or collaborators.</p>
            <div className="space-y-3">
              <Button onClick={inviteUser} className="w-full rounded-lg">
                Send Invite
              </Button>
              <Button onClick={copyInviteLink} variant="outline" className="w-full rounded-lg flex items-center gap-2">
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Invite Link
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Account Info */}
          <div className="rounded-2xl border border-border p-8 bg-card/40">
            <h2 className="font-serif text-xl tracking-tight mb-6">Account</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.12em] text-muted-foreground block mb-1">Email</label>
                <p className="text-sm text-foreground">{user?.email}</p>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.12em] text-muted-foreground block mb-1">Role</label>
                <p className="text-sm text-foreground capitalize">{user?.role || 'user'}</p>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.12em] text-muted-foreground block mb-1">Joined</label>
                <p className="text-sm text-foreground">
                  {user ? new Date(user.created_date).toLocaleDateString() : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Usage Stats */}
          <div className="rounded-2xl border border-border p-8 bg-card/40">
            <h2 className="font-serif text-xl tracking-tight mb-6">Quick Stats</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active conversations</span>
                <span className="text-lg font-medium">—</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Requests used</span>
                <span className="text-lg font-medium">—</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Subscription</span>
                <span className="text-lg font-medium">Free</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}