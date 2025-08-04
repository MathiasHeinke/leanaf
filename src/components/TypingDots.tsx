import React from 'react';

export const TypingDots = () => (
  <span className="flex ml-1">
    {[0, 1, 2].map(i => (
      <span 
        key={i}
        className="w-1 h-1 bg-muted-foreground/60 rounded-full mx-[1px] animate-bounce"
        style={{ animationDelay: `${i * 0.15}s` }} 
      />
    ))}
  </span>
);