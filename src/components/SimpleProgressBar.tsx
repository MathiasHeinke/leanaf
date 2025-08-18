import React from 'react';

interface SimpleProgressBarProps {
  isVisible: boolean;
  progress: number; // 0-100
}

export const SimpleProgressBar = ({ isVisible, progress }: SimpleProgressBarProps) => {
  if (!isVisible) return null;

  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="absolute top-0 left-0 right-0 h-0.5 bg-muted/30 overflow-hidden rounded-t-full">
      <div 
        className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary transition-all duration-300 ease-out animate-pulse"
        style={{ 
          width: `${clampedProgress}%`
        }}
      />
    </div>
  );
};