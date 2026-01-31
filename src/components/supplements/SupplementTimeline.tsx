import React, { useMemo, useState } from 'react';
import { Dumbbell, Sparkles, Zap, Check, PauseCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProtocolBundleCard } from './ProtocolBundleCard';
import { getCycleStatusForStackItem, isItemOffCycle } from '@/hooks/useCyclingStatus';
import { CyclingStatusBadge } from './CyclingStatusBadge';
import { CycleDetailSheet } from './CycleDetailSheet';
import {
  TIMELINE_SLOTS,
  type UserStackItem,
  type PreferredTiming,
} from '@/types/supplementLibrary';

interface TodayIntake {
  user_supplement_id: string;
  timing: string;
  taken: boolean;
}

interface SupplementTimelineProps {
  groupedByTiming: Record<PreferredTiming, UserStackItem[]>;
  todayIntakes?: TodayIntake[];
  onSupplementClick?: (supplement: UserStackItem) => void;
  onCompleteStack?: (timing: PreferredTiming, supplements: UserStackItem[]) => void;
  onLogStack?: (timing: PreferredTiming, supplementIds: string[]) => Promise<void>;
  onAutoActivateEssentials?: () => Promise<void>;
  onRefetch?: () => void;
  isActivating?: boolean;
}

// Map timing to bundle title
const TIMING_TITLES: Record<PreferredTiming, string> = {
  morning: 'Morning Protocol',
  noon: 'Midday Support',
  afternoon: 'Afternoon Boost',
  evening: 'Evening & Night Routine',
  pre_workout: 'Pre-Workout Stack',
  post_workout: 'Post-Workout Recovery',
};

/**
 * SupplementTimeline - Flow Tab (Premium UX v2)
 * Displays supplements grouped by time in Protocol Bundle Cards
 * with swipe-to-complete, haptic feedback, and onboarding nudge
 * 
 * SYNC FIX: Now derives completion state from todayIntakes (DB) instead of local state
 */
export const SupplementTimeline: React.FC<SupplementTimelineProps> = ({
  groupedByTiming,
  todayIntakes = [],
  onSupplementClick,
  onCompleteStack,
  onLogStack,
  onAutoActivateEssentials,
  onRefetch,
  isActivating,
}) => {
  // State for cycle detail sheet
  const [selectedCyclingSupplement, setSelectedCyclingSupplement] = useState<UserStackItem | null>(null);

  // Derive completed stacks from database intake logs (NOT local state)
  const completedStacks = useMemo(() => {
    const completed = new Set<PreferredTiming>();
    
    // Build map: timing -> Set<supplementId>
    const takenMap = new Map<string, Set<string>>();
    todayIntakes.forEach(intake => {
      if (!takenMap.has(intake.timing)) {
        takenMap.set(intake.timing, new Set());
      }
      takenMap.get(intake.timing)!.add(intake.user_supplement_id);
    });

    // Check if all supplements in each timing slot are taken
    Object.entries(groupedByTiming).forEach(([timing, supplements]) => {
      if (supplements && supplements.length > 0) {
        const takenInTiming = takenMap.get(timing) || new Set();
        const allTaken = supplements.every(s => takenInTiming.has(s.id));
        if (allTaken) {
          completed.add(timing as PreferredTiming);
        }
      }
    });

    return completed;
  }, [groupedByTiming, todayIntakes]);

  // Build set of taken supplement IDs for individual chip status
  const takenIds = useMemo(() => {
    return new Set(todayIntakes.map(i => i.user_supplement_id));
  }, [todayIntakes]);

  // Separate off-cycle supplements from the main timeline
  const { activeSupplements, offCycleSupplements } = useMemo(() => {
    const active: Record<PreferredTiming, UserStackItem[]> = {
      morning: [],
      noon: [],
      afternoon: [],
      evening: [],
      pre_workout: [],
      post_workout: [],
    };
    const offCycle: UserStackItem[] = [];
    
    Object.entries(groupedByTiming).forEach(([timing, supplements]) => {
      supplements?.forEach(supplement => {
        if (isItemOffCycle(supplement)) {
          offCycle.push(supplement);
        } else {
          active[timing as PreferredTiming].push(supplement);
        }
      });
    });
    
    return { activeSupplements: active, offCycleSupplements: offCycle };
  }, [groupedByTiming]);


  // Count total active supplements (excluding off-cycle)
  const totalActiveCount = useMemo(
    () => Object.values(activeSupplements).reduce((sum, items) => sum + (items?.length || 0), 0),
    [activeSupplements]
  );
  
  const totalCount = totalActiveCount + offCycleSupplements.length;

  // Handle stack completion - now logs to DB via parent
  const handleCompleteStack = async (timing: PreferredTiming) => {
    const supplements = groupedByTiming[timing] || [];
    
    // Log to DB if handler provided
    if (onLogStack) {
      await onLogStack(timing, supplements.map(s => s.id));
    }
    
    // Legacy callback for backwards compatibility
    onCompleteStack?.(timing, supplements);
  };

  // Filter slots that have active supplements (not off-cycle)
  const activeSlots = TIMELINE_SLOTS.filter(
    (slot) => (activeSupplements[slot.id]?.length || 0) > 0
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
          <span className="font-medium text-foreground">{totalActiveCount}</span>
          {' '}aktiv heute
          {offCycleSupplements.length > 0 && (
            <span className="text-xs opacity-70"> · {offCycleSupplements.length} pausiert</span>
          )}
        </div>
        <Badge variant="secondary" className="text-xs">
          {completedStacks.size}/{activeSlots.length} erledigt
        </Badge>
      </div>

      {/* Protocol Bundle Cards */}
      <div className="space-y-4">
        {activeSlots.map((slot) => {
          const supplements = activeSupplements[slot.id] || [];
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
              takenIds={takenIds}
              onCompleteStack={() => handleCompleteStack(slot.id)}
              onSupplementClick={onSupplementClick}
              onRefetch={onRefetch}
              isCompleted={isCompleted}
            />
          );
        })}
      </div>

      {/* Dynamic timings (pre/post workout) if any */}
      {((activeSupplements.pre_workout?.length || 0) > 0 ||
        (activeSupplements.post_workout?.length || 0) > 0) && (
        <div className="mt-6 pt-4 border-t border-border/50">
          <p className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2 px-1">
            <Dumbbell className="h-4 w-4" />
            Training-gebunden
          </p>
          <div className="space-y-4">
            {(activeSupplements.pre_workout?.length || 0) > 0 && (
              <ProtocolBundleCard
                title={TIMING_TITLES.pre_workout}
                timing="pre_workout"
                timeRange="30-60 min vor Training"
                supplements={activeSupplements.pre_workout || []}
                takenIds={takenIds}
                onCompleteStack={() => handleCompleteStack('pre_workout')}
                onSupplementClick={onSupplementClick}
                onRefetch={onRefetch}
                isCompleted={completedStacks.has('pre_workout')}
              />
            )}
            {(activeSupplements.post_workout?.length || 0) > 0 && (
              <ProtocolBundleCard
                title={TIMING_TITLES.post_workout}
                timing="post_workout"
                timeRange="Nach dem Training"
                supplements={activeSupplements.post_workout || []}
                takenIds={takenIds}
                onCompleteStack={() => handleCompleteStack('post_workout')}
                onSupplementClick={onSupplementClick}
                onRefetch={onRefetch}
                isCompleted={completedStacks.has('post_workout')}
              />
            )}
          </div>
        </div>
      )}

      {/* Off-Cycle Section */}
      {offCycleSupplements.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 px-1 mb-3">
            <PauseCircle className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">
              Pausiert (Off-Cycle)
            </p>
            <Badge variant="outline" className="text-xs">
              {offCycleSupplements.length}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2 px-1">
            {offCycleSupplements.map((supplement) => {
              const cycleStatus = getCycleStatusForStackItem(supplement);
              return (
                <button 
                  key={supplement.id}
                  onClick={() => setSelectedCyclingSupplement(supplement)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50 opacity-60 hover:opacity-80 hover:bg-muted/50 transition-all cursor-pointer"
                >
                  <span className="text-sm font-medium text-muted-foreground">
                    {supplement.name}
                  </span>
                  {cycleStatus && (
                    <CyclingStatusBadge status={cycleStatus} size="sm" />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2 px-1">
            Tippe auf ein Supplement für Cycle-Details.
          </p>
        </div>
      )}

      {/* Cycle Detail Sheet */}
      <CycleDetailSheet
        userSupplementId={selectedCyclingSupplement?.id}
        supplementName={selectedCyclingSupplement?.name || ''}
        isOpen={!!selectedCyclingSupplement}
        onClose={() => setSelectedCyclingSupplement(null)}
        onUpdate={onRefetch}
      />

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