import React from 'react';

export default function LuminaMark({ size = 28, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="lumina-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="60%" stopColor="currentColor" stopOpacity="0.85" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="18" stroke="currentColor" strokeOpacity="0.25" strokeWidth="0.75" />
      <circle cx="20" cy="20" r="11" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.75" />
      <circle cx="20" cy="20" r="4" fill="url(#lumina-core)" />
    </svg>
  );
}