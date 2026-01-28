import React, { useState, useMemo } from 'react';
import { Clock, Dumbbell, Sparkles, Zap, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  onAutoActivateEssentials?: () => Promise<void>;
  isActivating?: boolean;
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
 * SupplementTimeline - Flow Tab (Premium UX v2)
 * Displays supplements grouped by time in Protocol Bundle Cards
 * with swipe-to-complete, haptic feedback, and onboarding nudge
 */
export const SupplementTimeline: React.FC<SupplementTimelineProps> = ({
  groupedByTiming,
  onSupplementClick,
  onCompleteStack,
  onAutoActivateEssentials,
  isActivating,
}) => {
  // Track completed stacks (local state for UI)
  const [completedStacks, setCompletedStacks] = useState<Set<PreferredTiming>>(new Set());

  // Count total supplements
  const totalCount = useMemo(
    () => Object.values(groupedByTiming).reduce((sum, items) => sum + (items?.length || 0), 0),
    [groupedByTiming]
  );

  // Handle stack completion
  const handleCompleteStack = (timing: PreferredTiming) => {
    haptics.success();
    setCompletedStacks((prev) => new Set([...prev, timing]));

    const supplements = groupedByTiming[timing] || [];
    onCompleteStack?.(timing, supplements);
  };

  // Filter slots that have supplements
  const activeSlots = TIMELINE_SLOTS.filter(
    (slot) => (groupedByTiming[slot.id]?.length || 0) > 0
  );

  // Check if all stacks are completed
  const allCompleted = activeSlots.length > 0 && activeSlots.every((slot) => completedStacks.has(slot.id));

  // Empty state with onboarding nudge
  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-semibold mb-1">Dein Stack ist leer</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-[240px]">
          Starte mit den Essentials - wissenschaftlich fundiert für optimale Gesundheit.
        </p>
        {onAutoActivateEssentials && (
          <Button
            onClick={onAutoActivateEssentials}
            disabled={isActivating}
            className="gap-2"
          >
            <Zap className="h-4 w-4" />
            {isActivating ? 'Wird aktiviert...' : 'Essentials aktivieren'}
          </Button>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          Oder wechsle zum Protokoll-Tab für manuelle Auswahl
        </p>
      </div>
    );
  }

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

          // Skip workout-related slots here (they're shown separately below)
          if (slot.id === 'pre_workout' || slot.id === 'post_workout') return null;

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
      {((groupedByTiming.pre_workout?.length || 0) > 0 ||
        (groupedByTiming.post_workout?.length || 0) > 0) && (
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

      {/* All Done Celebration */}
      {allCompleted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="h-8 w-8 text-green-500" />
          </div>
          <h3 className="font-semibold text-green-600">Day Complete!</h3>
          <p className="text-sm text-muted-foreground">Maximale Absorption erreicht.</p>
        </motion.div>
      )}
    </div>
  );
};

export default SupplementTimeline;
