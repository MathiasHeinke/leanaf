/**
 * BioAgeBadge - Compact Bio-Age display
 * Shows biological age with delta from chronological age
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BioAgeBadgeProps {
  bioAge?: number | null;
  realAge?: number | null;
  className?: string;
}

export const BioAgeBadge: React.FC<BioAgeBadgeProps> = ({ 
  bioAge, 
  realAge,
  className 
}) => {
  // If no data, show placeholder
  if (!bioAge || !realAge) {
    return (
      <div className={cn("flex flex-col items-end", className)}>
        <div className="flex items-center gap-1.5 bg-card/80 backdrop-blur-sm border border-border/50 rounded-full px-3 py-1.5 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold text-muted-foreground">
            -- Jahre
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground mt-1 mr-1">
          Bio-Age
        </span>
      </div>
    );
  }

  const delta = realAge - bioAge;
  const isYounger = delta > 0;
  const deltaText = isYounger ? `-${delta.toFixed(1)}` : `+${Math.abs(delta).toFixed(1)}`;
  const deltaColor = isYounger ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400';
  const iconColor = isYounger ? 'text-emerald-500 fill-emerald-500' : 'text-orange-500';

  return (
    <div className={cn("flex flex-col items-end", className)}>
      <div className="flex items-center gap-1.5 bg-card/80 backdrop-blur-sm border border-border/50 rounded-full px-3 py-1.5 shadow-sm">
        <Sparkles className={cn("w-3.5 h-3.5", iconColor)} />
        <span className="text-sm font-bold text-foreground">
          {bioAge.toFixed(1)} Jahre
        </span>
      </div>
      <span className={cn("text-[10px] font-medium mt-1 mr-1", deltaColor)}>
        {deltaText} vs Real
      </span>
    </div>
  );
};
