import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Leaf, AlertCircle, CheckCircle, Loader2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSenolytCycles } from '@/hooks/useSenolytCycles';

interface SenolytCountdownWidgetProps {
  compact?: boolean;
}

export function SenolytCountdownWidget({ compact = false }: SenolytCountdownWidgetProps) {
  const { activeCycle, getDaysUntilNextCycle, isNextCycleDue, loading, getCycleStats } = useSenolytCycles();

  if (loading) {
    return (
      <Card className={cn(compact && 'border-0 shadow-none')}>
        <CardContent className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const daysUntilNext = getDaysUntilNextCycle();
  const cycleDue = isNextCycleDue();
  const stats = getCycleStats();

  // Active cycle
  if (activeCycle) {
    const daysRemaining = activeCycle.duration_days - activeCycle.current_day;
    return (
      <Card className={cn(
        'border-green-500/50 bg-green-500/5',
        compact && 'border-0 shadow-none'
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-500" />
            <CardTitle className="text-base">Senolytischer Zyklus aktiv</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tag {activeCycle.current_day}/{activeCycle.duration_days}</span>
            <Badge className="bg-green-500">
              {daysRemaining > 0 ? `${daysRemaining} Tag(e) übrig` : 'Letzter Tag'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Cycle due
  if (cycleDue) {
    return (
      <Card className={cn(
        'border-amber-500/50 bg-amber-500/5',
        compact && 'border-0 shadow-none'
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <CardTitle className="text-base">Senolytika-Zyklus fällig</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Es ist Zeit für den nächsten Hit-and-Run Zyklus.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Countdown to next cycle
  if (daysUntilNext !== null && daysUntilNext > 0) {
    const weeks = Math.floor(daysUntilNext / 7);
    const days = daysUntilNext % 7;
    
    return (
      <Card className={cn(compact && 'border-0 shadow-none')}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Nächster Senolytika-Zyklus</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {stats.totalCycles > 0 ? `${stats.totalCycles} Zyklen abgeschlossen` : 'Bereit zum Starten'}
            </span>
            <Badge variant="outline">
              {weeks > 0 ? `${weeks}W ${days}T` : `${days} Tage`}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No cycles yet
  return (
    <Card className={cn(compact && 'border-0 shadow-none')}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Leaf className="w-5 h-5 text-muted-foreground" />
          <CardTitle className="text-base">Senolytika</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Noch kein Hit-and-Run Zyklus gestartet.
        </p>
      </CardContent>
    </Card>
  );
}
