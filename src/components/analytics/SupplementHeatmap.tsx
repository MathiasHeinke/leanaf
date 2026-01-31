import { DailyCompliance } from "@/hooks/useSupplementAnalytics";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SupplementHeatmapProps {
  data: DailyCompliance[];
  period: 7 | 30;
}

const getComplianceColor = (rate: number): string => {
  if (rate === 100) return "bg-green-500 dark:bg-green-600";
  if (rate >= 80) return "bg-green-400 dark:bg-green-500";
  if (rate >= 50) return "bg-yellow-400 dark:bg-yellow-500";
  if (rate > 0) return "bg-red-400 dark:bg-red-500";
  return "bg-muted";
};

export const SupplementHeatmap = ({ data, period }: SupplementHeatmapProps) => {
  // Group data into weeks for 30-day view
  const weeks: DailyCompliance[][] = [];
  
  if (period === 7) {
    weeks.push(data);
  } else {
    // Split into weeks
    for (let i = 0; i < data.length; i += 7) {
      weeks.push(data.slice(i, i + 7));
    }
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Compliance Heatmap</h4>
      
      <TooltipProvider delayDuration={0}>
        <div className="space-y-2">
          {/* Day labels */}
          {period === 7 && (
            <div className="flex gap-1">
              {data.map((day) => (
                <div
                  key={day.date}
                  className="flex-1 text-center text-xs text-muted-foreground"
                >
                  {day.dayName}
                </div>
              ))}
            </div>
          )}
          
          {/* Heatmap grid */}
          <div className="space-y-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex gap-1">
                {week.map((day) => (
                  <Tooltip key={day.date}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "flex-1 aspect-square rounded-sm cursor-pointer transition-transform hover:scale-110",
                          getComplianceColor(day.rate),
                          period === 30 && "min-w-[24px] max-w-[32px]"
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <div className="font-semibold">{day.displayDate}</div>
                      <div>
                        {day.taken}/{day.total} ({day.rate}%)
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
                {/* Fill empty spaces for incomplete weeks */}
                {week.length < 7 &&
                  Array.from({ length: 7 - week.length }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="flex-1 aspect-square"
                    />
                  ))}
              </div>
            ))}
          </div>
        </div>
      </TooltipProvider>
      
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-green-500" />
          <span>100%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-green-400" />
          <span>80%+</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-yellow-400" />
          <span>50%+</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-400" />
          <span>&lt;50%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-muted" />
          <span>Keine</span>
        </div>
      </div>
    </div>
  );
};
