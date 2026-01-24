import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useRetaMicro } from "@/hooks/useRetaMicro";
import { AlertTriangle, CheckCircle2, Info, TrendingDown } from "lucide-react";

const GI_EFFECT_LABELS: Record<string, string> = {
  nausea: 'Übelkeit',
  diarrhea: 'Durchfall',
  bloating: 'Blähungen',
  constipation: 'Verstopfung',
  heartburn: 'Sodbrennen',
  vomiting: 'Erbrechen',
};

export function RetaMicroSideEffectsTracker() {
  const { logs, loading, getGISideEffectStats, getStats } = useRetaMicro();

  const giStats = getGISideEffectStats();
  const stats = getStats();

  const effectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    logs.forEach((log) => {
      if (log.gi_side_effects && Array.isArray(log.gi_side_effects)) {
        log.gi_side_effects.forEach((effect) => {
          counts[effect] = (counts[effect] || 0) + 1;
        });
      }
    });

    return Object.entries(counts)
      .map(([effect, count]) => ({
        effect,
        label: GI_EFFECT_LABELS[effect] || effect,
        count,
        percentage: Math.round((count / logs.length) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [logs]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-pulse text-muted-foreground">Lade...</div>
        </CardContent>
      </Card>
    );
  }

  const hasNoSideEffects = giStats.occurrenceRate === 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            GI-Nebenwirkungen
          </CardTitle>
          <Badge
            variant="outline"
            className={hasNoSideEffects ? 'text-green-600 border-green-600/50' : 'text-amber-600 border-amber-600/50'}
          >
            {Math.round(giStats.occurrenceRate * 100)}% der Dosen
          </Badge>
        </div>
        <CardDescription>
          Tracking von Magen-Darm-Nebenwirkungen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasNoSideEffects ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-600 mb-2" />
            <p className="font-medium text-green-600">Keine GI-Nebenwirkungen</p>
            <p className="text-sm text-muted-foreground mt-1">
              Sehr gute Verträglichkeit bei {logs.length} Dosen
            </p>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="text-xl font-bold">
                  {Math.round(giStats.occurrenceRate * 100)}%
                </div>
                <div className="text-xs text-muted-foreground">Auftreten</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="text-xl font-bold">
                  {giStats.averageSeverity.toFixed(1)}/5
                </div>
                <div className="text-xs text-muted-foreground">Ø Schweregrad</div>
              </div>
            </div>

            {/* Effect Breakdown */}
            {effectCounts.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Häufigkeit nach Typ</p>
                {effectCounts.slice(0, 5).map((effect) => (
                  <div key={effect.effect} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{effect.label}</span>
                      <span className="text-muted-foreground">
                        {effect.count}x ({effect.percentage}%)
                      </span>
                    </div>
                    <Progress value={effect.percentage} className="h-1.5" />
                  </div>
                ))}
              </div>
            )}

            {/* Tips */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-primary" />
                Tipps zur Reduktion
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Mit einer Mahlzeit injizieren</li>
                <li>• Dosis reduzieren (z.B. 0.25mg)</li>
                <li>• Langsamer titrieren</li>
                <li>• Intervall verlängern</li>
              </ul>
            </div>
          </>
        )}

        {logs.length < 3 && (
          <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Info className="w-3 h-3" />
            Mehr Daten für aussagekräftige Statistiken sammeln
          </div>
        )}
      </CardContent>
    </Card>
  );
}
