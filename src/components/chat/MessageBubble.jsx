import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import BrandLogo from '@/components/brand/BrandLogo';
import CopyResponse from '@/components/chat/CopyResponse';
import markdownComponents from '@/components/chat/markdownComponents';
import { Download, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

function GeneratedImage({ url, caption }) {
  const [loaded, setLoaded] = useState(false);
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'image.png';
    a.target = '_blank';
    a.click();
  };
  return (
    <div className="space-y-3">
      <div className="relative rounded-2xl overflow-hidden border border-purple-400/25 shadow-[0_0_24px_rgba(20,184,166,0.10)]">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 text-pink-300 animate-spin" />
              <span className="text-xs text-pink-300/60 font-mono">Rendering…</span>
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
          <p className="text-[11px] text-muted-foreground/70 font-mono leading-relaxed flex-1 italic">{caption}</p>
          <button
            onClick={handleDownload}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-pink-300 border border-pink-400/25 hover:bg-pink-400/10 transition-colors"
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
      <div className={cn("flex justify-end", message.fresh && "animate-fade-up motion-reduce:animate-none")}>
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
            <div className="rounded-2xl rounded-tr-sm px-4 py-2.5 bg-gradient-to-br from-pink-500 to-purple-500">
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-white">{message.content}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isError = String(message.id).startsWith('error-');
  return (
    <div className={cn("flex gap-3 md:gap-4", message.fresh && "animate-fade-up motion-reduce:animate-none", isLatest && "mb-2")}>
      <div className="shrink-0 mt-0.5">
        <BrandLogo size={26} alt="LBC AI" />
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn(
          "prose-lumina text-[15px] leading-7 text-foreground/90 max-w-[68ch] break-words",
          isError && "text-destructive"
        )}>
          {isImageMessage
            ? <GeneratedImage url={imageUrl} caption={imageCaption} />
            : <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
          }
        </div>
        {!isImageMessage && !isError && message.content && <CopyResponse text={message.content} />}
      </div>
    </div>
  );
}