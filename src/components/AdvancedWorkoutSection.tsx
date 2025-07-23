import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ExerciseQuickAdd } from '@/components/ExerciseQuickAdd';
import { ExerciseProgressCharts } from '@/components/ExerciseProgressCharts';
import { ExerciseSessionEditModal } from '@/components/ExerciseSessionEditModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dumbbell, TrendingUp, Calendar, Target, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

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
}

export const AdvancedWorkoutSection: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    totalSets: 0,
    totalVolume: 0,
    averageIntensity: 0,
    exercisesCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [editingSession, setEditingSession] = useState<ExerciseSession | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  const loadSessions = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Get sessions from the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
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
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;

      setSessions(data || []);
      calculateWeeklyStats(data || []);
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
      exercisesCount: uniqueExercises.size
    });
  };

  const formatDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    return `${diffMinutes} Min`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-primary" />
            getleanAI+ Training
          </h2>
          <p className="text-muted-foreground">Detailliertes Krafttraining-Tracking</p>
        </div>
        <Badge className="bg-gradient-primary text-white">
          Advanced
        </Badge>
      </div>

      {/* Weekly Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4 text-center">
            <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{weeklyStats.totalSets}</div>
            <div className="text-sm text-muted-foreground">Sätze (7 Tage)</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-secondary" />
            <div className="text-2xl font-bold">{weeklyStats.totalVolume.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Volumen (kg)</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5">
          <CardContent className="p-4 text-center">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-accent" />
            <div className="text-2xl font-bold">{weeklyStats.exercisesCount}</div>
            <div className="text-sm text-muted-foreground">Übungen</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-primary/10 to-accent/5">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold mb-1">⚡</div>
            <div className="text-2xl font-bold">{weeklyStats.averageIntensity}</div>
            <div className="text-sm text-muted-foreground">Ø RPE</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="add" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="add">Übung hinzufügen</TabsTrigger>
          <TabsTrigger value="progress">Fortschritt</TabsTrigger>
          <TabsTrigger value="history">Verlauf</TabsTrigger>
        </TabsList>

        <TabsContent value="add" className="space-y-4">
          <ExerciseQuickAdd onSessionSaved={loadSessions} />
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <ExerciseProgressCharts />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trainingshistorie</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Lade Trainingshistorie...
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Noch keine Trainings aufgezeichnet. Starte mit deinem ersten Training!
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <Card key={session.id} className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold">{session.session_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(session.date), 'EEEE, d. MMMM yyyy', { locale: de })}
                            </p>
                            {session.start_time && session.end_time && (
                              <p className="text-sm text-muted-foreground">
                                Dauer: {formatDuration(session.start_time, session.end_time)}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="secondary">
                              {session.exercise_sets.length} Sätze
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingSession(session);
                                setIsEditModalOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {Object.entries(
                            session.exercise_sets.reduce((acc, set) => {
                              const exerciseName = set.exercises.name;
                              if (!acc[exerciseName]) {
                                acc[exerciseName] = [];
                              }
                              acc[exerciseName].push(set);
                              return acc;
                            }, {} as Record<string, typeof session.exercise_sets[0][]>)
                          ).map(([exerciseName, sets]) => (
                            <div key={exerciseName} className="p-3 bg-secondary/20 rounded-lg">
                              <h5 className="font-medium mb-2">{exerciseName}</h5>
                              <div className="grid grid-cols-3 gap-2 text-sm">
                                {sets.map((set, index) => (
                                  <div key={set.id} className="text-center">
                                    <span className="text-muted-foreground">Satz {set.set_number}: </span>
                                    <span className="font-medium">
                                      {set.weight_kg}kg × {set.reps}
                                      {set.rpe && ` (RPE: ${set.rpe})`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ExerciseSessionEditModal
        session={editingSession}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingSession(null);
        }}
        onSessionUpdated={loadSessions}
      />
    </div>
  );
};