
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
  Zap,
  Camera,
  Eye
} from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface TransformationStats {
  currentWeight: number;
  startWeight: number;
  targetWeight: number;
  currentBodyFat: number;
  startBodyFat: number;
  targetBodyFat: number;
  currentMuscle: number;
  startMuscle: number;
  targetMuscle: number;
  currentBellySize: number;
  startBellySize: number;
  targetBellySize: number;
  weeklyDeficit: number;
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

      // Load weight history with body composition
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

      // Calculate weekly calorie deficit
      const weeklyDeficit = 0; // Would need meal data calculation

      const currentBellySize = measurements?.[0]?.belly || 0;
      const startBellySize = measurements?.[measurements.length - 1]?.belly || currentBellySize;
      
      // Determine start weight: profile.start_weight > first weight entry > current weight
      const startWeight = profile?.start_weight || firstWeight?.weight || latestWeight?.weight || profile?.weight || 0;
      const currentWeight = latestWeight?.weight || profile?.weight || 0;
      const targetWeight = profile?.target_weight || 0;

      // Body composition data
      const currentBodyFat = latestWeight?.body_fat_percentage || 0;
      const startBodyFat = firstWeight?.body_fat_percentage || currentBodyFat;
      const targetBodyFat = Math.max(8, startBodyFat * 0.7); // Target: 30% reduction, min 8%

      const currentMuscle = latestWeight?.muscle_percentage || 0;
      const startMuscle = firstWeight?.muscle_percentage || currentMuscle;
      const targetMuscle = Math.min(60, startMuscle * 1.15); // Target: 15% increase, max 60%

      // Progress photos
      const latestPhotos = latestWeight?.photo_urls || [];
      const firstPhotos = firstWeight?.photo_urls || [];
      
      setStats({
        currentWeight,
        startWeight,
        targetWeight,
        currentBodyFat,
        startBodyFat,
        targetBodyFat,
        currentMuscle,
        startMuscle,
        targetMuscle,
        currentBellySize,
        startBellySize,
        targetBellySize: startBellySize * 0.9, // 10% reduction target
        weeklyDeficit,
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

  const calculateBodyFatProgress = () => {
    if (!stats || stats.startBodyFat === 0 || stats.targetBodyFat === 0) return 0;
    
    const totalBodyFatToLose = Math.abs(stats.startBodyFat - stats.targetBodyFat);
    const bodyFatAlreadyLost = Math.abs(stats.startBodyFat - stats.currentBodyFat);
    
    if (totalBodyFatToLose === 0) return 0;
    
    const progress = (bodyFatAlreadyLost / totalBodyFatToLose) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  const calculateMuscleProgress = () => {
    if (!stats || stats.startMuscle === 0 || stats.targetMuscle === 0) return 0;
    
    const totalMuscleToGain = Math.abs(stats.targetMuscle - stats.startMuscle);
    const muscleAlreadyGained = Math.abs(stats.currentMuscle - stats.startMuscle);
    
    if (totalMuscleToGain === 0) return 0;
    
    const progress = (muscleAlreadyGained / totalMuscleToGain) * 100;
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
  const bodyFatProgress = calculateBodyFatProgress();
  const muscleProgress = calculateMuscleProgress();
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
              <Zap className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">Körperfett</span>
            </div>
            <div className="text-2xl font-bold">{stats.currentBodyFat.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">
              Ziel: {stats.targetBodyFat.toFixed(1)}%
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Muskelmasse</span>
            </div>
            <div className="text-2xl font-bold">{stats.currentMuscle.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">
              Ziel: {stats.targetMuscle.toFixed(1)}%
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Training</span>
            </div>
            <div className="text-2xl font-bold">{stats.workoutsThisWeek}</div>
            <div className="text-sm text-muted-foreground">
              Diese Woche
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

        {/* Progress Cards */}
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

          <Card className="p-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-red-600" />
                Körperfett Reduktion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Fortschritt</span>
                  <span>{bodyFatProgress.toFixed(1)}%</span>
                </div>
                <Progress value={bodyFatProgress} className="h-2" />
              </div>
              <div className="text-sm text-muted-foreground">
                Noch {Math.abs(stats.currentBodyFat - stats.targetBodyFat).toFixed(1)}% bis zum Ziel
              </div>
            </CardContent>
          </Card>

          {stats.currentMuscle > 0 && (
            <Card className="p-6">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  Muskelaufbau
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Fortschritt</span>
                    <span>{muscleProgress.toFixed(1)}%</span>
                  </div>
                  <Progress value={muscleProgress} className="h-2" />
                </div>
                <div className="text-sm text-muted-foreground">
                  Noch {Math.abs(stats.targetMuscle - stats.currentMuscle).toFixed(1)}% bis zum Ziel
                </div>
              </CardContent>
            </Card>
          )}

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
