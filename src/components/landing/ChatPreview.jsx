import React from 'react';

const GENERATED_ART_URL = 'https://media.base44.com/images/public/69e5328eaec6aaf1216c9a71/2f774c623_generated_image.png';

// Product preview mock — the app's real design language: a dark agent chat
// window with a persona greeting and an image the agent generated.
export default function ChatPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md" aria-label="LBC AI Agent Chat Preview">
      <div aria-hidden="true" className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-pink-500/20 via-transparent to-purple-600/20 blur-xl" />
      <div className="relative rounded-2xl border border-white/10 bg-zinc-900/90 shadow-2xl overflow-hidden">
        {/* Window header */}
        <div className="flex items-center gap-2 px-4 h-11 border-b border-white/5 bg-zinc-900">
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" aria-hidden="true" />
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" aria-hidden="true" />
          <span className="ml-2 text-[11px] text-zinc-500 truncate">
            LBC AI — Nova, Strategic Advisor
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            Online
          </span>
        </div>

        {/* Conversation */}
        <div className="p-4 space-y-3 text-sm">
          <div className="flex">
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 px-4 py-2.5 text-zinc-200 leading-relaxed">
              Good Morning — I'm Nova, Your Strategic Advisor. What Are We Building Today?
            </div>
          </div>
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-pink-600/30 to-purple-600/30 border border-pink-500/20 px-4 py-2.5 text-zinc-100 leading-relaxed">
              Design A Bold Poster For Tonight's Drop — Pink And Purple.
            </div>
          </div>
          <div className="flex">
            <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 p-2.5 space-y-2">
              <img
                src={GENERATED_ART_URL}
                alt="Neon Crystal Lion Poster — An Image The LBC AI Agent Generated"
                className="w-full rounded-xl object-cover"
                loading="lazy"
              />
              <p className="px-1.5 pb-1 text-[11px] text-zinc-500 leading-relaxed">
                Done — Neon Crystal Lion, Hot Pink And Purple On Black. Want Any Variations?
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}