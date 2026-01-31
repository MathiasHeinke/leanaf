import { SupplementRanking as RankingData } from "@/hooks/useSupplementAnalytics";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface SupplementRankingProps {
  data: RankingData[];
}

const getComplianceColorClass = (compliance: number): string => {
  if (compliance >= 80) return "text-green-600 dark:text-green-400";
  if (compliance >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
};

const getProgressColor = (compliance: number): string => {
  if (compliance >= 80) return "[&>div]:bg-green-500";
  if (compliance >= 50) return "[&>div]:bg-yellow-500";
  return "[&>div]:bg-red-500";
};

export const SupplementRanking = ({ data }: SupplementRankingProps) => {
  if (data.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Keine Supplements konfiguriert
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Regelmäßigkeit</h4>
      
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={item.id} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium truncate max-w-[60%]">
                {index + 1}. {item.name}
              </span>
              <span className={cn("font-semibold", getComplianceColorClass(item.compliance))}>
                {item.compliance}% ({item.daysCount}/{item.totalDays})
              </span>
            </div>
            <Progress 
              value={item.compliance} 
              className={cn("h-2", getProgressColor(item.compliance))}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
