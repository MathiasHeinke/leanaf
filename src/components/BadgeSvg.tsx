import React from 'react';

export const BadgeSvg = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="10" fill="hsl(var(--primary))" />
    <circle cx="12" cy="12" r="6" fill="hsl(var(--primary-foreground))" />
    <circle cx="12" cy="10" r="3" fill="hsl(var(--primary))" />
    <path 
      d="M7 19.5C8.5 16.5 10 15 12 15C14 15 15.5 16.5 17 19.5" 
      stroke="hsl(var(--primary))" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
    />
  </svg>
);