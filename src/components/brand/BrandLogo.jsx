import React from 'react';

// Shared LBC AI brand mark — the approved teal connected-node logo on black.
// Single reusable reference for all product identity surfaces. The black
// container is intentional (the source logo's own background), and
// object-contain keeps the original geometry, nodes and glow intact at every
// size. Never used for user avatars, agent avatars, or other products' logos.
export const BRAND_LOGO_URL = '/brand/lbc-builder-teal.v1.512.png';

export default function BrandLogo({ size = 28, className = '', alt = 'LBC AI', rounded = true }) {
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 overflow-hidden bg-black ${rounded ? 'rounded-lg' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={BRAND_LOGO_URL}
        alt={alt}
        width={size}
        height={size}
        className="w-full h-full object-contain"
        decoding="async"
      />
    </span>
  );
}