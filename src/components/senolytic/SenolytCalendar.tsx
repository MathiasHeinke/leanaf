import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  addMonths,
  subMonths,
  isWithinInterval,
  parseISO
} from "date-fns";
import { de } from "date-fns/locale";
import { SenolytCycle } from "@/hooks/useSenolytCycles";
import { cn } from "@/lib/utils";

interface SenolytCalendarProps {
  cycles: SenolytCycle[];
  nextCycleDate: Date | null;
}

export function SenolytCalendar({ cycles, nextCycleDate }: SenolytCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getCycleDayType = (date: Date): 'active' | 'completed' | 'scheduled' | null => {
    for (const cycle of cycles) {
      if (cycle.cycle_started_at && cycle.status === 'completed') {
        const cycleStart = parseISO(cycle.cycle_started_at);
        const cycleEnd = cycle.cycle_ended_at 
          ? parseISO(cycle.cycle_ended_at) 
          : new Date(cycleStart.getTime() + (cycle.duration_days - 1) * 24 * 60 * 60 * 1000);
        
        if (isWithinInterval(date, { start: cycleStart, end: cycleEnd })) {
          return 'completed';
        }
      }

      if (cycle.cycle_started_at && cycle.status === 'active') {
        const cycleStart = parseISO(cycle.cycle_started_at);
        const cycleEnd = new Date(cycleStart);
        cycleEnd.setDate(cycleEnd.getDate() + cycle.duration_days - 1);
        
        if (isWithinInterval(date, { start: cycleStart, end: cycleEnd })) {
          return 'active';
        }
      }
    }

    if (nextCycleDate && isSameDay(date, nextCycleDate)) {
      return 'scheduled';
    }

    return null;
  };

  const today = new Date();
  const firstDayOfMonth = days[0];
  const offsetDays = (firstDayOfMonth.getDay() + 6) % 7;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Senolytik-Kalender
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[100px] text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: de })}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-2">
          {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
            <div key={day} className="text-center text-xs text-muted-foreground font-medium py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for first week offset */}
          {Array.from({ length: offsetDays }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {days.map((day) => {
            const cycleType = getCycleDayType(day);
            const isToday = isSameDay(day, today);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "aspect-square flex items-center justify-center text-sm rounded-md relative",
                  isToday && "ring-2 ring-primary ring-offset-1",
                  cycleType === 'active' && "bg-primary/20 text-primary font-medium",
                  cycleType === 'completed' && "bg-secondary text-secondary-foreground",
                  cycleType === 'scheduled' && "bg-accent/50 border-2 border-dashed border-accent-foreground/30 text-accent-foreground",
                  !cycleType && "text-foreground hover:bg-muted/50"
                )}
              >
                {format(day, 'd')}
                {cycleType === 'active' && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-primary/20 border border-primary/50" />
            <span className="text-muted-foreground">Aktiv</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-secondary border border-secondary-foreground/20" />
            <span className="text-muted-foreground">Abgeschlossen</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded border-2 border-dashed border-accent-foreground/30" />
            <span className="text-muted-foreground">Geplant</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
