import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WeekCounter } from "./WeekCounter";
import { KFAProgressCard } from "./KFAProgressCard";
import { ActiveProtocolsGrid } from "./ActiveProtocolsGrid";
import { usePhaseProgress } from "@/hooks/usePhaseProgress";
import { useProtocols } from "@/hooks/useProtocols";
import { Flame } from "lucide-react";

export function Phase1Dashboard() {
  const { progress, loading: progressLoading } = usePhaseProgress();
  const { protocols, loading: protocolsLoading } = useProtocols();

  const loading = progressLoading || protocolsLoading;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const activeProtocols = protocols.filter(p => p.is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-orange-500/20">
              <Flame className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Phase {progress.currentPhase}: Aggressive Rekomposition</h2>
              <p className="text-sm text-muted-foreground">
                Maximale Fettreduktion, Insulinsensitivität wiederherstellen
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WeekCounter
          currentWeek={progress.currentWeek}
          totalWeeks={progress.totalWeeks}
          phaseStartDate={progress.phaseStartDate}
        />
        <KFAProgressCard
          startKFA={progress.startKFA}
          currentKFA={progress.currentKFA}
          targetKFA={progress.targetKFA}
          progress={progress.kfaProgress}
          trend={progress.kfaTrend}
        />
      </div>

      {/* Active Protocols */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Aktive Protokolle ({activeProtocols.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ActiveProtocolsGrid protocols={activeProtocols} />
        </CardContent>
      </Card>
    </div>
  );
}
