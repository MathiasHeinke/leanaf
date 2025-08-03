import React, { useEffect, useState } from 'react';

interface ProgressIndicatorProps {
  isActive: boolean;
  text?: string;
  estimatedDuration?: number; // in seconds
}

export const ProgressIndicator = ({ 
  isActive, 
  text = "Denkt nach...", 
  estimatedDuration = 8 
}: ProgressIndicatorProps) => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (!isActive) {
      setProgress(0);
      return;
    }
    
    const interval = setInterval(() => {
      setProgress(prev => {
        // Slow down as we approach 100% to avoid hitting 100% too early
        const increment = prev < 70 ? 2 : prev < 90 ? 1 : 0.5;
        return Math.min(prev + increment, 95); // Never quite reach 100%
      });
    }, (estimatedDuration * 1000) / 100);
    
    return () => clearInterval(interval);
  }, [isActive, estimatedDuration]);
  
  // Complete immediately when isActive becomes false
  useEffect(() => {
    if (!isActive && progress > 0) {
      setProgress(100);
      setTimeout(() => setProgress(0), 500);
    }
  }, [isActive, progress]);
  
  if (!isActive && progress === 0) return null;
  
  return (
    <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">{text}</span>
      </div>
      
      <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <span className="text-xs text-muted-foreground tabular-nums min-w-[3ch]">
        {Math.round(progress)}%
      </span>
    </div>
  );
};