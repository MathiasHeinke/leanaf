/**
 * PeptidesWidget - Layer 1 Widget for peptide tracking
 * Shows today's peptide schedule with stacking, status, and inventory warnings
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Syringe, Check, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import { useProtocols } from '@/hooks/useProtocols';
import { useIntakeLog } from '@/hooks/useIntakeLog';
import { cn } from '@/lib/utils';
import { WidgetSize } from '@/types/widgets';

interface PeptidesWidgetProps {
  size: WidgetSize;
  onOpenSheet?: () => void;
}

// Timing display labels
const TIMING_LABELS: Record<string, { label: string; time: string }> = {
  morning_fasted: { label: 'Morgens', time: '08:00' },
  evening_fasted: { label: 'Abends', time: '20:00' },
  pre_workout: { label: 'Pre-Workout', time: '16:00' },
  post_workout: { label: 'Post-Workout', time: '17:00' },
  bedtime: { label: 'Schlafenszeit', time: '22:00' },
};

interface StackGroup {
  timing: string;
  label: string;
  time: string;
  protocols: Array<{
    id: string;
    name: string;
    peptideName: string;
    dose: number;
    unit: string;
    isTaken: boolean;
    isLowInventory: boolean;
    remaining: number;
    total: number;
  }>;
  allTaken: boolean;
  hasLowInventory: boolean;
}

export const PeptidesWidget: React.FC<PeptidesWidgetProps> = ({ size, onOpenSheet }) => {
  const { protocols, loading: protocolsLoading } = useProtocols();
  const { isPeptideTakenToday, loading: logsLoading } = useIntakeLog();

  const activeProtocols = useMemo(() => 
    protocols.filter(p => p.is_active && p.peptides.length > 0),
    [protocols]
  );

  // Group protocols by timing (stacking)
  const stacks = useMemo((): StackGroup[] => {
    const grouped = new Map<string, StackGroup>();
    
    activeProtocols.forEach(protocol => {
      const timing = protocol.timing || 'evening_fasted';
      const timingInfo = TIMING_LABELS[timing] || { label: timing, time: '20:00' };
      const peptide = protocol.peptides[0];
      if (!peptide) return;

      const isTaken = isPeptideTakenToday(protocol.id, peptide.name);

      if (!grouped.has(timing)) {
        grouped.set(timing, {
          timing,
          label: timingInfo.label,
          time: timingInfo.time,
          protocols: [],
          allTaken: true,
          hasLowInventory: false,
        });
      }

      const stack = grouped.get(timing)!;
      stack.protocols.push({
        id: protocol.id,
        name: protocol.name,
        peptideName: peptide.name,
        dose: peptide.dose,
        unit: peptide.unit,
        isTaken,
        isLowInventory: protocol.isLowInventory,
        remaining: protocol.vial_remaining_doses,
        total: protocol.vial_total_doses,
      });

      if (!isTaken) stack.allTaken = false;
      if (protocol.isLowInventory) stack.hasLowInventory = true;
    });

    // Sort by time
    return Array.from(grouped.values()).sort((a, b) => 
      a.time.localeCompare(b.time)
    );
  }, [activeProtocols, isPeptideTakenToday]);

  const loading = protocolsLoading || logsLoading;
  const totalToday = stacks.reduce((acc, s) => acc + s.protocols.length, 0);
  const takenToday = stacks.reduce((acc, s) => 
    acc + s.protocols.filter(p => p.isTaken).length, 0
  );
  const hasLowInventory = stacks.some(s => s.hasLowInventory);

  // Find next pending stack
  const nextPending = stacks.find(s => !s.allTaken);

  // Common click handler
  const handleClick = () => onOpenSheet?.();

  // FLAT Layout - 2 column span
  if (size === 'flat') {
    return (
      <motion.button
        onClick={handleClick}
        whileTap={{ scale: 0.98 }}
        className="w-full h-full bg-card rounded-2xl border border-border p-4 flex items-center gap-3 text-left"
      >
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
          takenToday === totalToday && totalToday > 0
            ? "bg-emerald-500/20 text-emerald-500"
            : "bg-violet-500/20 text-violet-500"
        )}>
          <Syringe className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          ) : totalToday === 0 ? (
            <span className="text-sm text-muted-foreground">Keine Peptide heute</span>
          ) : nextPending ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground truncate">
                {nextPending.time}: {nextPending.protocols.map(p => p.peptideName).join(' & ')}
              </span>
              {hasLowInventory && (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              )}
            </div>
          ) : (
            <span className="text-sm text-emerald-500 font-medium">
              Alle {totalToday} Injektionen erledigt ✓
            </span>
          )}
        </div>
        
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </motion.button>
    );
  }

  // SMALL Layout - 1x1
  if (size === 'small') {
    const progress = totalToday > 0 ? (takenToday / totalToday) * 100 : 0;
    
    return (
      <motion.button
        onClick={handleClick}
        whileTap={{ scale: 0.98 }}
        className="w-full h-full bg-card rounded-2xl border border-border p-4 flex flex-col items-center justify-center text-center relative overflow-hidden"
      >
        {/* Background ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="6"
          />
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke={takenToday === totalToday && totalToday > 0 ? "hsl(var(--primary))" : "hsl(280, 70%, 60%)"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${progress * 2.64} 264`}
            className="transition-all duration-500"
          />
        </svg>
        
        <div className="relative z-10">
          <Syringe className={cn(
            "w-6 h-6 mx-auto mb-1",
            takenToday === totalToday && totalToday > 0 ? "text-primary" : "text-violet-500"
          )} />
          <p className="text-lg font-bold tabular-nums">
            {loading ? '-' : `${takenToday}/${totalToday}`}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Peptide</p>
        </div>
        
        {hasLowInventory && (
          <div className="absolute top-2 right-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          </div>
        )}
      </motion.button>
    );
  }

  // MEDIUM/LARGE Layout - Timeline view
  return (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.98 }}
      className="w-full h-full bg-card rounded-2xl border border-border p-4 flex flex-col text-left"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Syringe className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-medium">Peptide</span>
        </div>
        {hasLowInventory && (
          <div className="flex items-center gap-1 text-amber-500">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="text-[10px]">Nachbestellen</span>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : stacks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Keine aktiven Protokolle
          </div>
        ) : (
          stacks.map(stack => (
            <div 
              key={stack.timing}
              className={cn(
                "flex items-center gap-2 p-2 rounded-xl transition-colors",
                stack.allTaken ? "bg-emerald-500/10" : "bg-muted/50"
              )}
            >
              {/* Time */}
              <span className="text-xs font-mono text-muted-foreground w-10 flex-shrink-0">
                {stack.time}
              </span>
              
              {/* Stack info */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium truncate",
                  stack.allTaken ? "text-emerald-600" : "text-foreground"
                )}>
                  {stack.protocols.length > 1 
                    ? `${stack.label} Stack (${stack.protocols.length})`
                    : stack.protocols[0]?.peptideName
                  }
                </p>
                {stack.protocols.length === 1 && (
                  <p className="text-[10px] text-muted-foreground">
                    {stack.protocols[0]?.dose} {stack.protocols[0]?.unit}
                  </p>
                )}
              </div>
              
              {/* Status */}
              <div className="flex items-center gap-1">
                {stack.hasLowInventory && (
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                )}
                {stack.allTaken ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Clock className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer - Inventory summary for large size */}
      {size === 'large' && stacks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Vial Status</span>
            <span className="flex items-center gap-2">
              {stacks.flatMap(s => s.protocols).filter(p => p.isLowInventory).length > 0 ? (
                <span className="text-amber-500">
                  {stacks.flatMap(s => s.protocols).filter(p => p.isLowInventory).length} niedrig
                </span>
              ) : (
                <span className="text-emerald-500">Alle OK</span>
              )}
            </span>
          </div>
        </div>
      )}
    </motion.button>
  );
};

export default PeptidesWidget;
