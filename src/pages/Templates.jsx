import React from 'react';
import { useNavigate } from 'react-router-dom';
import TemplateManager from '@/components/templates/TemplateManager';

// Command Templates — save command strings you run often, then trigger them
// in the Terminal with a single click.
export default function Templates() {
  const navigate = useNavigate();

  const handleRun = (template) => {
    navigate(`/terminal?tpl=${template.id}`);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-minimal">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-6 animate-fade-up">
        <div>
          <h1 className="font-serif text-2xl tracking-tight">Command Templates</h1>
          <p className="text-[12px] text-muted-foreground mt-1">
            Save Commands You Run Often — Trigger Them In The Terminal With One Click.
          </p>
        </div>
        <TemplateManager onRun={handleRun} />
      </div>
    </div>
  );
}