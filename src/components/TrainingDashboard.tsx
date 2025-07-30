import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrainingQuickAdd } from '@/components/TrainingQuickAdd';
import { TrainingHistory } from '@/components/TrainingHistory';
import { CustomExerciseManager } from '@/components/CustomExerciseManager';
import { TodaysTrainingStatus } from '@/components/TodaysTrainingStatus';
import { ExerciseSessionEditModal } from '@/components/ExerciseSessionEditModal';
import { TrainingStats } from '@/components/TrainingStats';
import { WorkoutTimer } from '@/components/WorkoutTimer';
import { WorkoutPlanManager } from '@/components/WorkoutPlanManager';
import { ActiveWorkoutPlan } from '@/components/ActiveWorkoutPlan';
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
  Square,
  Pause,
  Edit,
  Copy
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
  const { 
    isRunning, 
    hasActiveTimer, 
    formattedTime, 
    pauseDurationFormatted,
    isPaused,
    currentDuration,
    currentSessionId,
    startTimer, 
    stopTimer, 
    pauseTimer, 
    resumeTimer 
  } = useWorkoutTimer();
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
  };

  const handlePauseWorkout = () => {
    pauseTimer();
  };

  const handleResumeWorkout = () => {
    resumeTimer();
  };

  const handleStopWorkout = () => {
    setShowStopDialog(true);
  };
  
  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleConfirmStop = async () => {
    const result = stopTimer();
    setShowStopDialog(false);
    
    // Save workout session to database
    if (user && result.actualStartTime && result.sessionId) {
      try {
        const endTime = new Date();
        const durationMinutes = Math.round(result.totalDurationMs / 60000);
        
        // Collect all exercises that were added during this timer session
        const { data: sessionExercises } = await supabase
          .from('exercise_sets')
          .select(`
            *,
            exercises (
              name,
              category
            ),
            exercise_sessions!inner (
              session_name,
              start_time
            )
          `)
          .eq('user_id', user.id)
          .gte('created_at', result.actualStartTime.toISOString())
          .lte('created_at', endTime.toISOString());

        // Create the main session record
        const { data: sessionData, error: sessionError } = await supabase
          .from('exercise_sessions')
          .insert({
            user_id: user.id,
            session_name: `Workout ${new Date().toLocaleDateString('de-DE')}`,
            date: result.actualStartTime.toISOString().split('T')[0],
            start_time: result.actualStartTime.toISOString(),
            end_time: endTime.toISOString(),
            duration_minutes: durationMinutes,
            notes: `Timer-basierte Session (${formattedTime})${sessionExercises?.length ? ` - ${sessionExercises.length} Übungen` : ''}`,
            workout_type: 'strength'
          })
          .select()
          .single();

        if (sessionError) throw sessionError;

        // Update all exercises from this timer session to be linked to the main session
        if (sessionExercises && sessionExercises.length > 0 && sessionData) {
          const exerciseSetIds = sessionExercises.map(ex => ex.id);
          await supabase
            .from('exercise_sets')
            .update({ session_id: sessionData.id })
            .in('id', exerciseSetIds);
        }

        loadSessions(); // Refresh the sessions list
      } catch (error) {
        console.error('Error saving workout session:', error);
      }
    }
  };

  const handleDiscardWorkout = () => {
    stopTimer();
    setShowStopDialog(false);
  };

  // Session management handlers
  const handleEditSession = async (sessionId: string) => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('exercise_sessions')
        .select(`
          *,
          exercise_sets (
            *,
            exercises (
              name,
              category
            )
          )
        `)
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

      setEditSessionData(data);
    } catch (error) {
      console.error('Error loading session for edit:', error);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!user) return;
    
    try {
      // Delete all exercise sets for this session
      await supabase
        .from('exercise_sets')
        .delete()
        .eq('session_id', sessionId);
      
      // Delete the session
      await supabase
        .from('exercise_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);
      
      loadSessions(); // Refresh
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const handleDuplicateSession = async (sessionId: string) => {
    if (!user) return;
    
    try {
      // Get the original session and its sets
      const { data: originalSession } = await supabase
        .from('exercise_sessions')
        .select(`
          *,
          exercise_sets (
            exercise_id,
            set_number,
            weight_kg,
            reps,
            rpe,
            notes
          )
        `)
        .eq('id', sessionId)
        .single();

      if (!originalSession) return;

      // Create new session
      const { data: newSession } = await supabase
        .from('exercise_sessions')
        .insert({
          user_id: user.id,
          session_name: `${originalSession.session_name} (Kopie)`,
          workout_type: originalSession.workout_type,
          date: new Date().toISOString().split('T')[0],
          notes: originalSession.notes
        })
        .select()
        .single();

      if (!newSession) return;

      // Duplicate all exercise sets
      if (originalSession.exercise_sets && originalSession.exercise_sets.length > 0) {
        const setsToInsert = originalSession.exercise_sets.map(set => ({
          session_id: newSession.id,
          user_id: user.id,
          exercise_id: set.exercise_id,
          set_number: set.set_number,
          weight_kg: set.weight_kg,
          reps: set.reps,
          rpe: set.rpe,
          notes: set.notes
        }));

        await supabase
          .from('exercise_sets')
          .insert(setsToInsert);
      }

      loadSessions(); // Refresh
    } catch (error) {
      console.error('Error duplicating session:', error);
    }
  };
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editSessionData, setEditSessionData] = useState<any>(null);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [activeWorkoutPlan, setActiveWorkoutPlan] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

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

  // Workout Plan handlers
  const handleStartWorkoutPlan = (plan: any) => {
    setActiveWorkoutPlan(plan);
    if (!hasActiveTimer) {
      startTimer();
    }
  };

  const handleCompleteWorkoutPlan = () => {
    setActiveWorkoutPlan(null);
    loadSessions();
  };

  const handleCancelWorkoutPlan = () => {
    setActiveWorkoutPlan(null);
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
        
        {/* Timer Control - New 3-Column Layout */}
        <div className="max-w-2xl mx-auto">
          <Card className="border-gradient-primary">
            <CardContent className="pt-6 space-y-4">
              {!hasActiveTimer ? (
                <div className="text-center space-y-4">
                  <div className="text-4xl font-mono font-bold text-muted-foreground mb-6">
                    {formattedTime}
                  </div>
                  <Button 
                    onClick={handleStartWorkout} 
                    className="bg-green-600 hover:bg-green-700 text-white w-full max-w-xs"
                    size="lg"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Workout starten
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4 items-center">
                  {/* Left: Pause/Resume Button */}
                  <div className="flex justify-center">
                    {isRunning ? (
                      <Button 
                        onClick={handlePauseWorkout}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white w-16 h-16 rounded-full p-0"
                        size="lg"
                      >
                        <Pause className="h-8 w-8" />
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleResumeWorkout}
                        className="bg-green-600 hover:bg-green-700 text-white w-16 h-16 rounded-full p-0"
                        size="lg"
                      >
                        <Play className="h-8 w-8" />
                      </Button>
                    )}
                  </div>

                  {/* Center: Timer Display */}
                  <div className="text-center">
                    <div className="text-4xl font-mono font-bold text-muted-foreground mb-2">
                      {formattedTime}
                    </div>
                    {isPaused && (
                      <div className="text-lg font-mono text-yellow-600">
                        Pause: {pauseDurationFormatted}
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-2 mt-2">
                      {isRunning && (
                        <div className="flex items-center gap-1 text-sm text-green-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          Läuft
                        </div>
                      )}
                      {isPaused && (
                        <div className="flex items-center gap-1 text-sm text-yellow-600">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                          Pausiert
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Stop Button */}
                  <div className="flex justify-center">
                    <Button 
                      onClick={handleStopWorkout}
                      className="bg-red-600 hover:bg-red-700 text-white w-16 h-16 rounded-full p-0"
                      size="lg"
                    >
                      <Square className="h-8 w-8" />
                    </Button>
                  </div>
                </div>
              )}

              {currentDuration > 300 && ( // Show after 5 minutes
                <div className="text-center text-sm text-muted-foreground">
                  {Math.floor(currentDuration / 60)} Minuten Training
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* KI Training Coaches - TEMPORARILY HIDDEN */}
      {false && (
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
      )}

      {/* Show Active Workout Plan if one is running */}
      {activeWorkoutPlan && (
        <ActiveWorkoutPlan
          workoutPlan={activeWorkoutPlan}
          onComplete={handleCompleteWorkoutPlan}
          onCancel={handleCancelWorkoutPlan}
          isTimerRunning={hasActiveTimer}
          timerDuration={currentDuration}
        />
      )}

      {/* Tab System */}
      {!activeWorkoutPlan && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="training-plans">Trainingspläne</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Quick Actions Row */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="hover:shadow-md transition-shadow border-dashed border-2 border-primary/20 hover:border-primary/40">
                <CardContent className="p-6 text-center space-y-4">
                  <div className="p-3 bg-primary/10 rounded-full w-fit mx-auto">
                    <Plus className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Übung hinzufügen</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Schnell eine einzelne Übung tracken
                    </p>
                    <Button 
                      onClick={() => setShowQuickAdd(true)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Übung hinzufügen
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow border-dashed border-2 border-secondary/20 hover:border-secondary/40">
                <CardContent className="p-6 text-center space-y-4">
                  <div className="p-3 bg-secondary/10 rounded-full w-fit mx-auto">
                    <Dumbbell className="h-8 w-8 text-secondary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Training Session</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Komplette Session mit mehreren Übungen
                    </p>
                    <Button 
                      onClick={() => setShowQuickAdd(true)}
                      variant="secondary"
                      className="w-full"
                    >
                      <Dumbbell className="h-4 w-4 mr-2" />
                      Session erstellen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left Column */}
              <div className="space-y-6">
                <TodaysTrainingStatus
                  todaysSessions={getTodaysSessions()}
                  onStartTraining={() => setShowQuickAdd(true)}
                  onEditSession={handleEditSession}
                  onDeleteSession={handleDeleteSession}
                  onDuplicateSession={handleDuplicateSession}
                />
                
                <TrainingStats stats={weeklyStats} />
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <CustomExerciseManager onExerciseAdded={loadSessions} />
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-primary" />
                      Coach & Analyse
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button 
                      onClick={() => navigate('/coach')}
                      variant="outline" 
                      className="w-full"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Mit Coach chatten
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Workout Tips */}
            {hasActiveTimer && currentDuration > 300000 && ( // Show after 5 minutes
              <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-full">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">Tipp für dein Workout</h4>
                      <p className="text-sm text-muted-foreground">
                        Du trainierst bereits {formatDuration(currentDuration)}! Vergiss nicht, ausreichend Wasser zu trinken und auf deine Form zu achten.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Workouts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Letzte Workouts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessions.length === 0 ? (
                  <div className="text-center py-8">
                    <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">Noch keine Trainings</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Starte mit deinem ersten Training und tracke deinen Fortschritt!
                    </p>
                    <Button onClick={() => setShowQuickAdd(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Erstes Training starten
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessions.slice(0, 3).map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-full">
                            <Dumbbell className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium">{session.session_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(session.date).toLocaleDateString('de-DE')} • {session.exercise_sets?.length || 0} Übungen
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSession(session.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicateSession(session.id)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {sessions.length > 3 && (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setShowHistory(true)}
                      >
                        Alle Trainings anzeigen ({sessions.length})
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="training-plans" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left Column - Workout Plans */}
              <div className="space-y-6">
                <WorkoutPlanManager 
                  onStartPlan={handleStartWorkoutPlan}
                  pastSessions={sessions}
                />
              </div>

              {/* Right Column - Training History */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Trainingshistorie
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={() => setShowHistory(true)}
                      variant="outline" 
                      className="w-full"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Vollständige Historie anzeigen
                    </Button>
                    
                    {sessions.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h4 className="font-medium">Letzte Trainings:</h4>
                        {sessions.slice(0, 5).map((session) => (
                          <div
                            key={session.id}
                            className="flex items-center justify-between p-2 rounded border"
                          >
                            <div>
                              <div className="font-medium text-sm">{session.session_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(session.date).toLocaleDateString('de-DE')}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {session.exercise_sets?.length || 0} Übungen
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
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

      {/* Edit Session Modal */}
      <ExerciseSessionEditModal
        session={editSessionData}
        isOpen={!!editSessionData}
        onClose={() => setEditSessionData(null)}
        onSessionUpdated={() => {
          loadSessions();
          setEditSessionData(null);
        }}
      />

      {/* Stop Workout Confirmation Dialog */}
      <AlertDialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Workout beenden?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <div className="text-center space-y-2 p-4 bg-muted/50 rounded-lg">
                <div className="text-lg font-mono font-bold text-primary">
                  {formatDuration(currentDuration * 1000)}
                </div>
                <div className="text-sm text-muted-foreground">Gesamte Trainingszeit</div>
                {isPaused && pauseDurationFormatted && (
                  <>
                    <div className="text-base font-mono text-yellow-600">
                      {pauseDurationFormatted}
                    </div>
                    <div className="text-xs text-muted-foreground">Pausenzeit</div>
                  </>
                )}
              </div>
              <p className="text-center">
                Möchtest du das Workout beenden und speichern? Die Trainingszeit wird in deinem Verlauf gespeichert.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardWorkout}>
              Verwerfen
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmStop}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              Speichern
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};