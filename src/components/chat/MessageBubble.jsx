import React from 'react';
import ReactMarkdown from 'react-markdown';
import LuminaMark from '@/components/layout/LuminaMark';
import { cn } from '@/lib/utils';

export default function MessageBubble({ message, isLatest }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-up">
        <div className="max-w-[85%] md:max-w-[75%] bg-accent text-accent-foreground rounded-2xl rounded-tr-sm px-4 py-2.5">
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-4 animate-fade-up", isLatest && "mb-2")}>
      <div className="shrink-0 mt-1">
        <LuminaMark size={22} className="text-foreground/80" />
      </div>
      <div className="flex-1 min-w-0 prose-lumina text-[15px] text-foreground/90">
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
    </div>
  );
}