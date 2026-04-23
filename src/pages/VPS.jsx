import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import VPSPanel from '@/components/vps/VPSPanel';
import VPSConnectionForm from '@/components/vps/VPSConnectionForm';
import { Server } from 'lucide-react';

export default function VPS() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vpsData, setVpsData] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        const user = await base44.auth.me();
        if (user?.vps_connected && user?.vps_server_name) {
          setConnected(true);
          setVpsData({
            serverName: user.vps_server_name,
            apiKey: user.vps_api_key,
            apiHash: user.vps_api_hash
          });
        }
      }
      setLoading(false);
    });
  }, []);

  const handleConnect = (data) => {
    setVpsData(data);
    setConnected(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 py-10">
        <VPSConnectionForm onConnect={handleConnect} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Server className="w-6 h-6" />
          <h1 className="font-serif text-2xl font-medium">VPS Control</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Lumina's direct control panel for <strong>{vpsData?.serverName}</strong> — monitor status, reboot, shutdown, and more.
        </p>
      </div>
      <VPSPanel serverName={vpsData?.serverName} />
    </div>
  );
}