import React, { useState } from 'react';
import { Settings, Copy, Download, Zap, Plus, Trash2, Save, Upload, PlayCircle } from 'lucide-react';
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
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-cyan-500/30 rounded-xl p-5 space-y-4 shadow-2xl shadow-cyan-500/20 max-h-[600px] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 bg-gradient-to-br from-slate-900 to-slate-800 pb-3 z-10">
        <div>
          <h3 className="text-sm font-medium text-white">{project.title}</h3>
          <p className="text-xs text-cyan-400/60 mt-1">
            {presets.length} preset{presets.length !== 1 ? 's' : ''} · {assets.length} asset{assets.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-lg hover:bg-cyan-500/10 text-cyan-400 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {!showSettings ? (
        <>
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
        </>
      ) : (
        <div className="border-t border-cyan-500/20 pt-4 space-y-4 animate-fade-up">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-cyan-500/20">
            {['basic', 'assets', 'animations', 'presets'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'text-xs font-medium px-3 py-2 border-b-2 transition-colors capitalize',
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
            <div className="space-y-4">
              {/* Colors */}
              <div>
                <label className="text-xs font-medium text-cyan-300 block mb-2">Theme Colors</label>
                <div className="flex gap-2">
                  {sprites.colors.map((color, idx) => (
                    <div key={idx}>
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
            </div>
          )}

          {/* Asset Upload */}
          {activeTab === 'assets' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-cyan-500/30 rounded-lg p-4 text-center">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleAssetUpload}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-5 h-5 text-cyan-400" />
                    <span className="text-xs font-medium text-cyan-300">Click to upload assets</span>
                    <span className="text-[10px] text-cyan-400/50">PNG, JPG, GIF, MP4</span>
                  </div>
                </label>
              </div>

              {/* Asset List */}
              {assets.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-cyan-300">Uploaded Assets</p>
                  {assets.map(asset => (
                    <div key={asset.id} className="flex items-center justify-between p-2 rounded bg-cyan-500/10 border border-cyan-500/20">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {asset.type.startsWith('image') ? (
                          <img src={asset.data} alt={asset.name} className="w-6 h-6 rounded object-cover" />
                        ) : (
                          <PlayCircle className="w-4 h-4 text-cyan-400" />
                        )}
                        <span className="text-xs text-cyan-300 truncate">{asset.name}</span>
                      </div>
                      <button
                        onClick={() => removeAsset(asset.id)}
                        className="p-1 hover:bg-red-500/20 rounded transition-colors text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Keyframe Editor */}
          {activeTab === 'animations' && (
            <div className="space-y-4">
              {Object.entries(keyframes).map(([animName, anim]) => (
                <div key={animName} className="border border-cyan-500/20 rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-medium text-cyan-300 capitalize">{animName}</h4>
                    <button
                      onClick={() => addKeyframe(animName)}
                      className="p-1 rounded hover:bg-cyan-500/20 text-cyan-400"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-medium text-cyan-400 block">Duration (s)</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={anim.duration}
                        onChange={(e) => setKeyframes(prev => ({
                          ...prev,
                          [animName]: { ...prev[animName], duration: parseFloat(e.target.value) }
                        }))}
                        className="w-full px-2 py-1 text-xs rounded bg-slate-800 border border-cyan-500/20 text-cyan-300"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-medium text-cyan-400 block">Easing</label>
                      <select
                        value={anim.easing}
                        onChange={(e) => setKeyframes(prev => ({
                          ...prev,
                          [animName]: { ...prev[animName], easing: e.target.value }
                        }))}
                        className="w-full px-2 py-1 text-xs rounded bg-slate-800 border border-cyan-500/20 text-cyan-300"
                      >
                        <option>linear</option>
                        <option>ease-in</option>
                        <option>ease-out</option>
                        <option>ease-in-out</option>
                      </select>
                    </div>
                  </div>

                  {/* Keyframe Steps */}
                  {anim.steps && anim.steps.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-cyan-500/10">
                      {anim.steps.map((step, idx) => (
                        <div key={idx} className="grid grid-cols-4 gap-1 items-end">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="5"
                            value={step.time}
                            onChange={(e) => updateKeyframeStep(animName, idx, 'time', parseInt(e.target.value))}
                            className="text-[10px] px-1 py-1 rounded bg-slate-800 border border-cyan-500/10 text-cyan-300 text-center"
                            placeholder="Time %"
                          />
                          <input
                            type="number"
                            min="0"
                            max="360"
                            step="15"
                            value={step.rotation}
                            onChange={(e) => updateKeyframeStep(animName, idx, 'rotation', parseInt(e.target.value))}
                            className="text-[10px] px-1 py-1 rounded bg-slate-800 border border-cyan-500/10 text-cyan-300 text-center"
                            placeholder="Rot"
                          />
                          <input
                            type="number"
                            min="0.5"
                            max="2"
                            step="0.1"
                            value={step.scale}
                            onChange={(e) => updateKeyframeStep(animName, idx, 'scale', parseFloat(e.target.value))}
                            className="text-[10px] px-1 py-1 rounded bg-slate-800 border border-cyan-500/10 text-cyan-300 text-center"
                            placeholder="Scale"
                          />
                          <button
                            onClick={() => removeKeyframeStep(animName, idx)}
                            className="p-1 rounded hover:bg-red-500/20 text-red-400/60"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={() => addKeyframe(`animation-${Date.now()}`)}
                className="w-full py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-medium hover:bg-cyan-500/20 transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> New Animation
              </button>
            </div>
          )}

          {/* Presets */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              {/* Save New Preset */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Preset name"
                  className="flex-1 text-xs px-2 py-1.5 rounded bg-slate-800 border border-cyan-500/20 text-cyan-300 placeholder:text-cyan-400/40"
                />
                <button
                  onClick={savePreset}
                  disabled={!presetName.trim()}
                  className="p-1.5 rounded hover:bg-cyan-500/20 text-cyan-400 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>

              {/* Preset List */}
              <div className="space-y-2">
                {presets.map(preset => (
                  <div
                    key={preset.id}
                    onClick={() => loadPreset(preset.id)}
                    className={cn(
                      'p-2 rounded-lg border cursor-pointer transition-colors',
                      selectedPreset === preset.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-cyan-500/5 border-cyan-500/20 text-cyan-400/70 hover:bg-cyan-500/10'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{preset.name}</span>
                      {preset.id !== 'default' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePreset(preset.id);
                          }}
                          className="p-0.5 rounded hover:bg-red-500/20 text-red-400/60"
                        >
                          <Trash2 className="w-3 h-3" />
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