import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrainingQuickAdd } from '@/components/TrainingQuickAdd';
import { TrainingHistory } from '@/components/TrainingHistory';
import { CustomExerciseManager } from '@/components/CustomExerciseManager';
import { TodaysTrainingStatus } from '@/components/TodaysTrainingStatus';
import { TrainingStats } from '@/components/TrainingStats';
import { useAuth } from '@/hooks/useAuth';
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
  Clock
} from 'lucide-react';

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
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    totalSets: 0,
    totalVolume: 0,
    averageIntensity: 0,
    exercisesCount: 0,
    sessionsThisWeek: 0
  });
  const [isLoading, setIsLoading] = useState(true);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Dumbbell className="h-8 w-8 text-primary" />
            Workout
          </h1>
          <p className="text-muted-foreground mt-1">
            Intelligentes Training mit KI-Coach
          </p>
        </div>
        <Badge className="bg-gradient-primary text-white px-4 py-2">
          Advanced
        </Badge>
      </div>

      {/* Responsive Grid Layout */}
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
        <TrainingStats stats={weeklyStats} />
        
        <TodaysTrainingStatus 
          todaysSessions={getTodaysSessions()}
          onStartTraining={() => setShowQuickAdd(true)}
        />
      </div>

      {/* Quick Actions - Enhanced Responsive Grid */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {/* Enhanced Prominent Coach Sascha Card */}
        <Card className="border-primary/20 hover:border-primary/40 transition-all cursor-pointer group hover:shadow-lg min-h-[200px]"
              onClick={() => navigate('/training/sascha')}>
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform">
                <img 
                  src="/lovable-uploads/a684839c-6310-41c3-bd23-9ba6fb3cdf31.png" 
                  alt="Coach Sascha"
                  className="w-18 h-18 rounded-full object-cover"
                />
              </div>
              <div className="space-y-3">
                <div className="flex flex-col items-center gap-2">
                  <h3 className="font-bold text-xl">Coach Sascha</h3>
                  <Badge variant="secondary" className="text-sm bg-primary/10 text-primary">KI-Trainingscoach</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Mit Sascha trainieren: KI-gestützte Formchecks, personalisierte Übungsanalyse und professionelle Trainingstipps für maximale Erfolge
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Badge variant="outline" className="text-xs">🎯 Formcheck</Badge>
                  <Badge variant="outline" className="text-xs">📹 Video-Analyse</Badge>
                  <Badge variant="outline" className="text-xs">💪 Personalisiert</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
      </div>

      {/* Custom Exercise Manager - Desktop Third Column */}
      <div className="xl:col-span-1 md:col-span-2">
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