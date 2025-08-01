import React from 'react';

interface TypingIndicatorProps {
  name: string;
}

export const TypingIndicator = ({ name }: TypingIndicatorProps) => (
  <div className="flex items-center gap-2 pl-10 py-1">
    <span className="text-xs text-muted-foreground">{name} schreibt</span>
    <div className="flex gap-1">
      <span 
        className="inline-block w-2 h-2 rounded-full bg-muted-foreground/60"
        style={{
          animation: 'pulse 1.2s ease-in-out infinite',
          animationDelay: '0.4s'
        }}
      />
      <span 
        className="inline-block w-2 h-2 rounded-full bg-muted-foreground/60"
        style={{
          animation: 'pulse 1.2s ease-in-out infinite',
          animationDelay: '0.2s'
        }}
      />
      <span 
        className="inline-block w-2 h-2 rounded-full bg-muted-foreground/60"
        style={{
          animation: 'pulse 1.2s ease-in-out infinite',
          animationDelay: '0s'
        }}
      />
    </div>
  </div>
);