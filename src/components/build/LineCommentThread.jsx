import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { MessageSquare, Send, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

function CommentBubble({ comment, onReply, onResolve, currentUserEmail, authorColor }) {
  const [replyText, setReplyText] = useState('');
  const [showReply, setShowReply] = useState(false);

  return (
    <div className="group">
      <div className="flex gap-2 items-start">
        <div
          className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
          style={{ backgroundColor: comment.author_color || '#4ECDC4' }}
        >
          {(comment.author_name || comment.author_email || '?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] font-semibold text-foreground/80">{comment.author_name || comment.author_email}</span>
            <span className="text-[10px] text-muted-foreground/50">
              {comment.created_date ? formatDistanceToNow(new Date(comment.created_date), { addSuffix: true }) : ''}
            </span>
            {!comment.resolved && comment.author_email === currentUserEmail && (
              <button
                onClick={() => onResolve(comment.id)}
                className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-green-500 hover:text-green-400"
              >
                <Check className="w-3 h-3" /> Resolve
              </button>
            )}
          </div>
          <p className="text-[13px] text-foreground/80 leading-relaxed">{comment.content}</p>
          {!comment.resolved && (
            <button
              onClick={() => setShowReply(v => !v)}
              className="mt-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              Reply
            </button>
          )}
        </div>
      </div>
      {showReply && (
        <div className="ml-8 mt-2 flex gap-2">
          <input
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && replyText.trim()) { onReply(comment.id, replyText); setReplyText(''); setShowReply(false); } }}
            placeholder="Reply…"
            className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-border bg-card outline-none focus:border-foreground/30"
            autoFocus
          />
          <button
            onClick={() => { if (replyText.trim()) { onReply(comment.id, replyText); setReplyText(''); setShowReply(false); } }}
            className="p-1.5 rounded-lg bg-foreground text-background hover:opacity-80"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function LineCommentThread({ projectId, lineNumber, comments, onClose, onCommentsChange, currentUser, authorColor }) {
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  const threadComments = comments.filter(c => c.line_number === lineNumber && !c.parent_id);
  const activeComments = threadComments.filter(c => !c.resolved);
  const resolvedComments = threadComments.filter(c => c.resolved);

  const getReplies = (parentId) => comments.filter(c => c.parent_id === parentId);

  const handleSubmit = async () => {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    const hash = (currentUser?.email || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
    const color = colors[hash % colors.length];
    await base44.entities.CodeComment.create({
      project_id: projectId,
      line_number: lineNumber,
      content: newComment.trim(),
      author_email: currentUser?.email || '',
      author_name: currentUser?.full_name || currentUser?.email || 'Unknown',
      author_color: color,
      resolved: false
    });
    setNewComment('');
    setSubmitting(false);
    onCommentsChange?.();
  };

  const handleReply = async (parentId, text) => {
    const hash = (currentUser?.email || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
    const color = colors[hash % colors.length];
    await base44.entities.CodeComment.create({
      project_id: projectId,
      line_number: lineNumber,
      content: text,
      author_email: currentUser?.email || '',
      author_name: currentUser?.full_name || currentUser?.email || 'Unknown',
      author_color: color,
      resolved: false,
      parent_id: parentId
    });
    onCommentsChange?.();
  };

  const handleResolve = async (commentId) => {
    await base44.entities.CodeComment.update(commentId, { resolved: true });
    onCommentsChange?.();
  };

  return (
    <div className="absolute right-0 z-30 w-80 bg-card border border-border rounded-xl shadow-2xl" style={{ top: 0 }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />
          <span className="text-xs font-semibold">Line {lineNumber}</span>
          {activeComments.length > 0 && (
            <span className="text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full">{activeComments.length}</span>
          )}
        </div>
        <button onClick={onClose} className="p-0.5 hover:text-foreground text-muted-foreground transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto scrollbar-minimal px-4 py-3 space-y-4">
        {activeComments.length === 0 && resolvedComments.length === 0 && (
          <p className="text-xs text-muted-foreground/60 text-center py-2">No comments yet. Add one below.</p>
        )}
        {activeComments.map(comment => (
          <div key={comment.id}>
            <CommentBubble
              comment={comment}
              onReply={handleReply}
              onResolve={handleResolve}
              currentUserEmail={currentUser?.email}
            />
            {getReplies(comment.id).map(reply => (
              <div key={reply.id} className="ml-8 mt-2">
                <CommentBubble
                  comment={reply}
                  onReply={handleReply}
                  onResolve={handleResolve}
                  currentUserEmail={currentUser?.email}
                />
              </div>
            ))}
          </div>
        ))}
        {resolvedComments.length > 0 && (
          <button
            onClick={() => setShowResolved(v => !v)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            {showResolved ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {resolvedComments.length} resolved
          </button>
        )}
        {showResolved && resolvedComments.map(comment => (
          <div key={comment.id} className="opacity-50">
            <CommentBubble
              comment={comment}
              onReply={() => {}}
              onResolve={() => {}}
              currentUserEmail={currentUser?.email}
            />
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-border/60">
        <div className="flex gap-2">
          <input
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSubmit(); }}
            placeholder="Add a comment…"
            className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background outline-none focus:border-foreground/30 transition-colors"
          />
          <button
            onClick={handleSubmit}
            disabled={!newComment.trim() || submitting}
            className="p-1.5 rounded-lg bg-foreground text-background hover:opacity-80 disabled:opacity-40 transition-all"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}