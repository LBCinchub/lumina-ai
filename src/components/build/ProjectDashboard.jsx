import React, { useState } from 'react';
import { Settings, Copy, Download } from 'lucide-react';

export default function ProjectDashboard({ project }) {
  const [showSettings, setShowSettings] = useState(false);

  const handleCopy = () => {
    if (project.html) navigator.clipboard.writeText(project.html);
  };

  const handleDownload = () => {
    if (project.html) {
      const blob = new Blob([project.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title || 'project'}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-cyan-500/30 rounded p-2 shadow-2xl shadow-cyan-500/20 w-64 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0">
          <h3 className="text-[11px] font-medium text-white truncate">{project.title}</h3>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-0.5 rounded hover:bg-cyan-500/10 text-cyan-400 transition-colors shrink-0 ml-1"
        >
          <Settings className="w-3 h-3" />
        </button>
      </div>

      {!showSettings ? (
        <>
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-1 mb-2">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-1 px-1.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[9px] font-medium hover:bg-cyan-500/20 transition-colors"
            >
              <Copy className="w-2.5 h-2.5" />
              Copy
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-1 px-1.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[9px] font-medium hover:bg-cyan-500/20 transition-colors"
            >
              <Download className="w-2.5 h-2.5" />
              Export
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-1 text-center border-t border-cyan-500/20 pt-1.5">
            <div>
              <p className="text-[7px] text-cyan-400/60 mb-0.5">Lines</p>
              <p className="text-[10px] font-medium text-cyan-300">{project.html?.split('\n').length || 0}</p>
            </div>
            <div>
              <p className="text-[7px] text-cyan-400/60 mb-0.5">Size</p>
              <p className="text-[10px] font-medium text-cyan-300">{Math.round((project.html?.length || 0) / 1024)}KB</p>
            </div>
            <div>
              <p className="text-[7px] text-cyan-400/60 mb-0.5">Status</p>
              <p className="text-[10px] font-medium text-cyan-300">✓</p>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-2 text-cyan-400/60 text-[9px]">
          Settings panel coming soon
        </div>
      )}
    </div>
  );
}