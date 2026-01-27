/**
 * SupplementTimingCircles - Visual timing phase circles for supplement tracking
 * Shows all user's supplement timings as interactive circles
 * Current phase: white pulsing border, Completed: white checkmark, Pending: grayed out
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sunrise, Sun, Moon, Dumbbell, BedDouble, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSupplementData, TimeGroupedSupplements } from '@/hooks/useSupplementData';
import { toast } from 'sonner';

// Timing order for display
const TIMING_ORDER = ['morning', 'noon', 'evening', 'pre_workout', 'post_workout', 'before_bed'] as const;

// Timing configuration
const TIMING_CONFIG: Record<string, { icon: LucideIcon; label: string }> = {
  morning: { icon: Sunrise, label: 'Morgens' },
  noon: { icon: Sun, label: 'Mittags' },
  evening: { icon: Moon, label: 'Abends' },
  pre_workout: { icon: Dumbbell, label: 'Pre-WO' },
  post_workout: { icon: Dumbbell, label: 'Post-WO' },
  before_bed: { icon: BedDouble, label: 'Vor Schlaf' },
};

// Get current timing based on hour
const getCurrentTimingPhase = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'noon';
  if (hour >= 14 && hour < 17) return 'pre_workout'; // afternoon = potential workout time
  if (hour >= 17 && hour < 21) return 'evening';
  return 'before_bed';
};

interface TimingCircleProps {
  timing: string;
  isComplete: boolean;
  isCurrent: boolean;
  supplementCount: number;
  takenCount: number;
  onLog: () => void;
  disabled?: boolean;
}

const TimingCircle: React.FC<TimingCircleProps> = ({
  timing,
  isComplete,
  isCurrent,
  supplementCount,
  takenCount,
  onLog,
  disabled,
}) => {
  const [isLogging, setIsLogging] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
  const config = TIMING_CONFIG[timing] || { icon: Sun, label: timing };
  const Icon = config.icon;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isComplete || disabled || isLogging) return;
    
    // Show label briefly on tap
    setShowLabel(true);
    setTimeout(() => setShowLabel(false), 1500);
    
    setIsLogging(true);
    await onLog();
    setIsLogging(false);
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={isComplete || disabled || isLogging}
      whileTap={{ scale: isComplete ? 1 : 0.9 }}
      className={cn(
        "relative flex items-center justify-center transition-all",
        isComplete && "cursor-default",
        !isComplete && !disabled && "cursor-pointer",
      )}
    >
      {/* Circle - no label underneath */}
      <div
        className={cn(
          "w-11 h-11 rounded-full flex items-center justify-center transition-all border-2",
          isComplete && "bg-white border-white",
          isCurrent && !isComplete && "border-white bg-transparent animate-pulse",
          !isCurrent && !isComplete && "border-white/30 bg-white/10 opacity-50"
        )}
      >
        <AnimatePresence mode="wait">
          {isComplete ? (
            <motion.div
              key="check"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Check size={20} className="text-cyan-600" strokeWidth={3} />
            </motion.div>
          ) : isLogging ? (
            <motion.div
              key="loading"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
            />
          ) : (
            <motion.div key="icon">
              <Icon 
                size={18} 
                className={cn(
                  "transition-colors",
                  isCurrent ? "text-white" : "text-white/60"
                )} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Label - only visible on tap */}
      <AnimatePresence>
        {showLabel && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.9 }}
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 
                       bg-black/80 backdrop-blur-sm rounded text-[9px] font-medium 
                       text-white whitespace-nowrap z-30"
          >
            {config.label}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Count badge - only show if multiple supplements */}
      {supplementCount > 1 && (
        <span className={cn(
          "absolute -top-1 -right-1 text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center",
          isComplete ? "bg-emerald-500 text-white" : "bg-white/20 text-white/80"
        )}>
          {isComplete ? supplementCount : `${takenCount}/${supplementCount}`}
        </span>
      )}
    </motion.button>
  );
};

interface SupplementTimingCirclesProps {
  onComplete?: () => void;
  compact?: boolean;
}

export const SupplementTimingCircles: React.FC<SupplementTimingCirclesProps> = ({ 
  onComplete,
  compact = false
}) => {
  const { groupedSupplements, markTimingGroupTaken, loading } = useSupplementData();
  
  // Get user's active timings sorted
  const activeTimings = TIMING_ORDER.filter(timing => groupedSupplements[timing]?.total > 0);
  
  // Current timing phase
  const currentTiming = getCurrentTimingPhase();
  
  // Check if all timings are complete
  const allComplete = activeTimings.every(timing => {
    const group = groupedSupplements[timing];
    return group && group.taken >= group.total;
  });

  const handleLogTiming = async (timing: string) => {
    try {
      await markTimingGroupTaken(timing, true);
      
      const config = TIMING_CONFIG[timing];
      const group = groupedSupplements[timing];
      const count = group?.total || 0;
      
      toast.success(`${config?.label || timing} Supplements ✓`, {
        description: `${count} Supplement${count > 1 ? 's' : ''} eingenommen`
      });
      
      // Award XP
      window.dispatchEvent(new CustomEvent('ares-xp-awarded', { 
        detail: { amount: 15, reason: `${config?.label} Supps` }
      }));
      
      // Check if this was the last incomplete timing
      const remainingIncomplete = activeTimings.filter(t => {
        if (t === timing) return false;
        const g = groupedSupplements[t];
        return g && g.taken < g.total;
      });
      
      if (remainingIncomplete.length === 0 && onComplete) {
        // All done - bonus XP
        window.dispatchEvent(new CustomEvent('ares-xp-awarded', { 
          detail: { amount: 25, reason: 'Alle Supps erledigt!' }
        }));
        onComplete();
      }
    } catch (err) {
      console.error('Failed to log timing:', err);
      toast.error('Konnte Supplements nicht speichern');
    }
  };

  if (loading) {
    return (
      <div className="flex gap-2 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="w-10 h-10 rounded-full bg-white/20" />
        ))}
      </div>
    );
  }

  if (activeTimings.length === 0) {
    return (
      <div className="text-white/60 text-sm">
        Keine Supplements konfiguriert
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center",
      compact ? "gap-1" : "gap-2"
    )}>
      {activeTimings.map(timing => {
        const group = groupedSupplements[timing];
        const isComplete = group.taken >= group.total;
        const isCurrent = timing === currentTiming || 
          // Also highlight next incomplete if current is done
          (!isComplete && activeTimings.find(t => 
            groupedSupplements[t].taken < groupedSupplements[t].total
          ) === timing);
        
        return (
          <TimingCircle
            key={timing}
            timing={timing}
            isComplete={isComplete}
            isCurrent={isCurrent}
            supplementCount={group.total}
            takenCount={group.taken}
            onLog={() => handleLogTiming(timing)}
          />
        );
      })}
    </div>
  );
};
