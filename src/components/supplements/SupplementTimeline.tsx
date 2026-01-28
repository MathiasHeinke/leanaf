import React from 'react';
import { Clock, Droplets, Apple, Dumbbell, Moon, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  TIMELINE_SLOTS, 
  TIMING_CONSTRAINT_ICONS,
  type UserStackItem,
  type PreferredTiming,
  type TimingConstraint,
  isTimingOptimal
} from '@/types/supplementLibrary';

interface SupplementTimelineProps {
  groupedByTiming: Record<PreferredTiming, UserStackItem[]>;
  onSupplementClick?: (supplement: UserStackItem) => void;
}

// Get icon component for timing constraint
const getConstraintIcon = (constraint: TimingConstraint) => {
  switch (constraint) {
    case 'fasted':
      return <Droplets className="h-3 w-3" />;
    case 'with_food':
    case 'with_fats':
      return <Apple className="h-3 w-3" />;
    case 'pre_workout':
    case 'post_workout':
      return <Dumbbell className="h-3 w-3" />;
    case 'bedtime':
      return <Moon className="h-3 w-3" />;
    default:
      return null;
  }
};

// Supplement chip component
const SupplementChip: React.FC<{
  supplement: UserStackItem;
  onClick?: () => void;
}> = ({ supplement, onClick }) => {
  const constraint = supplement.supplement?.timing_constraint || 'any';
  const isOptimal = isTimingOptimal(constraint, supplement.preferred_timing);
  const icon = getConstraintIcon(constraint);
  const emojiIcon = TIMING_CONSTRAINT_ICONS[constraint];

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex items-center gap-2 px-3 py-2 rounded-lg",
        "bg-card/80 border border-border/50 hover:border-primary/50",
        "transition-all duration-200 hover:shadow-md",
        "text-left w-full",
        !isOptimal && constraint !== 'any' && "border-amber-500/30 bg-amber-500/5"
      )}
    >
      {/* Constraint indicator */}
      {icon && (
        <span className={cn(
          "flex-none p-1 rounded-md text-xs",
          isOptimal || constraint === 'any'
            ? "bg-primary/10 text-primary"
            : "bg-amber-500/10 text-amber-500"
        )}>
          {emojiIcon}
        </span>
      )}

      {/* Name & Dosage */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {supplement.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {supplement.dosage} {supplement.unit}
        </p>
      </div>

      {/* Stock warning */}
      {supplement.stock_count !== null && supplement.stock_count <= 7 && (
        <Badge variant="outline" className="flex-none text-xs border-amber-500/50 text-amber-500">
          {supplement.stock_count} übrig
        </Badge>
      )}

      {/* Suboptimal timing warning */}
      {!isOptimal && constraint !== 'any' && (
        <AlertTriangle className="h-4 w-4 text-amber-500 flex-none" />
      )}
    </button>
  );
};

export const SupplementTimeline: React.FC<SupplementTimelineProps> = ({
  groupedByTiming,
  onSupplementClick,
}) => {
  // Count total supplements
  const totalCount = Object.values(groupedByTiming).reduce(
    (sum, items) => sum + items.length, 0
  );

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

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      {/* Timeline slots */}
      <div className="space-y-6">
        {TIMELINE_SLOTS.map((slot) => {
          const supplements = groupedByTiming[slot.id] || [];
          const hasSupplements = supplements.length > 0;

          return (
            <div key={slot.id} className="relative pl-10">
              {/* Timeline dot */}
              <div className={cn(
                "absolute left-2.5 w-3 h-3 rounded-full border-2 border-background",
                hasSupplements 
                  ? "bg-primary" 
                  : "bg-muted-foreground/30"
              )} />

              {/* Time label */}
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  "text-sm font-medium",
                  hasSupplements ? "text-foreground" : "text-muted-foreground/50"
                )}>
                  {slot.label}
                </span>
                <span className="text-xs text-muted-foreground/50">
                  {slot.timeRange}
                </span>
                {hasSupplements && (
                  <Badge variant="secondary" className="text-xs">
                    {supplements.length}
                  </Badge>
                )}
              </div>

              {/* Supplements */}
              {hasSupplements && (
                <div className="space-y-2">
                  {supplements.map((supplement) => (
                    <SupplementChip
                      key={supplement.id}
                      supplement={supplement}
                      onClick={() => onSupplementClick?.(supplement)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Dynamic timings (pre/post workout) if any */}
      {(groupedByTiming.pre_workout?.length > 0 || groupedByTiming.post_workout?.length > 0) && (
        <div className="mt-8 pt-6 border-t border-border/50">
          <p className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Training-gebunden
          </p>
          <div className="space-y-4 pl-2">
            {groupedByTiming.pre_workout?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Vor dem Training</p>
                <div className="space-y-2">
                  {groupedByTiming.pre_workout.map((supplement) => (
                    <SupplementChip
                      key={supplement.id}
                      supplement={supplement}
                      onClick={() => onSupplementClick?.(supplement)}
                    />
                  ))}
                </div>
              </div>
            )}
            {groupedByTiming.post_workout?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Nach dem Training</p>
                <div className="space-y-2">
                  {groupedByTiming.post_workout.map((supplement) => (
                    <SupplementChip
                      key={supplement.id}
                      supplement={supplement}
                      onClick={() => onSupplementClick?.(supplement)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
