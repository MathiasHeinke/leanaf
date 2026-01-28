import React from 'react';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, Check, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getScheduleLabel } from '@/lib/schedule-utils';
import type { SupplementLibraryItem } from '@/types/supplementLibrary';

interface SupplementToggleRowProps {
  item: SupplementLibraryItem;
  isActive: boolean;
  onToggle: (id: string, active: boolean) => void;
  isLoading?: boolean;
}

/**
 * SupplementToggleRow - Toggle-based supplement activation
 * Shows supplement info with schedule badge and activation switch
 */
export const SupplementToggleRow: React.FC<SupplementToggleRowProps> = ({
  item,
  isActive,
  onToggle,
  isLoading,
}) => {
  const scheduleLabel = getScheduleLabel(item.cycling_protocol);

  // Get default timing label
  const getTimingLabel = () => {
    const timing = item.common_timing?.[0]?.toLowerCase() || '';
    if (timing.includes('morgen') || timing.includes('nüchtern')) return 'Morgens';
    if (timing.includes('mittag')) return 'Mittags';
    if (timing.includes('abend') || timing.includes('nacht')) return 'Abends';
    if (timing.includes('schlaf')) return 'Vor dem Schlaf';
    if (timing.includes('vor training')) return 'Vor Training';
    if (timing.includes('nach training')) return 'Nach Training';
    return 'Morgens';
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-all",
        isActive
          ? "bg-primary/5 border-primary/20"
          : "bg-card/50 border-border/30 hover:bg-card"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0",
          isActive ? "bg-primary/10" : "bg-muted/50"
        )}
      >
        💊
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{item.name}</span>
        </div>

        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          {isActive ? (
            <>
              <Check className="h-3 w-3 text-green-500 shrink-0" />
              <span className="truncate">{getTimingLabel()}</span>
              <span>•</span>
              <span className="truncate">{item.default_dosage || 'Standard'}</span>
            </>
          ) : (
            <>
              <Info className="h-3 w-3 shrink-0" />
              <span className="truncate">Empfohlen: {item.default_dosage || 'Nach Bedarf'}</span>
            </>
          )}
        </div>

        {/* Schedule Badge (Cycling) */}
        {scheduleLabel && (
          <div className="flex items-center gap-1 mt-1.5 text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded w-fit">
            <RefreshCw className="h-3 w-3 shrink-0" />
            <span className="truncate">{scheduleLabel}</span>
          </div>
        )}
      </div>

      {/* Status + Toggle */}
      <div className="flex items-center gap-2 shrink-0">
        {isActive && (
          <span className="hidden sm:inline text-[10px] font-medium text-green-600 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded whitespace-nowrap">
            Im Stack
          </span>
        )}
        <Switch
          checked={isActive}
          onCheckedChange={(checked) => onToggle(item.id, checked)}
          disabled={isLoading}
          className="data-[state=checked]:bg-primary"
        />
      </div>
    </div>
  );
};

export default SupplementToggleRow;
