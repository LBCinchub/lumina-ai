import React, { useState } from 'react';
import ProjectTasks from '@/components/build/ProjectTasks';
import ProjectMeetings from '@/components/build/ProjectMeetings';

export default function ProjectSidePanels({ projectId }) {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <>
      <ProjectMeetings projectId={projectId} onTasksCreated={() => setRefreshKey(k => k + 1)} />
      <ProjectTasks projectId={projectId} refreshKey={refreshKey} />
    </>
  );
}