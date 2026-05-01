import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { MessageSquare, Users, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import LineCommentThread from './LineCommentThread';

// Color palette for collaborators
const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];

function getColor(email) {
  const hash = (email || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return COLORS[hash % COLORS.length];
}

// Track which lines each collaborator has recently edited
function diffLines(oldCode, newCode) {
  const oldLines = (oldCode || '').split('\n');
  const newLines = (newCode || '').split('\n');
  const changed = new Set();
  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    if (oldLines[i] !== newLines[i]) changed.add(i + 1);
  }
  return changed;
}

export default function CollaborativeCodeEditor({ code, projectId, collaborators, currentUser, onCodeChange }) {
  const [localCode, setLocalCode] = useState(code || '');
  const [commentsByLine, setCommentsByLine] = useState({});
  const [allComments, setAllComments] = useState([]);
  const [activeCommentLine, setActiveCommentLine] = useState(null);
  const [hoveredLine, setHoveredLine] = useState(null);
  const [changedLines, setChangedLines] = useState(new Set());
  const [collaboratorLines, setCollaboratorLines] = useState({}); // email -> Set of line numbers
  const [showCollaborators, setShowCollaborators] = useState(true);
  const prevCodeRef = useRef(code || '');
  const textareaRef = useRef(null);
  const lineHighlightRef = useRef(null);
  const syncTimerRef = useRef(null);
  const commentPollRef = useRef(null);

  // Sync external code changes in
  useEffect(() => {
    if (code !== localCode) {
      const changed = diffLines(localCode, code || '');
      setChangedLines(changed);
      setLocalCode(code || '');
      prevCodeRef.current = code || '';
      // Fade out highlights after 3s
      const t = setTimeout(() => setChangedLines(new Set()), 3000);
      return () => clearTimeout(t);
    }
  }, [code]);

  // Build collaborator line highlights from session cursor data
  useEffect(() => {
    const map = {};
    for (const c of collaborators) {
      if (c.user_email === currentUser?.email) continue;
      if (c.cursor_position?.line) {
        map[c.user_email] = { line: c.cursor_position.line, color: c.color || getColor(c.user_email), name: c.user_name || c.user_email };
      }
    }
    setCollaboratorLines(map);
  }, [collaborators, currentUser]);

  // Load comments
  const loadComments = useCallback(async () => {
    if (!projectId) return;
    const data = await base44.entities.CodeComment.filter({ project_id: projectId }, 'created_date', 200);
    setAllComments(data);
    const byLine = {};
    for (const c of data) {
      if (!byLine[c.line_number]) byLine[c.line_number] = [];
      byLine[c.line_number].push(c);
    }
    setCommentsByLine(byLine);
  }, [projectId]);

  useEffect(() => {
    loadComments();
    commentPollRef.current = setInterval(loadComments, 5000);
    return () => clearInterval(commentPollRef.current);
  }, [loadComments]);

  // Sync code changes upstream with debounce
  const handleChange = (e) => {
    const newCode = e.target.value;
    const changed = diffLines(prevCodeRef.current, newCode);
    setChangedLines(prev => new Set([...prev, ...changed]));
    prevCodeRef.current = newCode;
    setLocalCode(newCode);
    onCodeChange?.(newCode);
    // Fade out own changes after 4s
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => setChangedLines(new Set()), 4000);
  };

  // Track cursor line
  const handleCursorMove = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const text = ta.value.substring(0, ta.selectionStart);
    const line = text.split('\n').length;
    setHoveredLine(line);
  };

  const lines = localCode.split('\n');
  const lineHeight = 22; // px — must match textarea line-height
  const charWidth = 8.4; // approximate px per char in monospace at 13px

  // Build a per-line map of collaborators currently on that line
  const collabOnLine = {};
  for (const [email, data] of Object.entries(collaboratorLines)) {
    if (!collabOnLine[data.line]) collabOnLine[data.line] = [];
    collabOnLine[data.line].push(data);
  }

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] text-[#cdd6f4] font-mono text-[13px] select-none overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/10 bg-[#181825] shrink-0">
        <span className="text-xs text-white/40 uppercase tracking-[0.12em]">Collaborative Editor</span>
        <div className="flex items-center gap-1.5 ml-auto">
          {collaborators.filter(c => c.user_email !== currentUser?.email).map(c => (
            <div key={c.user_email} title={c.user_name || c.user_email}
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-black/30"
              style={{ backgroundColor: c.color || getColor(c.user_email) }}>
              {(c.user_name || c.user_email || '?')[0].toUpperCase()}
            </div>
          ))}
          <button
            onClick={() => setShowCollaborators(v => !v)}
            className="p-1 rounded text-white/40 hover:text-white/70 transition-colors"
            title={showCollaborators ? 'Hide collaborator highlights' : 'Show collaborator highlights'}
          >
            {showCollaborators ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <div className="flex items-center gap-1 text-[10px] text-white/30 ml-2">
            <Users className="w-3 h-3" />
            {collaborators.length} online
          </div>
        </div>
      </div>

      {/* Editor body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Line numbers + gutter */}
        <div className="w-14 shrink-0 bg-[#181825] border-r border-white/10 overflow-hidden select-none" ref={lineHighlightRef}>
          <div style={{ paddingTop: 8 }}>
            {lines.map((_, i) => {
              const lineNum = i + 1;
              const hasComment = !!(commentsByLine[lineNum]?.filter(c => !c.resolved).length);
              const isChanged = changedLines.has(lineNum);
              const collabs = showCollaborators ? (collabOnLine[lineNum] || []) : [];

              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center justify-end pr-2 relative group cursor-pointer transition-colors",
                    isChanged && "bg-[#45B7D1]/10",
                    collabs.length > 0 && "bg-[rgba(255,255,255,0.04)]"
                  )}
                  style={{ height: lineHeight }}
                  onMouseEnter={() => setHoveredLine(lineNum)}
                  onMouseLeave={() => setHoveredLine(null)}
                  onClick={() => setActiveCommentLine(prev => prev === lineNum ? null : lineNum)}
                >
                  {/* Changed line indicator */}
                  {isChanged && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#45B7D1]" />}

                  {/* Collaborator line indicator */}
                  {collabs.slice(0, 2).map((collab, ci) => (
                    <div
                      key={collab.name}
                      className="absolute left-0.5 w-0.5 rounded-full"
                      style={{ backgroundColor: collab.color, top: 2 + ci * 4, bottom: 2 - ci * 4, opacity: 0.9 }}
                    />
                  ))}

                  {/* Line number */}
                  <span className={cn("text-[11px] transition-colors", hoveredLine === lineNum ? "text-white/60" : "text-white/20")}>
                    {lineNum}
                  </span>

                  {/* Comment icon */}
                  {(hoveredLine === lineNum || hasComment) && (
                    <div className={cn("absolute right-1 top-1/2 -translate-y-1/2", hasComment ? "text-yellow-400" : "text-white/20 opacity-0 group-hover:opacity-100")} style={{ transition: 'opacity 0.15s' }}>
                      <MessageSquare className="w-2.5 h-2.5" />
                      {hasComment && (
                        <span className="absolute -top-1.5 -right-1 text-[8px] bg-yellow-400 text-black rounded-full w-3 h-3 flex items-center justify-center font-bold">
                          {commentsByLine[lineNum].filter(c => !c.resolved).length}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Textarea + overlay */}
        <div className="flex-1 relative overflow-auto scrollbar-minimal">
          {/* Background highlight layer */}
          <div className="absolute inset-0 pointer-events-none" style={{ paddingTop: 8 }}>
            {lines.map((_, i) => {
              const lineNum = i + 1;
              const isChanged = changedLines.has(lineNum);
              const collabs = showCollaborators ? (collabOnLine[lineNum] || []) : [];
              return (
                <div
                  key={i}
                  className="transition-colors"
                  style={{
                    height: lineHeight,
                    backgroundColor: collabs.length > 0
                      ? `${collabs[0].color}18`
                      : isChanged
                        ? 'rgba(69,183,209,0.07)'
                        : 'transparent'
                  }}
                />
              );
            })}
          </div>

          {/* Collaborator cursor indicators */}
          {showCollaborators && Object.entries(collaboratorLines).map(([email, data]) => (
            <div
              key={email}
              className="absolute left-0 right-0 pointer-events-none flex items-center"
              style={{ top: 8 + (data.line - 1) * lineHeight, height: lineHeight, zIndex: 10 }}
            >
              <div
                className="absolute right-2 text-[9px] px-1 py-0.5 rounded font-medium text-white opacity-80 whitespace-nowrap"
                style={{ backgroundColor: data.color }}
              >
                {data.name}
              </div>
              <div className="absolute inset-0 border-b pointer-events-none" style={{ borderColor: `${data.color}50` }} />
            </div>
          ))}

          <textarea
            ref={textareaRef}
            value={localCode}
            onChange={handleChange}
            onClick={handleCursorMove}
            onKeyUp={handleCursorMove}
            spellCheck={false}
            className="w-full h-full bg-transparent text-[#cdd6f4] resize-none outline-none px-4 pt-2 pb-8 relative z-10"
            style={{
              lineHeight: `${lineHeight}px`,
              fontFamily: "'Share Tech Mono', 'Courier New', monospace",
              fontSize: 13,
              caretColor: '#cba6f7',
              minHeight: `${Math.max(lines.length * lineHeight + 32, 200)}px`,
            }}
          />

          {/* Comment thread popover */}
          {activeCommentLine !== null && (
            <div
              className="absolute right-4 z-50"
              style={{ top: 8 + (activeCommentLine - 1) * lineHeight }}
            >
              <LineCommentThread
                projectId={projectId}
                lineNumber={activeCommentLine}
                comments={allComments}
                onClose={() => setActiveCommentLine(null)}
                onCommentsChange={loadComments}
                currentUser={currentUser}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}