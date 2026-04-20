import React, { useState } from 'react';
import { Settings, Copy, Download, Plus, Trash2, Save, Upload, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProjectDashboard({ project }) {
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [sprites, setSprites] = useState({
    colors: ['#00d4ff', '#a78bfa', '#f472b6'],
    animations: true,
    gridSize: 16,
    opacity: 1
  });
  const [assets, setAssets] = useState([]);
  const [keyframes, setKeyframes] = useState({
    default: { duration: 1, easing: 'ease-in-out', steps: [] }
  });
  const [presets, setPresets] = useState([
    { id: 'default', name: 'Default', sprites: JSON.parse(JSON.stringify(sprites)), assets: [], keyframes: JSON.parse(JSON.stringify(keyframes)) }
  ]);
  const [presetName, setPresetName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('default');

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

  const handleAssetUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAssets(prev => [...prev, {
          id: Date.now(),
          name: file.name,
          data: event.target.result,
          type: file.type
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAsset = (id) => {
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  const addKeyframe = (animationName) => {
    setKeyframes(prev => ({
      ...prev,
      [animationName]: {
        duration: 1,
        easing: 'ease-in-out',
        steps: [...(prev[animationName]?.steps || []), { time: 0, rotation: 0, scale: 1, opacity: 1 }]
      }
    }));
  };

  const updateKeyframeStep = (animationName, stepIdx, field, value) => {
    setKeyframes(prev => ({
      ...prev,
      [animationName]: {
        ...prev[animationName],
        steps: prev[animationName].steps.map((step, idx) =>
          idx === stepIdx ? { ...step, [field]: value } : step
        )
      }
    }));
  };

  const removeKeyframeStep = (animationName, stepIdx) => {
    setKeyframes(prev => ({
      ...prev,
      [animationName]: {
        ...prev[animationName],
        steps: prev[animationName].steps.filter((_, idx) => idx !== stepIdx)
      }
    }));
  };

  const savePreset = () => {
    if (!presetName.trim()) return;
    setPresets(prev => [...prev, {
      id: Date.now(),
      name: presetName,
      sprites: JSON.parse(JSON.stringify(sprites)),
      assets: JSON.parse(JSON.stringify(assets)),
      keyframes: JSON.parse(JSON.stringify(keyframes))
    }]);
    setPresetName('');
  };

  const loadPreset = (id) => {
    const preset = presets.find(p => p.id === id);
    if (preset) {
      setSprites(JSON.parse(JSON.stringify(preset.sprites)));
      setAssets(JSON.parse(JSON.stringify(preset.assets)));
      setKeyframes(JSON.parse(JSON.stringify(preset.keyframes)));
      setSelectedPreset(id);
    }
  };

  const deletePreset = (id) => {
    if (id === 'default') return;
    setPresets(prev => prev.filter(p => p.id !== id));
    if (selectedPreset === id) {
      setSelectedPreset('default');
      loadPreset('default');
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-cyan-500/30 rounded-lg p-3 space-y-2 shadow-2xl shadow-cyan-500/20 max-h-[420px] overflow-y-auto text-sm">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 bg-gradient-to-br from-slate-900 to-slate-800 pb-2 z-10">
        <div className="min-w-0">
          <h3 className="text-xs font-medium text-white truncate">{project.title}</h3>
          <p className="text-[9px] text-cyan-400/60">
            {presets.length} preset · {assets.length} asset
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1 rounded hover:bg-cyan-500/10 text-cyan-400 transition-colors shrink-0 ml-2"
        >
          <Settings className="w-3 h-3" />
        </button>
      </div>

      {!showSettings ? (
        <>
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-medium hover:bg-cyan-500/20 transition-colors"
            >
              <Copy className="w-3 h-3" />
              Copy
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-medium hover:bg-cyan-500/20 transition-colors"
            >
              <Download className="w-3 h-3" />
              DL
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-cyan-500/20">
            <div className="text-center">
              <p className="text-[8px] text-cyan-400/60">Lines</p>
              <p className="text-xs font-medium text-cyan-300">{project.html?.split('\n').length || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-[8px] text-cyan-400/60">Size</p>
              <p className="text-xs font-medium text-cyan-300">{Math.round((project.html?.length || 0) / 1024)}KB</p>
            </div>
            <div className="text-center">
              <p className="text-[8px] text-cyan-400/60">Status</p>
              <p className="text-xs font-medium text-cyan-300">✓</p>
            </div>
          </div>
        </>
      ) : (
        <div className="border-t border-cyan-500/20 pt-2 space-y-2 animate-fade-up">
          {/* Tabs */}
          <div className="flex gap-0.5 border-b border-cyan-500/20 -mx-3 px-3">
            {['basic', 'assets', 'animations', 'presets'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'text-[9px] font-medium px-2 py-1 border-b-2 transition-colors capitalize',
                  activeTab === tab
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-cyan-400/60 hover:text-cyan-300'
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Basic Settings */}
          {activeTab === 'basic' && (
            <div className="space-y-2">
              {/* Colors */}
              <div>
                <label className="text-[9px] font-medium text-cyan-300 block mb-1">Colors</label>
                <div className="flex gap-1">
                  {sprites.colors.map((color, idx) => (
                    <input
                      key={idx}
                      type="color"
                      value={color}
                      onChange={(e) => {
                        const newColors = [...sprites.colors];
                        newColors[idx] = e.target.value;
                        setSprites({ ...sprites, colors: newColors });
                      }}
                      className="w-6 h-6 rounded cursor-pointer border border-cyan-500/30"
                    />
                  ))}
                </div>
              </div>

              {/* Animations */}
              <label className="text-[9px] font-medium text-cyan-300 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sprites.animations}
                  onChange={(e) => setSprites({ ...sprites, animations: e.target.checked })}
                  className="w-3 h-3 rounded"
                />
                Animations
              </label>

              {/* Grid Size */}
              <div>
                <label className="text-[9px] font-medium text-cyan-300 block mb-0.5">
                  Grid: {sprites.gridSize}px
                </label>
                <input
                  type="range"
                  min="8"
                  max="32"
                  value={sprites.gridSize}
                  onChange={(e) => setSprites({ ...sprites, gridSize: parseInt(e.target.value) })}
                  className="w-full h-0.5 bg-cyan-500/20 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Opacity */}
              <div>
                <label className="text-[9px] font-medium text-cyan-300 block mb-0.5">
                  Opacity: {Math.round(sprites.opacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0.3"
                  max="1"
                  step="0.1"
                  value={sprites.opacity}
                  onChange={(e) => setSprites({ ...sprites, opacity: parseFloat(e.target.value) })}
                  className="w-full h-0.5 bg-cyan-500/20 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Asset Upload */}
          {activeTab === 'assets' && (
            <div className="space-y-2">
              <div className="border border-dashed border-cyan-500/30 rounded p-2 text-center text-[9px]">
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleAssetUpload}
                    className="hidden"
                  />
                  <Upload className="w-3 h-3 text-cyan-400 mx-auto mb-0.5" />
                  <span className="font-medium text-cyan-300">Click upload</span>
                </label>
              </div>

              {assets.length > 0 && (
                <div className="space-y-1">
                  {assets.map(asset => (
                    <div key={asset.id} className="flex items-center gap-1 p-1 rounded bg-cyan-500/10 border border-cyan-500/20">
                      {asset.type.startsWith('image') ? (
                        <img src={asset.data} alt={asset.name} className="w-4 h-4 rounded object-cover" />
                      ) : (
                        <PlayCircle className="w-3 h-3 text-cyan-400" />
                      )}
                      <span className="text-[8px] text-cyan-300 truncate flex-1">{asset.name}</span>
                      <button
                        onClick={() => removeAsset(asset.id)}
                        className="p-0.5 rounded hover:bg-red-500/20 text-red-400"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Keyframe Editor */}
          {activeTab === 'animations' && (
            <div className="space-y-2">
              {Object.entries(keyframes).map(([animName, anim]) => (
                <div key={animName} className="border border-cyan-500/20 rounded p-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[9px] font-medium text-cyan-300 capitalize">{animName}</h4>
                    <button
                      onClick={() => addKeyframe(animName)}
                      className="p-0.5 rounded hover:bg-cyan-500/20 text-cyan-400"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={anim.duration}
                      onChange={(e) => setKeyframes(prev => ({
                        ...prev,
                        [animName]: { ...prev[animName], duration: parseFloat(e.target.value) }
                      }))}
                      className="w-full px-1 py-0.5 text-[8px] rounded bg-slate-800 border border-cyan-500/20 text-cyan-300"
                      placeholder="Duration"
                    />
                    <select
                      value={anim.easing}
                      onChange={(e) => setKeyframes(prev => ({
                        ...prev,
                        [animName]: { ...prev[animName], easing: e.target.value }
                      }))}
                      className="w-full px-1 py-0.5 text-[8px] rounded bg-slate-800 border border-cyan-500/20 text-cyan-300"
                    >
                      <option>linear</option>
                      <option>ease-in</option>
                      <option>ease-out</option>
                      <option>ease-in-out</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Presets */}
          {activeTab === 'presets' && (
            <div className="space-y-2">
              <div className="flex gap-1">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Name"
                  className="flex-1 text-[9px] px-1.5 py-1 rounded bg-slate-800 border border-cyan-500/20 text-cyan-300 placeholder:text-cyan-400/40"
                />
                <button
                  onClick={savePreset}
                  disabled={!presetName.trim()}
                  className="p-1 rounded hover:bg-cyan-500/20 text-cyan-400 disabled:opacity-50"
                >
                  <Save className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-1">
                {presets.map(preset => (
                  <div
                    key={preset.id}
                    onClick={() => loadPreset(preset.id)}
                    className={cn(
                      'p-1.5 rounded border cursor-pointer transition-colors text-[9px]',
                      selectedPreset === preset.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-cyan-500/5 border-cyan-500/20 text-cyan-400/70 hover:bg-cyan-500/10'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{preset.name}</span>
                      {preset.id !== 'default' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePreset(preset.id);
                          }}
                          className="p-0.5 rounded hover:bg-red-500/20 text-red-400/60"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}