import { useEffect, useRef, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const SYNC_INTERVAL = 2000; // Sync every 2 seconds
const INACTIVITY_TIMEOUT = 30000; // Remove user after 30s of inactivity

export function useCollaborativeSession(projectId, onCollaboratorsChange) {
  const [collaborators, setCollaborators] = useState([]);
  const syncTimerRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const lastSyncRef = useRef(0);

  const syncSession = useCallback(async (htmlContent, cursorPos, selection) => {
    const now = Date.now();
    
    // Throttle syncs to avoid overwhelming the backend
    if (now - lastSyncRef.current < 500) return;
    lastSyncRef.current = now;

    try {
      const result = await base44.functions.invoke('syncCollaborativeEdit', {
        project_id: projectId,
        html_content: htmlContent,
        cursor_position: cursorPos,
        selection: selection
      });

      if (result.data?.collaborators) {
        setCollaborators(result.data.collaborators);
        onCollaboratorsChange?.(result.data.collaborators);
      }
    } catch (err) {
      console.error('Failed to sync collaborative session:', err);
    }
  }, [projectId, onCollaboratorsChange]);

  // Periodic sync to maintain presence
  useEffect(() => {
    syncTimerRef.current = setInterval(() => {
      syncSession(null, null, null);
    }, SYNC_INTERVAL);

    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, [syncSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, []);

  return { collaborators, syncSession };
}