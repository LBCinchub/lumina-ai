import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { ArrowUp, Mic, MicOff, Paperclip, X, Image, Video, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpeechInput } from '@/hooks/useSpeechInput';
import { base44 } from '@/api/base44Client';

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

        <div className="flex items-end gap-2 px-4 py-3">
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
  );
});

export default Composer;