/**
 * CyclingStatusBadge - Visual indicator for supplement cycling status
 * 
 * 4 States:
 * 1. NORMAL - No cycling (null status)
 * 2. ON-CYCLE - Active phase (green ring, "Tag X/Y")
 * 3. OFF-CYCLE - Pause phase (greyed out, "Pause: Xd")
 * 4. TRANSITION - Last day of phase (pulsing animation)
 */

import React from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Pause, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { CycleStatus } from '@/lib/schedule-utils';

interface CyclingStatusBadgeProps {
  status: CycleStatus | null;
  supplementName?: string;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  className?: string;
}

export const CyclingStatusBadge: React.FC<CyclingStatusBadgeProps> = ({
  status,
  supplementName,
  size = 'sm',
  showProgress = false,
  className,
}) => {
  // No cycling = no badge
  if (!status) return null;

  const { isOnCycle, isTransitionDay, phaseLabel, progressPercent, daysRemaining } = status;

  // Size variants
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  // Transition day - pulsing animation
  if (isTransitionDay) {
    return (
      <motion.div
        animate={{ 
          scale: [1, 1.05, 1],
          opacity: [1, 0.8, 1],
        }}
        transition={{ 
          duration: 1.5, 
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={className}
      >
        <Badge 
          variant="secondary"
          className={cn(
            sizeClasses[size],
            'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
            'border border-amber-300 dark:border-amber-700',
          )}
        >
          <Zap className={cn(iconSizes[size], 'text-amber-500')} />
          <span className="font-medium">
            {isOnCycle ? 'Letzter Tag!' : 'Morgen aktiv!'}
          </span>
        </Badge>
      </motion.div>
    );
  }

  // On-Cycle - active phase
  if (isOnCycle) {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <Badge 
          variant="secondary"
          className={cn(
            sizeClasses[size],
            'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
            'border border-green-300 dark:border-green-700',
          )}
        >
          <RotateCcw className={cn(iconSizes[size], 'text-green-500')} />
          <span className="font-medium">{phaseLabel}</span>
        </Badge>
        
        {showProgress && (
          <Progress 
            value={progressPercent} 
            className="h-1 bg-green-100 dark:bg-green-900/30"
            indicatorClassName="bg-green-500"
          />
        )}
      </div>
    );
  }

  // Off-Cycle - pause phase
  return (
    <Badge 
      variant="secondary"
      className={cn(
        sizeClasses[size],
        'bg-muted/60 text-muted-foreground',
        'border border-border/50',
        className,
      )}
    >
      <Pause className={cn(iconSizes[size], 'opacity-60')} />
      <span className="font-medium opacity-70">{phaseLabel}</span>
    </Badge>
  );
};

/**
 * Compact version for chip integration
 */
export const CyclingStatusIndicator: React.FC<{
  status: CycleStatus | null;
  className?: string;
}> = ({ status, className }) => {
  if (!status) return null;

  const { isOnCycle, isTransitionDay, currentDay, totalDays, daysRemaining } = status;

  // Transition day - pulsing dot
  if (isTransitionDay) {
    return (
      <motion.span
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
        className={cn(
          'inline-flex items-center justify-center w-2 h-2 rounded-full bg-amber-500',
          className
        )}
      />
    );
  }

  // On-Cycle - green dot with progress
  if (isOnCycle) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400',
          className
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        {currentDay}/{totalDays}
      </span>
    );
  }

  // Off-Cycle - grey indicator
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/70',
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
      Off: {daysRemaining}d
    </span>
  );
};

export default CyclingStatusBadge;
