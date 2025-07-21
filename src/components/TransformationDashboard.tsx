
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ProgressCharts } from "./ProgressCharts";
import { WorkoutCalendar } from "./WorkoutCalendar";
import { 
  Target, 
  TrendingDown, 
  Award, 
  Calendar,
  Ruler,
  Scale,
  Activity,
  Zap
} from "lucide-react";

interface TransformationStats {
  currentWeight: number;
  targetWeight: number;
  currentBellySize: number;
  startBellySize: number;
  targetBellySize: number;
  weeklyDeficit: number;
  workoutsThisWeek: number;
  measurementsThisMonth: number;
}

export const TransformationDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<TransformationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTransformationStats();
    }
  }, [user]);

  const loadTransformationStats = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Load user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Load latest weight
      const { data: latestWeight } = await supabase
        .from('weight_history')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      // Load latest and first body measurements
      const { data: measurements } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      // Load this week's workouts
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      
      const { data: thisWeekWorkouts } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .eq('did_workout', true)
        .gte('date', weekStart.toISOString().split('T')[0]);

      // Load this month's measurements
      const monthStart = new Date();
      monthStart.setDate(1);
      
      const { data: thisMonthMeasurements } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', monthStart.toISOString().split('T')[0]);

      // Calculate weekly calorie deficit
      const weeklyDeficit = 0; // Would need meal data calculation

      const currentBellySize = measurements?.[0]?.belly || 0;
      const startBellySize = measurements?.[measurements.length - 1]?.belly || currentBellySize;
      
      setStats({
        currentWeight: latestWeight?.weight || profile?.weight || 0,
        targetWeight: profile?.target_weight || 0,
        currentBellySize,
        startBellySize,
        targetBellySize: startBellySize * 0.9, // 10% reduction target
        weeklyDeficit,
        workoutsThisWeek: thisWeekWorkouts?.length || 0,
        measurementsThisMonth: thisMonthMeasurements?.length || 0
      });
    } catch (error) {
      console.error('Error loading transformation stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="font-medium mb-2">Transformation Dashboard</h3>
          <p className="text-sm text-muted-foreground">
            Erfasse deine ersten Daten um deine Transformation zu verfolgen
          </p>
        </div>
      </Card>
    );
  }

  const weightProgress = stats.targetWeight > 0 
    ? Math.min(100, Math.max(0, ((stats.currentWeight - stats.targetWeight) / (stats.currentWeight - stats.targetWeight)) * 100))
    : 0;

  const bellyProgress = stats.startBellySize > 0 
    ? Math.min(100, Math.max(0, ((stats.startBellySize - stats.currentBellySize) / (stats.startBellySize - stats.targetBellySize)) * 100))
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Gewicht</span>
          </div>
          <div className="text-2xl font-bold">{stats.currentWeight.toFixed(1)} kg</div>
          <div className="text-sm text-muted-foreground">
            Ziel: {stats.targetWeight.toFixed(1)} kg
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Ruler className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium">Bauchumfang</span>
          </div>
          <div className="text-2xl font-bold">{stats.currentBellySize.toFixed(1)} cm</div>
          <div className="text-sm text-muted-foreground">
            Ziel: {stats.targetBellySize.toFixed(1)} cm
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Training</span>
          </div>
          <div className="text-2xl font-bold">{stats.workoutsThisWeek}</div>
          <div className="text-sm text-muted-foreground">
            Diese Woche
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium">Messungen</span>
          </div>
          <div className="text-2xl font-bold">{stats.measurementsThisMonth}</div>
          <div className="text-sm text-muted-foreground">
            Diesen Monat
          </div>
        </Card>
      </div>

      {/* Progress Cards - Changed from grid-cols-1 md:grid-cols-2 to grid-cols-1 */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="p-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-blue-600" />
              Gewichtsziel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Fortschritt</span>
                <span>{weightProgress.toFixed(1)}%</span>
              </div>
              <Progress value={weightProgress} className="h-2" />
            </div>
            <div className="text-sm text-muted-foreground">
              Noch {Math.abs(stats.currentWeight - stats.targetWeight).toFixed(1)} kg bis zum Ziel
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-red-600" />
              Sixpack Ziel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Bauchumfang Reduktion</span>
                <span>{bellyProgress.toFixed(1)}%</span>
              </div>
              <Progress value={bellyProgress} className="h-2" />
            </div>
            <div className="text-sm text-muted-foreground">
              Noch {Math.abs(stats.currentBellySize - stats.targetBellySize).toFixed(1)} cm bis zum Ziel
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <ProgressCharts timeRange="month" />
      
      {/* Workout Calendar */}
      <WorkoutCalendar />
    </div>
  );
};
