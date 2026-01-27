/**
 * SupplementsDaySheet - Layer 2 Supplements Overlay
 * Shows today's supplement status with timing groups and quick logging
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { 
  X, 
  Pill, 
  Check, 
  Settings, 
  Sunrise, 
  Sun, 
  Moon, 
  Dumbbell, 
  BedDouble,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useSupplementData, TIMING_OPTIONS, type UserSupplement } from '@/hooks/useSupplementData';

interface SupplementsDaySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogger: () => void;
}

// Map timing values to icons
const TIMING_ICONS: Record<string, React.ReactNode> = {
  morning: <Sunrise className="w-4 h-4" />,
  noon: <Sun className="w-4 h-4" />,
  evening: <Moon className="w-4 h-4" />,
  pre_workout: <Dumbbell className="w-4 h-4" />,
  post_workout: <Dumbbell className="w-4 h-4" />,
  before_bed: <BedDouble className="w-4 h-4" />
};

// Get current timing phase based on time of day
const getCurrentTimingPhase = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'noon';
  if (hour >= 14 && hour < 20) return 'evening';
  return 'before_bed';
};

// Timing phase order for display
const TIMING_ORDER = ['morning', 'noon', 'evening', 'pre_workout', 'post_workout', 'before_bed'];

export const SupplementsDaySheet: React.FC<SupplementsDaySheetProps> = ({
  isOpen,
  onClose,
  onOpenLogger
}) => {
  const navigate = useNavigate();
  const { 
    groupedSupplements, 
    markSupplementTaken,
    markTimingGroupTaken,
    totalScheduled,
    totalTaken,
    loading 
  } = useSupplementData();

  const currentPhase = getCurrentTimingPhase();

  // Get sorted timing groups (current phase first)
  const sortedTimings = useMemo(() => {
    const groups = Object.entries(groupedSupplements);
    if (groups.length === 0) return [];

    // Sort: current phase first, then by TIMING_ORDER
    return groups.sort(([a], [b]) => {
      if (a === currentPhase) return -1;
      if (b === currentPhase) return 1;
      return TIMING_ORDER.indexOf(a) - TIMING_ORDER.indexOf(b);
    });
  }, [groupedSupplements, currentPhase]);

  // Get label for timing
  const getTimingLabel = (timing: string): string => {
    const option = TIMING_OPTIONS.find(o => o.value === timing);
    return option?.label || timing;
  };

  // Handle individual supplement toggle
  const handleSupplementToggle = async (supplement: UserSupplement, timing: string, currentlyTaken: boolean) => {
    await markSupplementTaken(supplement.id, timing, !currentlyTaken);
  };

  // Handle "mark all as taken" for a timing group
  const handleMarkAllTaken = async (timing: string) => {
    await markTimingGroupTaken(timing);
  };

  const allComplete = totalScheduled > 0 && totalTaken === totalScheduled;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[60] h-[85vh] bg-background rounded-t-3xl border-t border-border/50 flex flex-col overflow-hidden"
          >
            {/* Handle Bar */}
            <div className="flex-none flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex-none flex items-center justify-between px-5 pb-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Supplemente heute</h2>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(), 'EEEE, d. MMMM yyyy', { locale: de })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full h-10 w-10"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 space-y-5 pb-4">
              
              {/* Hero Status */}
              <div className={cn(
                "p-5 rounded-2xl border",
                allComplete
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-cyan-500/10 border-cyan-500/30"
              )}>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center",
                    allComplete
                      ? "bg-emerald-500/20"
                      : "bg-cyan-500/20"
                  )}>
                    {allComplete ? (
                      <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                    ) : (
                      <Pill className={cn("w-7 h-7", allComplete ? "text-emerald-500" : "text-cyan-500")} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-foreground">
                      {allComplete ? 'Alle eingenommen!' : `${totalTaken}/${totalScheduled} eingenommen`}
                    </h3>
                    <p className={cn(
                      "text-sm",
                      allComplete ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                    )}>
                      {allComplete 
                        ? '✓ Super, du hast alle Supplements für heute genommen!'
                        : `Noch ${totalScheduled - totalTaken} offen`
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* Empty State */}
              {!loading && sortedTimings.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                    <Pill className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Keine Supplements konfiguriert
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Füge deine Supplements hinzu
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      onClose();
                      navigate('/supplements');
                    }}
                  >
                    <Pill className="w-4 h-4 mr-2" />
                    Stack einrichten
                  </Button>
                </div>
              )}

              {/* Timing Groups */}
              {!loading && sortedTimings.map(([timing, group], idx) => {
                const isCurrentPhase = timing === currentPhase;
                const groupComplete = group.taken === group.total;
                const icon = TIMING_ICONS[timing] || <Pill className="w-4 h-4" />;

                return (
                  <motion.div
                    key={timing}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="space-y-3"
                  >
                    {/* Timing Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "p-1.5 rounded-lg",
                          isCurrentPhase 
                            ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {icon}
                        </div>
                        <h3 className={cn(
                          "text-sm font-semibold",
                          isCurrentPhase ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {getTimingLabel(timing)}
                          {isCurrentPhase && (
                            <span className="ml-2 text-xs text-cyan-600 dark:text-cyan-400">
                              (Jetzt)
                            </span>
                          )}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full",
                          groupComplete
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {group.taken}/{group.total}
                        </span>
                        {!groupComplete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300"
                            onClick={() => handleMarkAllTaken(timing)}
                          >
                            Alle ✓
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Supplements List */}
                    <div className="bg-muted/20 rounded-2xl border border-border/30 overflow-hidden">
                      {group.supplements.map((supp, suppIdx) => {
                        const intake = group.intakes.find(i => i.user_supplement_id === supp.id);
                        const isTaken = intake?.taken || false;
                        const displayName = supp.custom_name || supp.supplement_name || 'Supplement';
                        const dosageInfo = supp.dosage ? `${supp.dosage} ${supp.unit || ''}`.trim() : null;

                        return (
                          <div
                            key={`${supp.id}-${timing}`}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 transition-colors",
                              suppIdx !== group.supplements.length - 1 && "border-b border-border/30",
                              isTaken && "bg-emerald-500/5"
                            )}
                          >
                            <Checkbox
                              id={`supp-${supp.id}-${timing}`}
                              checked={isTaken}
                              onCheckedChange={() => handleSupplementToggle(supp, timing, isTaken)}
                              className={cn(
                                "h-5 w-5",
                                isTaken && "data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <label
                                htmlFor={`supp-${supp.id}-${timing}`}
                                className={cn(
                                  "font-medium text-sm cursor-pointer block truncate",
                                  isTaken ? "text-muted-foreground line-through" : "text-foreground"
                                )}
                              >
                                {displayName}
                              </label>
                            </div>
                            {dosageInfo && (
                              <span className="text-xs text-muted-foreground shrink-0">
                                {dosageInfo}
                              </span>
                            )}
                            {isTaken && (
                              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Sticky Footer */}
            <div className="flex-none px-5 py-4 bg-gradient-to-t from-background via-background to-transparent border-t border-border/30">
              <div className="flex gap-3">
                <Button
                  onClick={onOpenLogger}
                  className="flex-1 h-12 rounded-xl font-semibold"
                >
                  <Pill className="w-4 h-4 mr-2" />
                  Quick Log
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 rounded-xl"
                  onClick={() => {
                    onClose();
                    navigate('/supplements');
                  }}
                  aria-label="Supplements verwalten"
                >
                  <Settings className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
