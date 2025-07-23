import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExerciseQuickAdd } from '@/components/ExerciseQuickAdd';
import { ExerciseProgressCharts } from '@/components/ExerciseProgressCharts';
import { ExerciseSessionEditModal } from '@/components/ExerciseSessionEditModal';
import { DayCard } from '@/components/DayCard';
import { MonthCard } from '@/components/MonthCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dumbbell, TrendingUp, Calendar, Target, RotateCcw } from 'lucide-react';
import { format, startOfMonth, subMonths, isThisMonth, isSameMonth } from 'date-fns';
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

interface GroupedSessions {
  currentWeek: Record<string, ExerciseSession[]>;
  previousWeeks: Record<string, ExerciseSession[]>;
  completeMonths: Record<string, Record<string, ExerciseSession[]>>;
}

export const AdvancedWorkoutSection: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [groupedSessions, setGroupedSessions] = useState<GroupedSessions>({
    currentWeek: {},
    previousWeeks: {},
    completeMonths: {}
  });
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    totalSets: 0,
    totalVolume: 0,
    averageIntensity: 0,
    exercisesCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [editingSession, setEditingSession] = useState<ExerciseSession | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [allExpanded, setAllExpanded] = useState(false);

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  const loadSessions = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Get sessions from the last 90 days to have enough data for grouping
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
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
        .gte('date', ninetyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;

      const sessionsData = data || [];
      setSessions(sessionsData);
      
      // Calculate stats for the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentSessions = sessionsData.filter(session => 
        new Date(session.date) >= sevenDaysAgo
      );
      calculateWeeklyStats(recentSessions);
      
      // Group sessions by time periods
      groupSessionsByTime(sessionsData);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const groupSessionsByTime = (sessionsData: ExerciseSession[]) => {
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    
    const twoWeeksAgo = new Date(currentWeekStart);
    twoWeeksAgo.setDate(currentWeekStart.getDate() - 14);

    const grouped: GroupedSessions = {
      currentWeek: {},
      previousWeeks: {},
      completeMonths: {}
    };

    sessionsData.forEach(session => {
      const sessionDate = new Date(session.date);
      const dateKey = session.date;
      
      if (sessionDate >= currentWeekStart) {
        // Current week
        if (!grouped.currentWeek[dateKey]) {
          grouped.currentWeek[dateKey] = [];
        }
        grouped.currentWeek[dateKey].push(session);
      } else if (sessionDate >= twoWeeksAgo) {
        // Previous 2 weeks
        if (!grouped.previousWeeks[dateKey]) {
          grouped.previousWeeks[dateKey] = [];
        }
        grouped.previousWeeks[dateKey].push(session);
      } else {
        // Older data - group by months
        const monthKey = format(sessionDate, 'yyyy-MM');
        if (!grouped.completeMonths[monthKey]) {
          grouped.completeMonths[monthKey] = {};
        }
        if (!grouped.completeMonths[monthKey][dateKey]) {
          grouped.completeMonths[monthKey][dateKey] = [];
        }
        grouped.completeMonths[monthKey][dateKey].push(session);
      }
    });

    setGroupedSessions(grouped);
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
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Training hinzufügen</h3>
            </div>
            <ExerciseQuickAdd onSessionSaved={loadSessions} />
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <ExerciseProgressCharts />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Trainingshistorie</CardTitle>
                {sessions.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAllExpanded(!allExpanded)}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {allExpanded ? 'Alle zuklappen' : 'Alle aufklappen'}
                  </Button>
                )}
              </div>
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
                <div className="space-y-6">
                  {/* Current Week */}
                  {Object.keys(groupedSessions.currentWeek).length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-primary">Diese Woche</h3>
                      {Object.keys(groupedSessions.currentWeek)
                        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
                        .map(date => (
                          <DayCard
                            key={date}
                            date={date}
                            sessions={groupedSessions.currentWeek[date]}
                            onEditSession={(session) => {
                              setEditingSession(session);
                              setIsEditModalOpen(true);
                            }}
                          />
                        ))}
                    </div>
                  )}

                  {/* Previous Weeks */}
                  {Object.keys(groupedSessions.previousWeeks).length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-secondary">Letzte Wochen</h3>
                      {Object.keys(groupedSessions.previousWeeks)
                        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
                        .map(date => (
                          <DayCard
                            key={date}
                            date={date}
                            sessions={groupedSessions.previousWeeks[date]}
                            onEditSession={(session) => {
                              setEditingSession(session);
                              setIsEditModalOpen(true);
                            }}
                          />
                        ))}
                    </div>
                  )}

                  {/* Complete Months */}
                  {Object.keys(groupedSessions.completeMonths).length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-accent">Ältere Monate</h3>
                      {Object.keys(groupedSessions.completeMonths)
                        .sort((a, b) => b.localeCompare(a))
                        .map(monthKey => (
                          <MonthCard
                            key={monthKey}
                            month={monthKey}
                            sessionsByDay={groupedSessions.completeMonths[monthKey]}
                            onEditSession={(session) => {
                              setEditingSession(session);
                              setIsEditModalOpen(true);
                            }}
                          />
                        ))}
                    </div>
                  )}
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