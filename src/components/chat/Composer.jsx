import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { ArrowUp, Mic, MicOff, Paperclip, X, Image, Video, FileText, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpeechInput } from '@/hooks/useSpeechInput';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';

function AttachmentPreview({ attachments, onRemove }) {
  if (!attachments.length) return null;
  return (
    <div className="flex flex-wrap gap-2 px-4 pt-3 pb-1">
      {attachments.map((a, i) => (
        <div key={i} className="relative flex items-center gap-1.5 bg-accent rounded-lg px-2.5 py-1.5 pr-7 max-w-[200px]">
          {a.type === 'image' && <Image className="w-3.5 h-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />}
          {a.type === 'video' && <Video className="w-3.5 h-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />}
          {a.type === 'file' && <FileText className="w-3.5 h-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />}
          <span className="text-xs text-foreground/80 truncate">{a.name}</span>
          <button
            onClick={() => onRemove(i)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

const Composer = forwardRef(function Composer(
  { value, onChange, onSubmit, disabled, placeholder = "Speak plainly.", luminaSpeaking = false, onListeningChange, onBargeIn },
  ref
) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const onSubmitRef = useRef(onSubmit);
  const onChangeRef = useRef(onChange);
  const onBargeInRef = useRef(onBargeIn);
  useEffect(() => { onSubmitRef.current = onSubmit; }, [onSubmit]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onBargeInRef.current = onBargeIn; }, [onBargeIn]);

  const { listening, supported, toggle: toggleVoice, start: startVoice, stop: stopVoice, restart: restartVoice } = useSpeechInput({
    onTranscript: (text) => onChangeRef.current(text),
    onAutoSubmit: (text) => {
      onChangeRef.current('');
      onSubmitRef.current(text, []);
    },
    onBargeIn: () => onBargeInRef.current?.(),
  });

  useImperativeHandle(ref, () => ({ start: startVoice, stop: stopVoice, restart: restartVoice }), [startVoice, stopVoice, restartVoice]);

  useEffect(() => { onListeningChange?.(listening); }, [listening, onListeningChange]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [value]);

  const submit = () => {
    const text = value.trim();
    if ((text || attachments.length) && !disabled && !uploading) {
      onChangeRef.current('');
      onSubmitRef.current(text, attachments);
      setAttachments([]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    e.target.value = '';
    setUploading(true);
    const uploaded = await Promise.all(files.map(async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const mime = file.type;
      const type = mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : 'file';
      return { url: file_url, name: file.name, type };
    }));
    setAttachments(prev => [...prev, ...uploaded]);
    setUploading(false);
  };

  const canSend = (value.trim() || attachments.length) && !disabled && !uploading;

  return (
    <div className="relative">
      <div className={cn(
        "relative flex flex-col bg-card border border-border rounded-2xl",
        "transition-all duration-300",
        "focus-within:border-foreground/30 focus-within:shadow-[0_2px_20px_-8px_hsl(var(--foreground)/0.15)]",
      )}>
        <AttachmentPreview
          attachments={attachments}
          onRemove={(i) => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
        />

        {/* Preview toggle */}
        {value && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-border/50">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPreview ? "Hide preview" : "Show preview"}
            >
              {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showPreview ? "Hide" : "Show"} preview
            </button>
          </div>
        )}

        {/* Split pane editor + preview */}
        <div className={cn(
          "flex",
          showPreview ? "gap-0" : ""
        )}>
          {/* Editor */}
          <div className={cn(
            "flex flex-col flex-1 overflow-hidden",
            showPreview && "border-r border-border/50"
          )}>
            <div className="flex items-end gap-2 px-4 py-3 flex-1 min-h-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || uploading}
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Attach file"
              >
                {uploading
                  ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <Paperclip className="w-4 h-4" strokeWidth={1.75} />
                }
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />

              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChangeRef.current(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={uploading ? "Uploading…" : listening ? "Listening…" : luminaSpeaking ? "Lumina is speaking…" : placeholder}
                rows={1}
                disabled={disabled}
                className={cn(
                  "flex-1 bg-transparent resize-none outline-none",
                  "text-[15px] leading-relaxed placeholder:text-muted-foreground/60",
                  "scrollbar-minimal"
                )}
                style={{ maxHeight: '200px' }}
              />

              <div className="flex gap-2">
                {supported && (
                  <button
                    type="button"
                    onClick={toggleVoice}
                    disabled={disabled || luminaSpeaking}
                    className={cn(
                      "shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all",
                      listening
                        ? "bg-red-500/90 text-white animate-pulse"
                        : luminaSpeaking
                          ? "text-foreground/30"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent",
                      "disabled:cursor-not-allowed"
                    )}
                    aria-label={listening ? "Stop listening" : "Voice input"}
                  >
                    {listening ? <MicOff className="w-4 h-4" strokeWidth={2} /> : <Mic className="w-4 h-4" strokeWidth={1.75} />}
                  </button>
                )}

                <button
                  onClick={submit}
                  disabled={!canSend}
                  className={cn(
                    "shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                    "bg-foreground text-background transition-all",
                    "hover:scale-105 disabled:opacity-30 disabled:hover:scale-100",
                    "disabled:cursor-not-allowed"
                  )}
                  aria-label="Send"
                >
                  <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>

          {/* Preview pane */}
          {showPreview && (
            <div className="flex-1 overflow-y-auto scrollbar-minimal px-4 py-3 text-[15px] leading-relaxed bg-muted/30">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                  h1: ({ children }) => <h1 className="text-lg font-semibold mt-4 mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                  code: ({ inline, children }) => inline
                    ? <code className="px-1.5 py-0.5 rounded bg-accent text-xs font-mono">{children}</code>
                    : <pre className="bg-accent rounded p-2 mb-3 overflow-x-auto text-xs"><code>{children}</code></pre>,
                  blockquote: ({ children }) => <blockquote className="border-l-2 border-border pl-3 italic text-muted-foreground my-3">{children}</blockquote>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                }}
              >
                {value}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default Composer;