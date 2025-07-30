import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrainingQuickAdd } from '@/components/TrainingQuickAdd';
import { TrainingHistory } from '@/components/TrainingHistory';
import { CustomExerciseManager } from '@/components/CustomExerciseManager';
import { TodaysTrainingStatus } from '@/components/TodaysTrainingStatus';
import { TrainingStats } from '@/components/TrainingStats';
import { WorkoutTimer } from '@/components/WorkoutTimer';
import { useAuth } from '@/hooks/useAuth';
import { useWorkoutTimer } from '@/hooks/useWorkoutTimer';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Dumbbell, 
  TrendingUp, 
  Calendar, 
  Target, 
  Plus,
  BarChart3,
  MessageCircle,
  Clock,
  Timer,
  Play,
  Square
} from 'lucide-react';
import { toast } from 'sonner';

interface ExerciseSession {
  id: string;
  session_name: string;
  date: string;
  start_time: string;
  end_time: string;
  notes: string;
  exercise_sets: {
    id: string;
    exercise_id: string;
    set_number: number;
    weight_kg: number;
    reps: number;
    rpe: number;
    exercises: {
      name: string;
      category: string;
    };
  }[];
}

interface WeeklyStats {
  totalSets: number;
  totalVolume: number;
  averageIntensity: number;
  exercisesCount: number;
  sessionsThisWeek: number;
}

export const TrainingDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isRunning, hasActiveTimer, formattedTime, startTimer, stopTimer } = useWorkoutTimer();
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    totalSets: 0,
    totalVolume: 0,
    averageIntensity: 0,
    exercisesCount: 0,
    sessionsThisWeek: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const handleStartWorkout = () => {
    startTimer();
    toast.success('Workout Timer gestartet! 🏋️‍♂️');
  };

  const handleStopWorkout = () => {
    const result = stopTimer();
    toast.success(`Workout beendet! Dauer: ${Math.floor(result.totalDurationMs / 60000)} Minuten`);
  };
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  const loadSessions = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Get sessions from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('exercise_sessions')
        .select(`
          id,
          session_name,
          date,
          start_time,
          end_time,
          notes,
          exercise_sets (
            id,
            exercise_id,
            set_number,
            weight_kg,
            reps,
            rpe,
            exercises (
              name,
              category
            )
          )
        `)
        .eq('user_id', user.id)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;

      const sessionsData = data || [];
      setSessions(sessionsData);
      
      // Calculate weekly stats
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentSessions = sessionsData.filter(session => 
        new Date(session.date) >= sevenDaysAgo
      );
      calculateWeeklyStats(recentSessions);
      
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateWeeklyStats = (sessionsData: ExerciseSession[]) => {
    const allSets = sessionsData.flatMap(session => session.exercise_sets);
    const totalSets = allSets.length;
    const totalVolume = allSets.reduce((sum, set) => sum + (set.weight_kg * set.reps), 0);
    const averageIntensity = allSets.length > 0 
      ? allSets.reduce((sum, set) => sum + (set.rpe || 0), 0) / allSets.length 
      : 0;
    const uniqueExercises = new Set(allSets.map(set => set.exercise_id));

    setWeeklyStats({
      totalSets,
      totalVolume: Math.round(totalVolume),
      averageIntensity: Math.round(averageIntensity * 10) / 10,
      exercisesCount: uniqueExercises.size,
      sessionsThisWeek: sessionsData.length
    });
  };

  const getTodaysSessions = () => {
    const today = new Date().toISOString().split('T')[0];
    return sessions.filter(session => session.date === today);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Timer - Centered Layout */}
      <div className="text-center space-y-4">
        <div>
          <h1 className="text-4xl font-bold flex items-center justify-center gap-3 mb-2">
            <Dumbbell className="h-10 w-10 text-primary" />
            Workout
          </h1>
          <p className="text-lg text-muted-foreground">
            Intelligentes Training mit KI-Coach
          </p>
        </div>
        
        {/* Timer Control Centered */}
        <div className="flex justify-center">
          {hasActiveTimer ? (
            <div className="flex items-center gap-3">
              <Badge variant={isRunning ? "default" : "secondary"} className="text-xl px-6 py-3 font-mono">
                <Timer className="h-5 w-5 mr-3" />
                {formattedTime}
                {isRunning && <div className="ml-3 w-3 h-3 bg-white rounded-full animate-pulse" />}
              </Badge>
              <Button variant="outline" size="lg" onClick={handleStopWorkout}>
                <Square className="h-5 w-5 mr-2" />
                Stop
              </Button>
            </div>
          ) : (
            <Button onClick={handleStartWorkout} size="lg" variant="default" className="font-medium px-8 py-4 text-lg">
              <Play className="h-5 w-5 mr-3" />
              Workout starten
            </Button>
          )}
        </div>
      </div>

      {/* KI Training Coaches */}
      <div className="grid gap-6 grid-cols-1">
        <Card className="border-primary/20 hover:border-primary/40 transition-all cursor-pointer group hover:shadow-lg min-h-[200px]"
              onClick={() => navigate('/training/sascha')}>
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform">
                <img 
                  src="/lovable-uploads/a684839c-6310-41c3-bd23-9ba6fb3cdf31.png" 
                  alt="Coach Sascha"
                  className="w-14 h-14 rounded-full object-cover"
                />
              </div>
              <div className="space-y-2">
                <div className="flex flex-col items-center gap-1">
                  <h3 className="font-bold text-lg">Coach Sascha</h3>
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">Performance Coach</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  KI-gestützte Formchecks, personalisierte Übungsanalyse und professionelle Trainingstipps
                </p>
                <div className="flex flex-wrap gap-1 justify-center">
                  <Badge variant="outline" className="text-xs">🎯 Formcheck</Badge>
                  <Badge variant="outline" className="text-xs">📹 Analyse</Badge>
                  <Badge variant="outline" className="text-xs">💪 Performance</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-500/20 hover:border-orange-500/40 transition-all cursor-pointer group hover:shadow-lg min-h-[200px]"
              onClick={() => navigate('/training/markus')}>
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-600/20 to-red-600/20 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform">
                <img 
                  src="/lovable-uploads/90efce37-f808-4894-8ea5-1093f3587aa4.png" 
                  alt="Coach Markus Rühl"
                  className="w-14 h-14 rounded-full object-cover"
                />
              </div>
              <div className="space-y-2">
                <div className="flex flex-col items-center gap-1">
                  <h3 className="font-bold text-lg">Markus Rühl</h3>
                  <Badge variant="secondary" className="text-xs bg-orange-500/10 text-orange-600">The German Beast</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Hardcore Bodybuilding-Legende. Heavy+Volume Training für maximale Muskelmasse!
                </p>
                <div className="flex flex-wrap gap-1 justify-center">
                  <Badge variant="outline" className="text-xs">🔥 Beast Mode</Badge>
                  <Badge variant="outline" className="text-xs">💀 Heavy+Volume</Badge>
                  <Badge variant="outline" className="text-xs">🦾 Hardcore</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Training Status and Stats */}
      <div className="grid gap-6 grid-cols-1">
        {/* Today's Training Status */}
        <TodaysTrainingStatus 
          todaysSessions={getTodaysSessions()}
          onStartTraining={() => setShowQuickAdd(true)}
        />

        {/* Training Stats */}
        <TrainingStats stats={weeklyStats} />
      </div>

      {/* Secondary Actions */}
      <div className="grid gap-6 grid-cols-1">        
        {/* Training History Card */}
        <Card className="border-accent/20 hover:border-accent/40 transition-all cursor-pointer group hover:shadow-lg"
              onClick={() => setShowHistory(true)}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform">
                <BarChart3 className="h-8 w-8 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">Trainingshistorie</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Analysiere deine Fortschritte und Entwicklung
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">{sessions.length}</strong> Sessions
                  </span>
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">{weeklyStats.totalSets}</strong> Sätze diese Woche
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custom Exercise Manager */}
        <CustomExerciseManager onExerciseAdded={loadSessions} />
      </div>

      {/* Recent Activity Preview */}
      {sessions.length > 0 && !showHistory && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Letzte Aktivität
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowHistory(true)}>
                Alle anzeigen
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sessions.slice(0, 3).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <h4 className="font-medium">{session.session_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(session.date).toLocaleDateString('de-DE')} • 
                      {session.exercise_sets.length} Sätze
                    </p>
                  </div>
                  <Badge variant="outline">
                    {session.exercise_sets[0]?.exercises.category}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals/Overlays */}
      {showQuickAdd && (
        <TrainingQuickAdd 
          onClose={() => setShowQuickAdd(false)}
          onSessionSaved={() => {
            loadSessions();
            setShowQuickAdd(false);
          }}
        />
      )}

      {showHistory && (
        <TrainingHistory 
          sessions={sessions}
          onClose={() => setShowHistory(false)}
          onSessionUpdated={loadSessions}
        />
      )}

    </div>
  );
};