import React, { useState, useRef } from 'react';

// Single-line command input with the LBC gradient prompt and up/down
// history recall, like a real shell.
export default function TerminalInput({ onSubmit, busy }) {
  const [value, setValue] = useState('');
  const [history, setHistory] = useState([]);
  const [hIndex, setHIndex] = useState(-1);
  const inputRef = useRef(null);

  const submit = () => {
    const text = value.trim();
    if (!text || busy) return;
    setHistory(h => [text, ...h].slice(0, 50));
    setHIndex(-1);
    setValue('');
    onSubmit(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length) {
        const next = Math.min(hIndex + 1, history.length - 1);
        setHIndex(next);
        setValue(history[next]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = hIndex - 1;
      if (next < 0) {
        setHIndex(-1);
        setValue('');
      } else {
        setHIndex(next);
        setValue(history[next]);
      }
    }
  };

  return (
    <div className="flex items-center gap-2 font-mono text-[12.5px]">
      <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent shrink-0">lbc@ultra</span>
      <span className="text-muted-foreground shrink-0">:~$</span>
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={busy}
        autoFocus
        spellCheck={false}
        autoComplete="off"
        placeholder="Type /help…"
        className="flex-1 min-w-0 bg-transparent outline-none text-foreground placeholder:text-muted-foreground/40 disabled:opacity-50"
      />
    </div>
  );
}