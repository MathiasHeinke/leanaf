/**
 * MacroBar - Single macro progress bar
 * Clean, minimal design with percentage
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  color: string;
  warning?: boolean;
}

export const MacroBar: React.FC<MacroBarProps> = ({ 
  label, 
  current, 
  target, 
  color,
  warning 
}) => {
  const percentage = Math.min((current / target) * 100, 100);
  const isOver = current > target;

  return (
    <div className="flex items-center gap-3">
      <div className="w-14 text-xs font-medium text-muted-foreground">
        {label}
      </div>
      
      <div className="flex-1 h-2 bg-secondary/50 dark:bg-secondary/30 rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-500",
            color,
            warning && !isOver && "animate-pulse",
            isOver && "bg-destructive"
          )}
          style={{ width: `${percentage}%` }} 
        />
      </div>
      
      <div className={cn(
        "w-12 text-[11px] text-right font-medium",
        isOver ? "text-destructive" : "text-muted-foreground"
      )}>
        {current}/{target}g
      </div>
    </div>
  );
};
