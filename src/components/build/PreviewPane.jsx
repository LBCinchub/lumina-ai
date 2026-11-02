import React from 'react';
import { Loader } from 'lucide-react';
import LuminaMark from '@/components/layout/LuminaMark';
import { cn } from '@/lib/utils';

const WIDTH = { desktop: '100%', tablet: '768px', mobile: '390px' };

// Live preview of the generated page. The HTML runs in a sandboxed iframe with
// an opaque origin (scripts only), so it can never reach this app's session.
// The design image is shown only until a live page exists.
export default function PreviewPane({ html, imageUrl, loading, deviceMode, refreshKey }) {
  const framed = deviceMode !== 'desktop';

  if (!html && !imageUrl) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/60 text-sm">
        {loading
          ? <Loader className="w-6 h-6 mb-4 animate-spin text-primary" />
          : <LuminaMark size={48} className="mb-4 opacity-40" />}
        <p>{loading ? 'Designing And Building Your Page…' : 'Your app will appear here'}</p>
      </div>
    );
  }

  return (
    <div className={cn('flex-1 min-h-0 flex flex-col items-center relative overflow-auto', framed && 'bg-muted/20 p-4')}>
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm text-sm text-muted-foreground">
          <Loader className="w-6 h-6 animate-spin text-primary" />
          Updating Your Page…
        </div>
      )}
      {html ? (
        <iframe
          key={refreshKey}
          srcDoc={html}
          title="Live preview"
          sandbox="allow-scripts"
          className={cn('flex-1 w-full border-0', framed && 'rounded-lg shadow-xl')}
          style={{ maxWidth: WIDTH[deviceMode] || '100%' }}
        />
      ) : (
        <img src={imageUrl} alt="Design" className="m-auto max-w-full h-auto rounded-lg shadow-lg" />
      )}
    </div>
  );
}