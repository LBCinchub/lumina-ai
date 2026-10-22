import React from 'react';
import { Link } from 'react-router-dom';
import { Search, ImageIcon, Zap, Database } from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';

const chip = 'inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border border-border bg-card text-sm text-foreground/85 hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

// Compact welcome with shortcuts to features that already exist.
export default function ChatEmptyState({ opener, hasContext, onDeepSearch, onImage }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-5 py-10 motion-safe:animate-fade-up">
      <BrandLogo size={40} alt="LBC AI" className="mb-5" />
      <h1 className="font-serif text-2xl md:text-3xl tracking-tight text-center mb-2 max-w-lg">{opener}</h1>
      <p className="text-sm text-muted-foreground text-center max-w-sm">Converse, Build, And Grow With LBC AI.</p>
      <div className="flex flex-wrap justify-center gap-2 mt-7 max-w-lg">
        <button onClick={onDeepSearch} className={chip}><Search className="w-4 h-4" aria-hidden="true" />Deep Search</button>
        <button onClick={onImage} className={chip}><ImageIcon className="w-4 h-4" aria-hidden="true" />Image Studio</button>
        <Link to="/autopilot" className={chip}><Zap className="w-4 h-4" aria-hidden="true" />Start An Autopilot Task</Link>
        {hasContext === false && <Link to="/knowledge" className={chip}><Database className="w-4 h-4" aria-hidden="true" />Build Your Context</Link>}
      </div>
    </div>
  );
}