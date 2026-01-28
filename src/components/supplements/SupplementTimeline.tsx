import React, { useState, useMemo } from 'react';
import { Clock, Dumbbell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ProtocolBundleCard } from './ProtocolBundleCard';
import { haptics } from '@/lib/haptics';
import { 
  TIMELINE_SLOTS, 
  type UserStackItem,
  type PreferredTiming,
} from '@/types/supplementLibrary';

interface SupplementTimelineProps {
  groupedByTiming: Record<PreferredTiming, UserStackItem[]>;
  onSupplementClick?: (supplement: UserStackItem) => void;
  onCompleteStack?: (timing: PreferredTiming, supplements: UserStackItem[]) => void;
}

// Map timing to bundle title
const TIMING_TITLES: Record<PreferredTiming, string> = {
  morning: 'Morning Protocol',
  noon: 'Midday Support',
  afternoon: 'Afternoon Boost',
  evening: 'Evening Routine',
  bedtime: 'Night Recovery',
  pre_workout: 'Pre-Workout Stack',
  post_workout: 'Post-Workout Recovery',
};

/**
 * SupplementTimeline - Premium UX v2
 * Displays supplements grouped by time in Protocol Bundle Cards
 * with swipe-to-complete and haptic feedback
 */
export const SupplementTimeline: React.FC<SupplementTimelineProps> = ({
  groupedByTiming,
  onSupplementClick,
  onCompleteStack,
}) => {
  // Track completed stacks (local state for UI)
  const [completedStacks, setCompletedStacks] = useState<Set<PreferredTiming>>(new Set());
  
  // Count total supplements
  const totalCount = useMemo(() => 
    Object.values(groupedByTiming).reduce((sum, items) => sum + items.length, 0),
    [groupedByTiming]
  );

  // Handle stack completion
  const handleCompleteStack = (timing: PreferredTiming) => {
    haptics.success();
    setCompletedStacks(prev => new Set([...prev, timing]));
    
    const supplements = groupedByTiming[timing] || [];
    onCompleteStack?.(timing, supplements);
  };

  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">
          Keine aktiven Supplements
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Füge Supplements hinzu, um deinen Tagesplan zu sehen
        </p>
      </div>
    );
  }

  // Filter slots that have supplements
  const activeSlots = TIMELINE_SLOTS.filter(
    slot => (groupedByTiming[slot.id] || []).length > 0
  );

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between px-1">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{totalCount}</span>
          {' '}Supplements heute
        </div>
        <Badge variant="secondary" className="text-xs">
          {completedStacks.size}/{activeSlots.length} erledigt
        </Badge>
      </div>

      {/* Protocol Bundle Cards */}
      <div className="space-y-4">
        {activeSlots.map((slot) => {
          const supplements = groupedByTiming[slot.id] || [];
          const isCompleted = completedStacks.has(slot.id);

          return (
            <ProtocolBundleCard
              key={slot.id}
              title={TIMING_TITLES[slot.id]}
              timing={slot.id}
              timeRange={slot.timeRange}
              supplements={supplements}
              onCompleteStack={() => handleCompleteStack(slot.id)}
              onSupplementClick={onSupplementClick}
              isCompleted={isCompleted}
            />
          );
        })}
      </div>

      {/* Dynamic timings (pre/post workout) if any */}
      {((groupedByTiming.pre_workout?.length || 0) > 0 || (groupedByTiming.post_workout?.length || 0) > 0) && (
        <div className="mt-6 pt-4 border-t border-border/50">
          <p className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2 px-1">
            <Dumbbell className="h-4 w-4" />
            Training-gebunden
          </p>
          <div className="space-y-4">
            {(groupedByTiming.pre_workout?.length || 0) > 0 && (
              <ProtocolBundleCard
                title={TIMING_TITLES.pre_workout}
                timing="pre_workout"
                timeRange="30-60 min vor Training"
                supplements={groupedByTiming.pre_workout || []}
                onCompleteStack={() => handleCompleteStack('pre_workout')}
                onSupplementClick={onSupplementClick}
                isCompleted={completedStacks.has('pre_workout')}
              />
            )}
            {(groupedByTiming.post_workout?.length || 0) > 0 && (
              <ProtocolBundleCard
                title={TIMING_TITLES.post_workout}
                timing="post_workout"
                timeRange="Nach dem Training"
                supplements={groupedByTiming.post_workout || []}
                onCompleteStack={() => handleCompleteStack('post_workout')}
                onSupplementClick={onSupplementClick}
                isCompleted={completedStacks.has('post_workout')}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplementTimeline;
