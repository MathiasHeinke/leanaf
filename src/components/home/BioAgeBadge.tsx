/**
 * BioAgeBadge - Premium Bio-Age display with Aging Pace
 * Shows biological age with delta and aging speed indicator
 */

import React from 'react';
import { Sparkles, User, TrendingDown, TrendingUp, Minus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BioAgeBadgeProps {
  bioAge?: number | null;
  realAge?: number | null;
  chronologicalAge?: number | null;
  agingPace?: number | null; // 0.85 = 15% langsamer, 1.15 = 15% schneller
  loading?: boolean;
  className?: string;
}

// Get aging pace status and color
const getPaceStatus = (pace: number): { label: string; color: string; bgColor: string } => {
  if (pace <= 0.65) return { 
    label: 'Elite', 
    color: 'text-emerald-500', 
    bgColor: 'bg-emerald-500/10' 
  };
  if (pace <= 0.80) return { 
    label: 'Excellent', 
    color: 'text-teal-500', 
    bgColor: 'bg-teal-500/10' 
  };
  if (pace <= 0.95) return { 
    label: 'Gut', 
    color: 'text-blue-500', 
    bgColor: 'bg-blue-500/10' 
  };
  if (pace <= 1.05) return { 
    label: 'Durchschnitt', 
    color: 'text-amber-500', 
    bgColor: 'bg-amber-500/10' 
  };
  return { 
    label: 'Beschleunigt', 
    color: 'text-orange-500', 
    bgColor: 'bg-orange-500/10' 
  };
};

export const BioAgeBadge: React.FC<BioAgeBadgeProps> = ({ 
  bioAge, 
  realAge,
  chronologicalAge,
  agingPace,
  loading = false,
  className 
}) => {
  // Loading state
  if (loading) {
    return (
      <div className={cn("flex flex-col items-end", className)}>
        <div className="flex items-center gap-1.5 bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl px-3 py-2 shadow-sm">
          <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
          <span className="text-sm text-muted-foreground">...</span>
        </div>
      </div>
    );
  }

  // If no bio-age but we have chronological age, show that as fallback
  if (!bioAge && chronologicalAge) {
    return (
      <div className={cn("flex flex-col items-end", className)}>
        <div className="flex items-center gap-1.5 bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl px-3 py-2 shadow-sm">
          <User className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">
            {chronologicalAge} J
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground mt-1 mr-1">
          Alter
        </span>
      </div>
    );
  }

  // If no data at all, show placeholder
  if (!bioAge || !realAge) {
    return (
      <div className={cn("flex flex-col items-end", className)}>
        <div className="flex items-center gap-1.5 bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl px-3 py-2 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            --
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground mt-1 mr-1">
          Bio-Age
        </span>
      </div>
    );
  }

  // Full bio-age display with delta and pace
  const delta = realAge - bioAge;
  const isYounger = delta > 0;
  const deltaAbs = Math.abs(delta);
  
  // Delta colors
  const deltaColor = isYounger 
    ? 'text-emerald-600 dark:text-emerald-400' 
    : 'text-orange-600 dark:text-orange-400';
  const iconColor = isYounger 
    ? 'text-emerald-500' 
    : 'text-orange-500';
  
  // Pace status
  const paceStatus = agingPace ? getPaceStatus(agingPace) : null;

  return (
    <div className={cn("flex flex-col items-end gap-0.5", className)}>
      {/* Main Bio-Age Badge */}
      <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl px-3 py-1.5 shadow-sm">
        <Sparkles className={cn("w-3.5 h-3.5", iconColor)} />
        <span className="text-sm font-bold text-foreground">
          {Math.round(bioAge)} J
        </span>
        
        {/* Delta Badge */}
        <div className={cn("flex items-center gap-0.5 text-xs font-medium", deltaColor)}>
          {isYounger ? (
            <TrendingDown className="w-3 h-3" />
          ) : deltaAbs === 0 ? (
            <Minus className="w-3 h-3" />
          ) : (
            <TrendingUp className="w-3 h-3" />
          )}
          <span>
            {isYounger ? '-' : '+'}{deltaAbs.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Aging Pace Row */}
      {paceStatus && agingPace && (
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-medium",
          paceStatus.bgColor,
          paceStatus.color
        )}>
          <span>Pace {agingPace.toFixed(2)}</span>
          <span className="opacity-70">·</span>
          <span>{paceStatus.label}</span>
        </div>
      )}
    </div>
  );
};
