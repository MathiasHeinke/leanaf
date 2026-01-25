import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrainingPillarCard } from "./TrainingPillarCard";
import { LogTrainingDialog } from "./LogTrainingDialog";
import { useWeeklyTraining } from "@/hooks/useWeeklyTraining";
import { Dumbbell, Heart, Zap, Plus, Calendar, Trophy, Thermometer } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

export function Training3SaeulenTracker() {
  const { stats, loading, refetch } = useWeeklyTraining();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  const allGoalsReached =
    stats.rptProgress >= 100 &&
    stats.zone2Progress >= 100 &&
    stats.vo2maxProgress >= 100;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                Training diese Woche
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {format(stats.weekStart, 'dd. MMM', { locale: de })} - {format(stats.weekEnd, 'dd. MMM yyyy', { locale: de })}
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Training eintragen
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Celebration Banner */}
          {allGoalsReached && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <Trophy className="h-6 w-6 text-green-500" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-400">
                  🏆 Alle Wochenziele erreicht!
                </p>
                <p className="text-sm text-green-600/80 dark:text-green-400/80">
                  Großartige Arbeit diese Woche!
                </p>
              </div>
            </div>
          )}

          {/* 4 Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <TrainingPillarCard
              title="RPT Krafttraining"
              description="Reverse Pyramid Training"
              icon={Dumbbell}
              iconColor="text-orange-500"
              iconBgColor="bg-orange-500/10"
              current={stats.rptSessions}
              goal={stats.rptGoal}
              unit="Sessions"
              progress={stats.rptProgress}
            />
            <TrainingPillarCard
              title="Zone 2 Cardio"
              description="Lockere Ausdauer"
              icon={Heart}
              iconColor="text-red-500"
              iconBgColor="bg-red-500/10"
              current={stats.zone2Minutes}
              goal={stats.zone2Goal}
              unit="Minuten"
              progress={stats.zone2Progress}
            />
            <TrainingPillarCard
              title="VO2max HIIT"
              description="Intensive Intervalle"
              icon={Zap}
              iconColor="text-yellow-500"
              iconBgColor="bg-yellow-500/10"
              current={stats.vo2maxSessions}
              goal={stats.vo2maxGoal}
              unit="Session"
              progress={stats.vo2maxProgress}
            />
            <TrainingPillarCard
              title="Sauna"
              description="≥80°C Heat Shock"
              icon={Thermometer}
              iconColor="text-amber-500"
              iconBgColor="bg-amber-500/10"
              current={stats.saunaSessions}
              goal={stats.saunaGoal}
              unit="Sessions"
              progress={stats.saunaProgress}
            />
          </div>
        </CardContent>
      </Card>

      <LogTrainingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={refetch}
      />
    </>
  );
}
