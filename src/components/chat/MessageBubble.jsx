import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import LuminaMark from '@/components/layout/LuminaMark';
import { Zap, Download, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

function GeneratedImage({ url, caption }) {
  const [loaded, setLoaded] = useState(false);
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'luna-image.png';
    a.target = '_blank';
    a.click();
  };
  return (
    <div className="space-y-3">
      <div className="relative rounded-2xl overflow-hidden border border-blue-400/20 shadow-[0_0_30px_rgba(96,165,250,0.15)]">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 text-blue-300 animate-spin" />
              <span className="text-xs text-blue-300/60 font-mono">Rendering…</span>
            </div>
          </div>
        )}
        <img
          src={url}
          alt="Generated"
          onLoad={() => setLoaded(true)}
          className={cn("w-full max-w-lg rounded-2xl object-cover transition-opacity duration-500", loaded ? "opacity-100" : "opacity-0")}
        />
      </div>
      {loaded && (
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] text-blue-300/50 font-mono leading-relaxed flex-1 italic">{caption}</p>
          <button
            onClick={handleDownload}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-blue-300 border border-blue-400/20 hover:bg-blue-400/10 transition-colors"
          >
            <Download className="w-3 h-3" /> Save
          </button>
        </div>
      )}
    </div>
  );
}

export default function MessageBubble({ message, isLatest }) {
  const isUser = message.role === 'user';
  const isImageMessage = !isUser && message.content?.startsWith('__IMAGE__');
  let imageUrl = null, imageCaption = null;
  if (isImageMessage) {
    const parts = message.content.split('__CAPTION__');
    imageUrl = parts[0].replace('__IMAGE__', '').trim();
    imageCaption = parts[1]?.trim() || '';
  }

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
          <span className="text-[10px] uppercase tracking-[0.16em] text-blue-300/60 font-mono">Luna</span>
        </div>
        {isImageMessage
          ? <GeneratedImage url={imageUrl} caption={imageCaption} />
          : <ReactMarkdown>{message.content}</ReactMarkdown>
        }
      </div>
    </div>
  );
}