/**
 * TimingCircleSelector - Circle-based timing selection for supplement edit mode
 * Mirrors the Layer 0 SupplementTimingCircles design for visual consistency
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Sunrise, Sun, Moon, Dumbbell, CloudSun, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PreferredTiming } from '@/types/supplementLibrary';

// Timing configuration with icons
const TIMING_CONFIG: Record<PreferredTiming, { 
  icon: LucideIcon; 
  label: string;
  shortLabel: string;
}> = {
  morning: { icon: Sunrise, label: 'Morgens', shortLabel: 'Mo' },
  noon: { icon: Sun, label: 'Mittags', shortLabel: 'Mi' },
  afternoon: { icon: CloudSun, label: 'Nachmittags', shortLabel: 'Na' },
  evening: { icon: Moon, label: 'Abends', shortLabel: 'Ab' },
  pre_workout: { icon: Dumbbell, label: 'Pre-WO', shortLabel: 'Pre' },
  post_workout: { icon: Dumbbell, label: 'Post-WO', shortLabel: 'Post' },
};

// Default timing order (no bedtime)
const DEFAULT_TIMINGS: PreferredTiming[] = [
  'morning', 'noon', 'evening', 'pre_workout', 'post_workout'
];

interface TimingCircleProps {
  timing: PreferredTiming;
  isSelected: boolean;
  onClick: () => void;
  size: 'sm' | 'md';
}

const TimingCircle: React.FC<TimingCircleProps> = ({
  timing,
  isSelected,
  onClick,
  size,
}) => {
  const config = TIMING_CONFIG[timing];
  const Icon = config.icon;
  
  const sizeClasses = size === 'sm' 
    ? 'w-9 h-9' 
    : 'w-11 h-11';
  
  const iconSize = size === 'sm' ? 16 : 18;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      className={cn(
        "relative flex flex-col items-center gap-1 transition-all focus:outline-none"
      )}
    >
      {/* Circle */}
      <div
        className={cn(
          sizeClasses,
          "rounded-full flex items-center justify-center transition-all border-2",
          isSelected 
            ? "bg-primary/10 border-primary" 
            : "bg-muted/30 border-border hover:border-muted-foreground/50"
        )}
      >
        <Icon 
          size={iconSize} 
          className={cn(
            "transition-colors",
            isSelected ? "text-primary" : "text-muted-foreground"
          )} 
        />
      </div>
      
      {/* Label below circle */}
      <span className={cn(
        "text-[10px] font-medium transition-colors",
        isSelected ? "text-primary" : "text-muted-foreground"
      )}>
        {config.shortLabel}
      </span>
    </motion.button>
  );
};

export interface TimingCircleSelectorProps {
  value: PreferredTiming;
  onChange: (timing: PreferredTiming) => void;
  availableTimings?: PreferredTiming[];
  size?: 'sm' | 'md';
  className?: string;
}

export const TimingCircleSelector: React.FC<TimingCircleSelectorProps> = ({
  value,
  onChange,
  availableTimings = DEFAULT_TIMINGS,
  size = 'md',
  className,
}) => {
  return (
    <div className={cn("flex items-start gap-3 flex-wrap", className)}>
      {availableTimings.map((timing) => (
        <TimingCircle
          key={timing}
          timing={timing}
          isSelected={value === timing}
          onClick={() => onChange(timing)}
          size={size}
        />
      ))}
    </div>
  );
};

export default TimingCircleSelector;
