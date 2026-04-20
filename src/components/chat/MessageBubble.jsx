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
            <div className="rounded-2xl rounded-tr-sm px-4 py-2.5" style={{background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)'}}>
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-white/80">{message.content}</p>
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
      <div
        className="flex-1 min-w-0 prose-lumina text-[15px] text-blue-300 rounded-xl px-4 py-3 border border-blue-400/20"
        style={{
          background: 'rgba(0,0,0,0.55)',
          boxShadow: '0 0 12px rgba(96,165,250,0.15), inset 0 0 20px rgba(96,165,250,0.04)',
          textShadow: '0 0 8px rgba(96,165,250,0.8), 0 0 20px rgba(96,165,250,0.4)'
        }}
      >
        <div className="flex gap-2 items-center mb-2 border-b border-blue-400/15 pb-2">
          <Zap className="w-3.5 h-3.5 text-blue-300 fill-blue-300" style={{filter: 'drop-shadow(0 0 6px rgba(96,165,250,0.9))'}} />
          <span className="text-[10px] uppercase tracking-[0.16em] text-blue-300/60 font-mono">Lumina</span>
        </div>
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
    </div>
  );
}