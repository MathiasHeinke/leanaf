import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Check, Circle, X } from "lucide-react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface MitochondrialWeeklyProgressProps {
  protocolId: string;
  substanceName: string;
  preferredDays: string[];
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function MitochondrialWeeklyProgress({
  protocolId,
  substanceName,
  preferredDays
}: MitochondrialWeeklyProgressProps) {
  const [completedDays, setCompletedDays] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWeeklyLogs() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const weekEnd = addDays(weekStart, 6);

        const { data, error } = await supabase
          .from('peptide_intake_log')
          .select('taken_at')
          .eq('protocol_id', protocolId)
          .gte('taken_at', weekStart.toISOString())
          .lte('taken_at', weekEnd.toISOString());

        if (error) throw error;

        const dates = (data || [])
          .filter(log => log.taken_at)
          .map(log => new Date(log.taken_at!));
        setCompletedDays(dates);
      } catch (err) {
        console.error('Error fetching weekly progress:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchWeeklyLogs();
  }, [protocolId]);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const renderDay = (dayIndex: number) => {
    const date = addDays(weekStart, dayIndex);
    const dayName = DAY_NAMES[(dayIndex + 1) % 7]; // Adjust for Monday start
    const isPreferred = preferredDays.includes(dayName);
    const isCompleted = completedDays.some(d => isSameDay(d, date));
    const isToday = isSameDay(date, new Date());
    const isPast = date < new Date() && !isToday;

    return (
      <div 
        key={dayIndex} 
        className={cn(
          "flex flex-col items-center p-2 rounded-lg",
          isToday && "ring-2 ring-primary ring-offset-2"
        )}
      >
        <span className="text-xs text-muted-foreground">
          {format(date, 'EEE', { locale: de })}
        </span>
        <span className="text-sm font-medium mb-1">
          {format(date, 'd')}
        </span>
        {isPreferred ? (
          isCompleted ? (
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          ) : isPast ? (
            <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center">
              <X className="w-4 h-4 text-destructive" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center">
              <Circle className="w-3 h-3 text-primary/50" />
            </div>
          )
        ) : (
          <div className="w-6 h-6" /> // Empty space for non-preferred days
        )}
      </div>
    );
  };

  const completedCount = completedDays.length;
  const targetCount = preferredDays.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{substanceName} - Diese Woche</CardTitle>
          <span className="text-sm text-muted-foreground">
            {completedCount}/{targetCount}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-20 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Lade...</div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {[0, 1, 2, 3, 4, 5, 6].map(renderDay)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
