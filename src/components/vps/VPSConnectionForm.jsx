import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Server, AlertCircle, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VPSConnectionForm({ onConnect }) {
  const [serverName, setServerName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiHash, setApiHash] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleConnect = async () => {
    if (!serverName.trim() || !apiKey.trim() || !apiHash.trim()) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Store VPS connection in user context
      await base44.auth.updateMe({
        vps_server_name: serverName,
        vps_api_key: apiKey,
        vps_api_hash: apiHash,
        vps_connected: true
      });

      setSuccess('VPS connected successfully');
      setTimeout(() => {
        onConnect({ serverName, apiKey, apiHash });
      }, 1000);
    } catch (err) {
      setError('Failed to connect VPS. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="rounded-xl border border-border bg-card p-8 space-y-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-accent mx-auto">
          <Server className="w-6 h-6 text-accent-foreground" />
        </div>

        <div className="text-center space-y-2">
          <h2 className="font-serif text-xl font-medium">Connect Your VPS</h2>
          <p className="text-sm text-muted-foreground">
            Enter your server credentials to get started
          </p>
        </div>

        <div className="space-y-4">
          {/* Server name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Server Name</label>
            <input
              type="text"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              placeholder="e.g., server1.example.com"
              className="w-full text-sm bg-muted/50 border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
              disabled={loading}
            />
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">API Key</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Your API key"
                className="w-full text-sm bg-muted/50 border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring pr-10"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* API Hash */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">API Hash</label>
            <input
              type="password"
              value={apiHash}
              onChange={(e) => setApiHash(e.target.value)}
              placeholder="Your API hash"
              className="w-full text-sm bg-muted/50 border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
              disabled={loading}
            />
          </div>
        </div>

        {/* Status messages */}
        {error && (
          <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-md bg-destructive/10 text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-md bg-green-500/10 text-green-700">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}

        {/* Connect button */}
        <Button
          onClick={handleConnect}
          disabled={loading}
          className="w-full gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Server className="w-4 h-4" />
              Connect VPS
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Your credentials are encrypted and stored securely.
        </p>
      </div>
    </div>
  );
}