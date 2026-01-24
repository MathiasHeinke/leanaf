import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Pause, SkipForward } from "lucide-react";
import { TodaysIntakeItem } from "@/hooks/useTodaysIntake";
import { cn } from "@/lib/utils";

interface IntakeChecklistItemProps {
  item: TodaysIntakeItem;
  isTaken: boolean;
  isSkipped: boolean;
  onMarkTaken: () => Promise<void>;
  onSkip?: () => void;
}

const TIMING_LABELS: Record<string, { label: string; icon: string }> = {
  'morning_fasted': { label: 'Morgens nüchtern', icon: '🌅' },
  'pre_workout': { label: 'Vor Training', icon: '💪' },
  'evening_fasted': { label: 'Abends nüchtern', icon: '🌙' },
  'before_bed': { label: 'Vor dem Schlafen', icon: '😴' },
  'twice_daily': { label: '2x täglich', icon: '🔄' },
  'weekly': { label: 'Wöchentlich', icon: '📅' },
};

export function IntakeChecklistItem({ 
  item, 
  isTaken, 
  isSkipped,
  onMarkTaken,
  onSkip 
}: IntakeChecklistItemProps) {
  const [isLoading, setIsLoading] = useState(false);

  const timing = TIMING_LABELS[item.scheduledTiming] || { 
    label: item.scheduledTiming, 
    icon: '💊' 
  };

  const handleClick = async () => {
    if (isTaken || isSkipped || !item.isActiveToday) return;
    setIsLoading(true);
    try {
      await onMarkTaken();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card
      className={cn(
        "p-4 transition-all duration-200",
        isTaken && "bg-primary/10 border-primary/30",
        isSkipped && "bg-secondary/50 border-secondary opacity-60",
        !item.isActiveToday && "opacity-50 bg-muted/50"
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-2xl flex-shrink-0">{timing.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate">{item.peptide.name}</span>
              {!item.isActiveToday && (
                <Badge variant="secondary" className="text-xs">
                  <Pause className="h-3 w-3 mr-1" />
                  Pause
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {item.currentDose}{item.currentDoseUnit}
              </span>
              {' • '}
              {timing.label}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {item.cycleStatus}
              {item.peptide.name.toLowerCase().includes('retatrutid') && (
                <> • Woche {item.currentWeek}</>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {onSkip && !isTaken && !isSkipped && item.isActiveToday && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="text-muted-foreground hover:text-secondary-foreground"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            onClick={handleClick}
            disabled={isTaken || isSkipped || !item.isActiveToday || isLoading}
            variant={isTaken ? "default" : isSkipped ? "secondary" : "outline"}
            size="sm"
            className={cn(
              "min-w-[100px]",
              isTaken && "bg-primary hover:bg-primary text-primary-foreground"
            )}
          >
            {isLoading ? (
              "..."
            ) : isTaken ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Genommen
              </>
            ) : isSkipped ? (
              "Übersprungen"
            ) : !item.isActiveToday ? (
              "Pause"
            ) : (
              "Nehmen"
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
