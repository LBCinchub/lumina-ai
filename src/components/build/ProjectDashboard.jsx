import React, { useState } from 'react';
import { Settings, Copy, Download, Zap } from 'lucide-react';

export default function ProjectDashboard({ project }) {
  const [showSettings, setShowSettings] = useState(false);
  const [sprites, setSprites] = useState({
    colors: ['#00d4ff', '#a78bfa', '#f472b6'],
    animations: true,
    gridSize: 16,
    opacity: 1
  });

  const handleCopy = () => {
    if (project.html) {
      navigator.clipboard.writeText(project.html);
    }
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
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-cyan-500/30 rounded-xl p-5 space-y-4 shadow-2xl shadow-cyan-500/20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white">{project.title}</h3>
          <p className="text-xs text-cyan-400/60 mt-1">
            {project.messages?.length || 0} messages · {project.html ? 'Ready' : 'In progress'}
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-lg hover:bg-cyan-500/10 text-cyan-400 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-medium hover:bg-cyan-500/20 transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          Copy
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-medium hover:bg-cyan-500/20 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="border-t border-cyan-500/20 pt-4 space-y-4 animate-fade-up">
          {/* Colors */}
          <div>
            <label className="text-xs font-medium text-cyan-300 block mb-2">Theme Colors</label>
            <div className="flex gap-2">
              {sprites.colors.map((color, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => {
                      const newColors = [...sprites.colors];
                      newColors[idx] = e.target.value;
                      setSprites({ ...sprites, colors: newColors });
                    }}
                    className="w-8 h-8 rounded cursor-pointer border border-cyan-500/30"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Animations */}
          <div>
            <label className="text-xs font-medium text-cyan-300 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sprites.animations}
                onChange={(e) => setSprites({ ...sprites, animations: e.target.checked })}
                className="w-3.5 h-3.5 rounded"
              />
              Enable Animations
            </label>
          </div>

          {/* Grid Size */}
          <div>
            <label className="text-xs font-medium text-cyan-300 block mb-2">
              Grid Size: {sprites.gridSize}px
            </label>
            <input
              type="range"
              min="8"
              max="32"
              value={sprites.gridSize}
              onChange={(e) => setSprites({ ...sprites, gridSize: parseInt(e.target.value) })}
              className="w-full h-1 bg-cyan-500/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Opacity */}
          <div>
            <label className="text-xs font-medium text-cyan-300 block mb-2">
              Opacity: {Math.round(sprites.opacity * 100)}%
            </label>
            <input
              type="range"
              min="0.3"
              max="1"
              step="0.1"
              value={sprites.opacity}
              onChange={(e) => setSprites({ ...sprites, opacity: parseFloat(e.target.value) })}
              className="w-full h-1 bg-cyan-500/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Info */}
          <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/20">
            <p className="text-[11px] text-cyan-300/70">
              <Zap className="w-3 h-3 inline mr-1" />
              Custom sprite settings applied to preview
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-cyan-500/20">
        <div className="text-center">
          <p className="text-xs text-cyan-400/60">Lines</p>
          <p className="text-sm font-medium text-cyan-300 mt-1">
            {project.html?.split('\n').length || 0}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-cyan-400/60">Size</p>
          <p className="text-sm font-medium text-cyan-300 mt-1">
            {Math.round((project.html?.length || 0) / 1024)}KB
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-cyan-400/60">Status</p>
          <p className="text-sm font-medium text-cyan-300 mt-1">✓</p>
        </div>
      </div>
    </div>
  );
}