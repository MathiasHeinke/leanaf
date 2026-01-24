import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBioAge } from "@/hooks/useBioAge";
import { Clock, TrendingDown, TrendingUp, Minus, Sparkles, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface BioAgeWidgetProps {
  chronologicalAge: number;
  compact?: boolean;
}

const getPaceLabel = (pace: number): { label: string; color: string } => {
  if (pace <= 0.65) return { label: 'Elite', color: 'bg-green-500' };
  if (pace <= 0.80) return { label: 'Excellent', color: 'bg-emerald-500' };
  if (pace <= 0.95) return { label: 'Good', color: 'bg-blue-500' };
  if (pace <= 1.05) return { label: 'Average', color: 'bg-yellow-500' };
  return { label: 'Accelerated', color: 'bg-red-500' };
};

export function BioAgeWidget({ chronologicalAge, compact = false }: BioAgeWidgetProps) {
  const { latestMeasurement, loading } = useBioAge();

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!latestMeasurement) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-muted-foreground">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="font-medium">Kein Bio-Age Test</p>
          <p className="text-sm">DunedinPACE oder Proxy hinzufügen</p>
        </CardContent>
      </Card>
    );
  }

  const bioAge = latestMeasurement.calculated_bio_age || chronologicalAge;
  const ageDiff = bioAge - chronologicalAge;
  const isDunedinPace = latestMeasurement.measurement_type === 'dunedin_pace';
  const paceScore = latestMeasurement.dunedin_pace;

  const TrendIcon = ageDiff < 0 ? TrendingDown : ageDiff > 0 ? TrendingUp : Minus;
  const trendColor = ageDiff < 0 ? 'text-green-600' : ageDiff > 0 ? 'text-red-600' : 'text-muted-foreground';
  const bgGradient = ageDiff < 0 
    ? 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20' 
    : ageDiff > 0 
    ? 'from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20' 
    : 'from-muted/50 to-muted/30';

  const paceInfo = paceScore ? getPaceLabel(paceScore) : null;

  if (compact) {
    return (
      <Card className={`bg-gradient-to-br ${bgGradient}`}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium">Bio-Age</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{bioAge}</span>
            <span className={`text-sm font-medium ${trendColor}`}>
              {ageDiff > 0 ? '+' : ''}{ageDiff}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-gradient-to-br ${bgGradient}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Biologisches Alter
          </CardTitle>
          {isDunedinPace && paceInfo && (
            <Badge className={paceInfo.color}>{paceInfo.label}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Age Display */}
        <div className="grid grid-cols-3 gap-4 text-center">
          {/* Bio Age */}
          <div>
            <div className="text-4xl font-bold">{bioAge}</div>
            <div className="text-xs text-muted-foreground">Bio-Age</div>
          </div>

          {/* Difference */}
          <div className="flex flex-col items-center justify-center">
            <TrendIcon className={`w-6 h-6 ${trendColor}`} />
            <div className={`text-xl font-semibold ${trendColor}`}>
              {ageDiff > 0 ? '+' : ''}{ageDiff}
            </div>
            <div className="text-xs text-muted-foreground">
              {ageDiff < 0 ? 'Jahre jünger' : ageDiff > 0 ? 'Jahre älter' : 'Jahre'}
            </div>
          </div>

          {/* Chrono Age */}
          <div>
            <div className="text-4xl font-bold text-muted-foreground">{chronologicalAge}</div>
            <div className="text-xs text-muted-foreground">Chrono-Age</div>
          </div>
        </div>

        {/* DunedinPACE Score */}
        {isDunedinPace && paceScore && (
          <div className="p-3 bg-background/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">DunedinPACE Score</div>
                <div className="text-xs text-muted-foreground">
                  {paceScore < 1 ? 'Altert langsamer als Durchschnitt' : 'Altert schneller als Durchschnitt'}
                </div>
              </div>
              <div className="text-2xl font-mono font-bold">{paceScore.toFixed(2)}</div>
            </div>

            {/* Visual scale */}
            <div className="relative h-2 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full">
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-foreground rounded-full shadow"
                style={{ left: `${Math.min(Math.max((paceScore - 0.4) / 0.8 * 100, 0), 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.40 (Elite)</span>
              <span>1.00 (Ø)</span>
              <span>1.20 (Fast)</span>
            </div>
          </div>
        )}

        {/* Measurement date */}
        {latestMeasurement.measured_at && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>
              Gemessen: {format(new Date(latestMeasurement.measured_at), 'dd. MMM yyyy', { locale: de })}
              {latestMeasurement.test_provider && ` • ${latestMeasurement.test_provider}`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
