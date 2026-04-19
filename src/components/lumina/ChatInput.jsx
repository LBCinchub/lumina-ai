import { useState, useRef } from "react";
import { Send, Mic } from "lucide-react";
import { motion } from "framer-motion";

export default function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = e => {
    setValue(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
    }
  };

  return (
    <div
      className="rounded-2xl flex items-end gap-3 px-4 py-3 transition-all"
      style={{
        background: "hsl(220,18%,11%)",
        border: "1px solid hsl(220,15%,18%)",
        boxShadow: "0 0 0 0 transparent",
      }}
      onFocus={() => {}}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Ask Lumina anything..."
        disabled={disabled}
        rows={1}
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none leading-relaxed min-h-[24px] max-h-[160px]"
        style={{ fontFamily: "var(--font-inter)" }}
      />
      <motion.button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        whileTap={{ scale: 0.9 }}
        className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        style={{
          background: value.trim() && !disabled
            ? "linear-gradient(135deg, hsl(196,80%,55%) 0%, hsl(270,60%,60%) 100%)"
            : "hsl(220,15%,18%)",
        }}
      >
        <Send className="w-3.5 h-3.5 text-white" />
      </motion.button>
    </div>
  );
}