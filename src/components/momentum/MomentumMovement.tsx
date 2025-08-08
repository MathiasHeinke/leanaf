import React, { useEffect, useMemo, useState, Suspense, lazy } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Footprints, Dumbbell, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDataRefresh } from "@/hooks/useDataRefresh";
import { toast } from "sonner";

interface MovementStats {
  steps: number;
  distanceKm: number;
  workoutsCount: number;
  workoutMinutes: number;
}

export const MomentumMovement: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<MovementStats>({ steps: 0, distanceKm: 0, workoutsCount: 0, workoutMinutes: 0 });
  const [openQuick, setOpenQuick] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const fetchStats = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("workouts")
        .select("duration_minutes, steps, distance_km, did_workout")
        .eq("user_id", user.id)
        .eq("date", todayStr)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const rows = data || [];
      const totalSteps = rows.reduce((s, r: any) => s + Number(r.steps || 0), 0);
      const totalKm = rows.reduce((s, r: any) => s + Number(r.distance_km || 0), 0);
      const workouts = rows.filter((r: any) => !!r.did_workout);
      const workoutMinutes = workouts.reduce((s, r: any) => s + Number(r.duration_minutes || 0), 0);

      setStats({ steps: totalSteps, distanceKm: totalKm, workoutsCount: workouts.length, workoutMinutes });
    } catch (e: any) {
      console.error("Failed to load movement stats", e);
      toast.error("Fehler beim Laden der Bewegungsdaten");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, todayStr]);

  useDataRefresh(fetchStats);

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-medium">Bewegung</div>
            <div className="text-xs text-muted-foreground">Schritte · Distanz · Workouts</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setOpenQuick(true)}>Eintragen</Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 rounded-md bg-secondary animate-pulse" />
            <div className="h-16 rounded-md bg-secondary animate-pulse" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/60 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Footprints className="h-4 w-4" /> Schritte</div>
              <div className="text-lg font-semibold tabular-nums">{stats.steps.toLocaleString()}<span className="text-xs font-normal text-muted-foreground"> steps</span></div>
              <div className="text-xs text-muted-foreground">{stats.distanceKm.toFixed(1)} km</div>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Dumbbell className="h-4 w-4" /> Workouts</div>
              <div className="text-lg font-semibold tabular-nums">{stats.workoutsCount}<span className="text-xs font-normal text-muted-foreground"> Sessions</span></div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground"><Timer className="h-3 w-3" /> {stats.workoutMinutes} Min</div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Quick add via existing modal */}
      <Suspense fallback={null}>
        {openQuick && (
          <QuickWorkoutModal isOpen={openQuick} onClose={() => setOpenQuick(false)} contextData={{ recommendedType: 'walking' }} />
        )}
      </Suspense>
    </Card>
  );
};

// Lazy import to avoid initial bundle increase
const QuickWorkoutModal = lazy(() =>
  import("@/components/QuickWorkoutModal").then((m) => ({ default: m.QuickWorkoutModal }))
);
