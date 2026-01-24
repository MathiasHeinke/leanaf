import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface WeekCounterProps {
  currentWeek: number;
  totalWeeks: number;
  phaseStartDate: Date | null;
}

export function WeekCounter({ currentWeek, totalWeeks, phaseStartDate }: WeekCounterProps) {
  const progressPercent = Math.round((currentWeek / totalWeeks) * 100);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Aktuelle Woche</p>
            <p className="text-2xl font-bold">
              {currentWeek} <span className="text-muted-foreground text-base font-normal">/ {totalWeeks}</span>
            </p>
          </div>
        </div>

        <Progress value={progressPercent} className="h-2 mb-2" />
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{progressPercent}% abgeschlossen</span>
          {phaseStartDate && (
            <span>Start: {format(phaseStartDate, 'dd. MMM yyyy', { locale: de })}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
