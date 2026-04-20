import React from 'react';
import ReactMarkdown from 'react-markdown';
import LuminaMark from '@/components/layout/LuminaMark';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MessageBubble({ message, isLatest }) {
  const isUser = message.role === 'user';

  const fileUrls = message.file_urls || [];

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-up">
        <div className="max-w-[85%] md:max-w-[75%] space-y-2">
          {fileUrls.map((url, i) => {
            const isImage = /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url);
            const isVideo = /\.(mp4|webm|mov|avi)(\?|$)/i.test(url);
            if (isImage) return <img key={i} src={url} alt="attachment" className="rounded-xl max-h-60 object-cover" />;
            if (isVideo) return <video key={i} src={url} controls className="rounded-xl max-h-60 w-full" />;
            return (
              <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-accent text-accent-foreground rounded-xl px-3 py-2 text-sm hover:opacity-80">
                📎 {url.split('/').pop()}
              </a>
            );
          })}
          {message.content && (
            <div className="bg-accent text-accent-foreground rounded-2xl rounded-tr-sm px-4 py-2.5">
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-4 animate-fade-up", isLatest && "mb-2")}>
      <div className="shrink-0 mt-1">
        <LuminaMark size={22} className="text-foreground/80" />
      </div>
      <div className="flex-1 min-w-0 prose-lumina text-[15px] text-yellow-300 flex gap-2 items-start" style={{textShadow: '0 0 8px rgba(253,224,71,0.8), 0 0 20px rgba(253,224,71,0.4)'}}>
        <Zap className="w-4 h-4 shrink-0 mt-1 text-yellow-300 fill-yellow-300" style={{filter: 'drop-shadow(0 0 6px rgba(253,224,71,0.9))'}} />
        <div className="flex-1"><ReactMarkdown>{message.content}</ReactMarkdown></div>
      </div>
    </div>
  );
}