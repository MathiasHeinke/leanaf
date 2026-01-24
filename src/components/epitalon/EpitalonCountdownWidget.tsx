import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEpitalonCycles } from "@/hooks/useEpitalonCycles";
import { Syringe, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EpitalonCountdownWidgetProps {
  compact?: boolean;
}

export function EpitalonCountdownWidget({ compact = false }: EpitalonCountdownWidgetProps) {
  const { activeCycle, getDaysUntilNextCycle, isNextCycleDue, loading } = useEpitalonCycles();

  if (loading) {
    return (
      <Card className={cn("border-purple-500/20", compact && "p-2")}>
        <CardContent className={cn("flex items-center justify-center", compact ? "p-2" : "p-4")}>
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const daysUntil = getDaysUntilNextCycle();
  const isDue = isNextCycleDue();

  // Active cycle
  if (activeCycle) {
    const daysRemaining = activeCycle.duration_days - activeCycle.current_day;
    return (
      <Card className={cn("border-purple-500/30 bg-purple-500/5", compact && "p-2")}>
        <CardContent className={cn("flex items-center gap-3", compact ? "p-2" : "p-4")}>
          <Syringe className="w-5 h-5 text-purple-500" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">Epitalon aktiv</p>
            <p className="text-xs text-muted-foreground">
              Tag {activeCycle.current_day}/{activeCycle.duration_days} • {daysRemaining} verbleibend
            </p>
          </div>
          <Badge className="bg-purple-500 text-white">Aktiv</Badge>
        </CardContent>
      </Card>
    );
  }

  // Due for next cycle
  if (isDue) {
    return (
      <Card className={cn("border-amber-500/30 bg-amber-500/5", compact && "p-2")}>
        <CardContent className={cn("flex items-center gap-3", compact ? "p-2" : "p-4")}>
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">Epitalon-Zyklus fällig</p>
            <p className="text-xs text-muted-foreground">
              Zeit für deinen halbjährlichen Zyklus
            </p>
          </div>
          <Badge variant="outline" className="border-amber-500 text-amber-500">Fällig</Badge>
        </CardContent>
      </Card>
    );
  }

  // Countdown to next cycle
  if (daysUntil !== null) {
    const weeksUntil = Math.floor(daysUntil / 7);
    return (
      <Card className={cn("border-muted", compact && "p-2")}>
        <CardContent className={cn("flex items-center gap-3", compact ? "p-2" : "p-4")}>
          <CheckCircle className="w-5 h-5 text-green-500" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">Nächster Epitalon-Zyklus</p>
            <p className="text-xs text-muted-foreground">
              In {daysUntil} Tagen ({weeksUntil} Wochen)
            </p>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold">{daysUntil}</span>
            <span className="text-xs text-muted-foreground ml-1">Tage</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No cycles yet
  return (
    <Card className={cn("border-muted", compact && "p-2")}>
      <CardContent className={cn("flex items-center gap-3", compact ? "p-2" : "p-4")}>
        <Syringe className="w-5 h-5 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">Epitalon</p>
          <p className="text-xs text-muted-foreground">
            Noch kein Zyklus gestartet
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
