import { useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const SYNC_INTERVAL = 8000;

export function useCollaborativeSession(projectId, setCollaborators) {
  const intervalRef = useRef(null);
  const projectIdRef = useRef(projectId);

  useEffect(() => { projectIdRef.current = projectId; }, [projectId]);

  const syncSession = useCallback(async (htmlContent, cursorPosition, selection) => {
    if (!projectIdRef.current) return;
    try {
      const res = await base44.functions.invoke('syncCollaborativeEdit', {
        project_id: projectIdRef.current,
        html_content: htmlContent,
        cursor_position: cursorPosition,
        selection
      });
      if (res?.data?.collaborators) {
        setCollaborators(res.data.collaborators);
      }
    } catch (_) {}
  }, [setCollaborators]);

  useEffect(() => {
    if (!projectId) {
      setCollaborators([]);
      return;
    }
    intervalRef.current = setInterval(() => syncSession(null, null, null), SYNC_INTERVAL);
    syncSession(null, null, null);
    return () => clearInterval(intervalRef.current);
  }, [projectId, syncSession, setCollaborators]);

  return { syncSession };
}