import React, { useRef, useEffect } from 'react';

export default function CollaborativeCodeEditor({ code, onCodeChange }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current && textareaRef.current.value !== code) {
      textareaRef.current.value = code || '';
    }
  }, [code]);

  return (
    <div className="flex-1 h-full flex flex-col bg-background">
      <textarea
        ref={textareaRef}
        defaultValue={code || ''}
        onChange={e => onCodeChange?.(e.target.value)}
        spellCheck={false}
        className="flex-1 w-full h-full resize-none outline-none bg-background text-foreground/80 text-[12px] font-mono leading-relaxed p-4 scrollbar-minimal"
        style={{ fontFamily: "'Share Tech Mono', 'Courier New', monospace" }}
      />
    </div>
  );
}