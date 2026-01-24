import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Timer, Calendar, Zap } from "lucide-react";
import { Phase2Substance } from "@/constants/phase2Substances";

interface MitochondrialSubstanceCardProps {
  substance: Phase2Substance;
  currentCycleWeek: number;
  isOnCycle: boolean;
  nextDoseDate: Date | null;
  completedThisWeek: number;
  targetPerWeek: number;
}

const TIMING_LABELS: Record<string, { label: string; icon: string }> = {
  'pre_zone2': { label: 'Vor Zone 2 Cardio', icon: '🚴' },
  'pre_vo2max': { label: 'Vor VO2max Training', icon: '🏃' },
  'morning_fasted': { label: 'Morgens nüchtern', icon: '🌅' },
  'evening': { label: 'Abends', icon: '🌙' },
};

export function MitochondrialSubstanceCard({
  substance,
  currentCycleWeek,
  isOnCycle,
  nextDoseDate,
  completedThisWeek,
  targetPerWeek,
}: MitochondrialSubstanceCardProps) {
  const cycleProgress = isOnCycle
    ? (currentCycleWeek / substance.cyclePattern.onPeriod) * 100
    : ((currentCycleWeek - substance.cyclePattern.onPeriod) / substance.cyclePattern.offPeriod) * 100;

  const timing = TIMING_LABELS[substance.defaultTiming] || { label: substance.defaultTiming, icon: '💊' };
  const weekProgress = (completedThisWeek / targetPerWeek) * 100;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{substance.name}</CardTitle>
          <Badge variant={isOnCycle ? 'default' : 'secondary'}>
            {isOnCycle ? `Woche ${currentCycleWeek}/${substance.cyclePattern.onPeriod}` : 'Pause'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{substance.description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dosierung & Timing */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span>{timing.icon}</span>
            <div>
              <p className="text-muted-foreground">Timing</p>
              <p className="font-medium">{timing.label}</p>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground">Dosis</p>
            <p className="font-medium">{substance.defaultDose}{substance.defaultUnit}</p>
          </div>
        </div>

        {/* Wöchentlicher Fortschritt */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Diese Woche</span>
            <span className="font-medium">{completedThisWeek}/{targetPerWeek}</span>
          </div>
          <Progress value={weekProgress} className="h-2" />
        </div>

        {/* Zyklus-Fortschritt */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Timer className="w-3 h-3" />
              {isOnCycle ? 'Zyklus-Fortschritt' : 'Pause-Fortschritt'}
            </span>
            <span className="text-xs">
              {isOnCycle
                ? `${substance.cyclePattern.onPeriod - currentCycleWeek} Wochen übrig`
                : `${substance.cyclePattern.offPeriod - (currentCycleWeek - substance.cyclePattern.onPeriod)} Wochen Pause`
              }
            </span>
          </div>
          <Progress value={cycleProgress} className="h-1.5" />
        </div>

        {/* Nächste Dosis */}
        {isOnCycle && nextDoseDate && (
          <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg p-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span>
              Nächste Dosis:{' '}
              <span className="font-medium">
                {nextDoseDate.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </span>
          </div>
        )}

        {/* Hallmarks */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Adressierte Hallmarks:
          </p>
          <div className="flex flex-wrap gap-1">
            {substance.hallmarksAddressed.map((hallmark, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {hallmark}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
