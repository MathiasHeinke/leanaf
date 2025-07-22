
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ProgressCharts } from "./ProgressCharts";
import { WorkoutCalendar } from "./WorkoutCalendar";
import { PremiumGate } from '@/components/PremiumGate';
import { 
  Target, 
  TrendingDown, 
  Award, 
  Calendar,
  Ruler,
  Scale,
  Activity,
  Camera,
  Eye
} from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface TransformationStats {
  currentWeight: number;
  startWeight: number;
  targetWeight: number;
  currentBellySize: number;
  startBellySize: number;
  targetBellySize: number;
  workoutsThisWeek: number;
  measurementsThisMonth: number;
  latestPhotos: string[];
  firstPhotos: string[];
}

export const TransformationDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<TransformationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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

      // Load weight history
      const { data: weightHistory } = await supabase
        .from('weight_history')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      // Load first and latest weight entries
      const latestWeight = weightHistory?.[0];
      const firstWeight = weightHistory?.[weightHistory.length - 1];

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

      const currentBellySize = measurements?.[0]?.belly || 0;
      const startBellySize = measurements?.[measurements.length - 1]?.belly || currentBellySize;
      
      // Determine start weight: profile.start_weight > first weight entry > current weight
      const startWeight = profile?.start_weight || firstWeight?.weight || latestWeight?.weight || profile?.weight || 0;
      const currentWeight = latestWeight?.weight || profile?.weight || 0;
      const targetWeight = profile?.target_weight || 0;

      // Progress photos
      const latestPhotos = Array.isArray(latestWeight?.photo_urls) 
        ? latestWeight.photo_urls.filter((url): url is string => typeof url === 'string') 
        : [];
      const firstPhotos = Array.isArray(firstWeight?.photo_urls) 
        ? firstWeight.photo_urls.filter((url): url is string => typeof url === 'string') 
        : [];
      
      setStats({
        currentWeight,
        startWeight,
        targetWeight,
        currentBellySize,
        startBellySize,
        targetBellySize: startBellySize * 0.9, // 10% reduction target
        workoutsThisWeek: thisWeekWorkouts?.length || 0,
        measurementsThisMonth: thisMonthMeasurements?.length || 0,
        latestPhotos,
        firstPhotos
      });
    } catch (error) {
      console.error('Error loading transformation stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWeightProgress = () => {
    if (!stats || stats.startWeight === 0 || stats.targetWeight === 0) return 0;
    
    const totalWeightToLose = Math.abs(stats.startWeight - stats.targetWeight);
    const weightAlreadyLost = Math.abs(stats.startWeight - stats.currentWeight);
    
    if (totalWeightToLose === 0) return 0;
    
    const progress = (weightAlreadyLost / totalWeightToLose) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  const calculateBellyProgress = () => {
    if (!stats || stats.startBellySize === 0) return 0;
    
    const totalBellyReduction = Math.abs(stats.startBellySize - stats.targetBellySize);
    const bellyAlreadyReduced = Math.abs(stats.startBellySize - stats.currentBellySize);
    
    if (totalBellyReduction === 0) return 0;
    
    const progress = (bellyAlreadyReduced / totalBellyReduction) * 100;
    return Math.min(100, Math.max(0, progress));
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

  const weightProgress = calculateWeightProgress();
  const bellyProgress = calculateBellyProgress();

  return (
    <PremiumGate 
      feature="transformation_dashboard"
      fallbackMessage="Das detaillierte Transformation Dashboard ist ein Premium Feature. Upgrade für umfassende Fortschritts-Analysen!"
    >
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-2 gap-4">
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
              <Ruler className="h-4 w-4 text-purple-600" />
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
              <Calendar className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Messungen</span>
            </div>
            <div className="text-2xl font-bold">{stats.measurementsThisMonth}</div>
            <div className="text-sm text-muted-foreground">
              Diesen Monat
            </div>
          </Card>
        </div>

        {/* Progress Photos Comparison */}
        {(stats.firstPhotos.length > 0 || stats.latestPhotos.length > 0) && (
          <Card className="p-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                Progress Fotos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Before Photos */}
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Vorher</h4>
                  <div className="flex gap-2 flex-wrap">
                    {stats.firstPhotos.slice(0, 3).map((url, index) => (
                      <Dialog key={index}>
                        <DialogTrigger asChild>
                          <button className="relative group">
                            <img
                              src={url}
                              alt={`Vorher ${index + 1}`}
                              className="w-20 h-20 object-cover rounded border hover:opacity-80 transition-opacity"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                              <Eye className="h-4 w-4 text-white" />
                            </div>
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <img
                            src={url}
                            alt={`Vorher ${index + 1}`}
                            className="w-full h-auto max-h-[80vh] object-contain rounded"
                          />
                        </DialogContent>
                      </Dialog>
                    ))}
                    {stats.firstPhotos.length === 0 && (
                      <div className="w-20 h-20 bg-muted rounded border flex items-center justify-center">
                        <Camera className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>

                {/* After Photos */}
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Nachher</h4>
                  <div className="flex gap-2 flex-wrap">
                    {stats.latestPhotos.slice(0, 3).map((url, index) => (
                      <Dialog key={index}>
                        <DialogTrigger asChild>
                          <button className="relative group">
                            <img
                              src={url}
                              alt={`Nachher ${index + 1}`}
                              className="w-20 h-20 object-cover rounded border hover:opacity-80 transition-opacity"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                              <Eye className="h-4 w-4 text-white" />
                            </div>
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <img
                            src={url}
                            alt={`Nachher ${index + 1}`}
                            className="w-full h-auto max-h-[80vh] object-contain rounded"
                          />
                        </DialogContent>
                      </Dialog>
                    ))}
                    {stats.latestPhotos.length === 0 && (
                      <div className="w-20 h-20 bg-muted rounded border flex items-center justify-center">
                        <Camera className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Cards - Only Weight and Belly Goals */}
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
              {stats.startWeight !== stats.currentWeight && (
                <div className="text-xs text-muted-foreground">
                  Bereits {Math.abs(stats.startWeight - stats.currentWeight).toFixed(1)} kg von {Math.abs(stats.startWeight - stats.targetWeight).toFixed(1)} kg geschafft
                </div>
              )}
            </CardContent>
          </Card>

          {stats.currentBellySize > 0 && (
            <Card className="p-6">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-600" />
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
                <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded">
                  <strong>Tipp:</strong> Ein reduzierter Bauchumfang ist oft der beste Indikator für einen gesunden Körperfettanteil und Sixpack-Entwicklung.
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Charts */}
        <ProgressCharts timeRange="month" />
        
        {/* Workout Calendar */}
        <WorkoutCalendar />
      </div>
    </PremiumGate>
  );
};
