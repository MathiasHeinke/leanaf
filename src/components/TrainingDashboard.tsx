import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrainingQuickAdd } from '@/components/TrainingQuickAdd';
import { TrainingHistory } from '@/components/TrainingHistory';
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
            Intelligentes Krafttraining mit KI-Coach
          </p>
        </div>
        <Badge className="bg-gradient-primary text-white px-4 py-2">
          Advanced
        </Badge>
      </div>

      {/* Stats Overview and Today's Status */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TrainingStats stats={weeklyStats} />
        
        <TodaysTrainingStatus 
          todaysSessions={getTodaysSessions()}
          onStartTraining={() => setShowQuickAdd(true)}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/20 hover:border-primary/40 transition-colors cursor-pointer group" 
              onClick={() => setShowQuickAdd(true)}>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Training hinzufügen</h3>
            <p className="text-sm text-muted-foreground">
              Neue Übung schnell erfassen
            </p>
          </CardContent>
        </Card>

        <Card className="border-secondary/20 hover:border-secondary/40 transition-colors cursor-pointer group"
              onClick={() => navigate('/training/sascha')}>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-secondary/20 transition-colors">
              <MessageCircle className="h-6 w-6 text-secondary" />
            </div>
            <h3 className="font-semibold mb-1">Coach Sascha</h3>
            <p className="text-sm text-muted-foreground">
              Personalisierte Trainingstipps
            </p>
          </CardContent>
        </Card>

        <Card className="border-accent/20 hover:border-accent/40 transition-colors cursor-pointer group"
              onClick={() => setShowHistory(true)}>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-accent/20 transition-colors">
              <BarChart3 className="h-6 w-6 text-accent" />
            </div>
            <h3 className="font-semibold mb-1">Trainingshistorie</h3>
            <p className="text-sm text-muted-foreground">
              Verlauf und Fortschritte
            </p>
          </CardContent>
        </Card>
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