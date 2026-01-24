import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Pill, Calendar, AlertTriangle, Clock } from "lucide-react";
import { RapamycinLog } from "@/hooks/useRapamycin";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface RapamycinWeeklyCardProps {
  lastLog: RapamycinLog | null;
  nextDoseDate: { date: Date; daysRemaining: number } | null;
  currentWeek: number;
  onLogDose: () => void;
  isDue: boolean;
}

export function RapamycinWeeklyCard({
  lastLog,
  nextDoseDate,
  currentWeek,
  onLogDose,
  isDue
}: RapamycinWeeklyCardProps) {
  // 8 weeks on, 4 weeks off cycle
  const cyclePosition = currentWeek || 0;
  const isInActiveCycle = cyclePosition > 0 && cyclePosition <= 8;
  const weeksUntilBreak = isInActiveCycle ? 8 - cyclePosition : 0;
  const weeksInBreak = !isInActiveCycle && cyclePosition > 8 ? cyclePosition - 8 : 0;

  // Progress calculation
  const progressValue = isInActiveCycle
    ? (cyclePosition / 8) * 100
    : ((cyclePosition - 8) / 4) * 100;

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Rapamycin</CardTitle>
          </div>
          <Badge variant={isInActiveCycle ? "default" : "secondary"}>
            {isInActiveCycle ? `Woche ${cyclePosition}/8` : `Pause ${weeksInBreak}/4`}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">
          mTOR-Inhibitor • Einmal wöchentlich
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Zyklus-Fortschritt */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {isInActiveCycle ? 'Aktiver Zyklus' : 'Pause-Phase'}
            </span>
            <span className="text-muted-foreground">
              {isInActiveCycle
                ? `${weeksUntilBreak} Wochen bis Pause`
                : `${4 - weeksInBreak} Wochen bis Neustart`
              }
            </span>
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>

        {/* Letzte Einnahme */}
        {lastLog && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Letzte Dosis</p>
              <p className="font-medium">
                {format(new Date(lastLog.taken_at), 'dd.MM.yy', { locale: de })}
              </p>
              <p className="text-sm text-muted-foreground">
                {lastLog.dose_mg}mg {lastLog.taken_fasted ? '(nüchtern)' : ''}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Nächste Dosis</p>
              {nextDoseDate ? (
                <>
                  <p className="font-medium">
                    {format(nextDoseDate.date, 'dd.MM.yy', { locale: de })}
                  </p>
                  <p className={`text-sm ${nextDoseDate.daysRemaining === 0 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                    {nextDoseDate.daysRemaining === 0
                      ? 'Heute fällig!'
                      : `in ${nextDoseDate.daysRemaining} Tagen`
                    }
                  </p>
                </>
              ) : (
                <p className="font-medium text-amber-600">Jetzt</p>
              )}
            </div>
          </div>
        )}

        {/* Nebenwirkungen-Warnung */}
        {lastLog?.side_effects && lastLog.side_effects.length > 0 && (
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 p-2">
            <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {lastLog.side_effects.length} Nebenwirkung(en) zuletzt
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          ⚠️ Verschreibungspflichtig: Nur unter ärztlicher Aufsicht verwenden.
          Regelmäßige Blutkontrollen erforderlich.
        </p>

        {/* Log Button */}
        <Button
          onClick={onLogDose}
          className={`w-full ${isDue ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
          variant={isDue ? "default" : "outline"}
        >
          <Clock className="h-4 w-4 mr-2" />
          {isDue ? 'Dosis jetzt loggen' : 'Dosis vormerken'}
        </Button>
      </CardContent>
    </Card>
  );
}
