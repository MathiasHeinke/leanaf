import React, { useState, useCallback } from 'react';
import { Check, ChevronRight, Sun, Moon, Coffee, Dumbbell, Clock } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { ExpandableSupplementChip } from './ExpandableSupplementChip';
import { useUpdateSupplement, useDeleteSupplement, useSupplementBrands } from '@/hooks/useSupplementLibrary';
import type { UserStackItem, PreferredTiming } from '@/types/supplementLibrary';

interface ProtocolBundleCardProps {
  title: string;
  timing: PreferredTiming;
  timeRange: string;
  supplements: UserStackItem[];
  takenIds?: Set<string>; // IDs of supplements already taken today
  onCompleteStack: () => void;
  onSupplementClick?: (supplement: UserStackItem) => void;
  onRefetch?: () => void;
  isCompleted?: boolean;
  className?: string;
}

const TIMING_ICONS: Record<PreferredTiming, React.ElementType> = {
  morning: Sun,
  noon: Coffee,
  afternoon: Coffee,
  evening: Moon,
  bedtime: Moon,
  pre_workout: Dumbbell,
  post_workout: Dumbbell,
};

const TIMING_COLORS: Record<PreferredTiming, string> = {
  morning: 'from-amber-500/20 to-orange-500/10',
  noon: 'from-yellow-500/20 to-amber-500/10',
  afternoon: 'from-blue-500/20 to-cyan-500/10',
  evening: 'from-purple-500/20 to-indigo-500/10',
  bedtime: 'from-indigo-500/20 to-violet-500/10',
  pre_workout: 'from-green-500/20 to-emerald-500/10',
  post_workout: 'from-teal-500/20 to-green-500/10',
};

/**
 * ProtocolBundleCard - Groups supplements by time slot
 * Features:
 * - Expandable supplement chips with inline editing
 * - Liquid layout animations via Framer Motion
 * - Timing constraint badges
 * - "Complete Stack" button with haptic feedback
 * - Collapsed state after completion
 */
export const ProtocolBundleCard: React.FC<ProtocolBundleCardProps> = ({
  title,
  timing,
  timeRange,
  supplements,
  takenIds,
  onCompleteStack,
  onSupplementClick,
  onRefetch,
  isCompleted = false,
  className,
}) => {
  const [isPressing, setIsPressing] = useState(false);
  
  // Hooks for update/delete
  const { updateSupplement } = useUpdateSupplement();
  const { deleteSupplement } = useDeleteSupplement();
  const { data: brands } = useSupplementBrands();
  
  const Icon = TIMING_ICONS[timing] || Clock;
  const gradientColor = TIMING_COLORS[timing] || 'from-muted/50 to-muted/30';
  
  // Calculate total cost per day
  const totalCost = supplements.reduce((sum, s) => {
    return sum + (s.supplement?.cost_per_day_eur || 0);
  }, 0);
  
  const handleComplete = () => {
    haptics.success();
    onCompleteStack();
  };
  
  // Handle save from chip
  const handleSave = useCallback(async (id: string, updates: any) => {
    await updateSupplement(id, updates);
    onRefetch?.();
  }, [updateSupplement, onRefetch]);
  
  // Handle delete from chip
  const handleDelete = useCallback(async (id: string) => {
    await deleteSupplement(id);
    onRefetch?.();
  }, [deleteSupplement, onRefetch]);
  
  // Collapsed completed state
  if (isCompleted) {
    return (
      <motion.div
        layout
        className={cn(
          'flex items-center gap-3 p-3 rounded-xl',
          'bg-green-500/10 border border-green-500/20',
          className
        )}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20">
          <Check className="h-4 w-4 text-green-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-green-600 dark:text-green-400">{title}</p>
          <p className="text-xs text-muted-foreground">
            {supplements.length} Supplements eingenommen
          </p>
        </div>
        <Badge variant="outline" className="text-green-600 dark:text-green-400 border-green-500/30">
          ✓ Done
        </Badge>
      </motion.div>
    );
  }
  
  return (
    <div
      className={cn(
        'rounded-xl border border-border/50 overflow-hidden',
        'bg-gradient-to-br',
        gradientColor,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-background/80 shadow-sm">
          <Icon className="h-5 w-5 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{timeRange}</span>
            <span>•</span>
            <span>{supplements.length} Items</span>
          </div>
        </div>
      </div>
      
      {/* Expandable Supplement Chips with Liquid Layout */}
      <div className="px-4 pb-3">
        <LayoutGroup>
          <motion.div layout className="flex flex-col gap-2">
            {supplements.map((supplement) => (
              <motion.div key={supplement.id} layout>
                <ExpandableSupplementChip
                  item={supplement}
                  brands={brands}
                  onSave={handleSave}
                  onDelete={handleDelete}
                />
              </motion.div>
            ))}
          </motion.div>
        </LayoutGroup>
      </div>
      
      {/* Footer with cost and action */}
      <div className="flex items-center justify-between px-4 py-3 bg-background/50 border-t border-border/30">
        <div className="text-xs text-muted-foreground">
          {totalCost > 0 ? (
            <span>~{totalCost.toFixed(2)} €/Tag</span>
          ) : (
            <span>{supplements.length} Supplements</span>
          )}
        </div>
        
        <Button
          size="sm"
          onClick={handleComplete}
          onMouseDown={() => setIsPressing(true)}
          onMouseUp={() => setIsPressing(false)}
          onTouchStart={() => setIsPressing(true)}
          onTouchEnd={() => setIsPressing(false)}
          className={cn(
            'transition-all duration-150',
            isPressing && 'scale-95'
          )}
        >
          <span>Stack abschließen</span>
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default ProtocolBundleCard;
