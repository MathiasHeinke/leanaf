import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Award, Calculator } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Exercise {
  id: string;
  name: string;
  category: string;
}

interface ProgressData {
  date: string;
  weight: number;
  reps: number;
  volume: number;
  oneRM: number;
}

interface VolumeData {
  date: string;
  totalVolume: number;
  sets: number;
}

export const ExerciseProgressCharts: React.FC = () => {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [volumeData, setVolumeData] = useState<VolumeData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadExercises();
  }, []);

  useEffect(() => {
    if (selectedExercise && user) {
      loadProgressData();
    }
  }, [selectedExercise, user]);

  const loadExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name, category')
        .order('name');

      if (error) throw error;
      setExercises(data || []);
      
      // Auto-select first exercise
      if (data && data.length > 0) {
        setSelectedExercise(data[0].id);
      }
    } catch (error) {
      console.error('Error loading exercises:', error);
    }
  };

  const loadProgressData = async () => {
    if (!user || !selectedExercise) return;

    try {
      setIsLoading(true);
      
      // Get exercise sets for the selected exercise from last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data, error } = await supabase
        .from('exercise_sets')
        .select(`
          weight_kg,
          reps,
          created_at,
          exercise_sessions!inner (
            date,
            user_id
          )
        `)
        .eq('user_id', user.id)
        .eq('exercise_id', selectedExercise)
        .gte('exercise_sessions.date', ninetyDaysAgo.toISOString().split('T')[0])
        .order('exercise_sessions.date', { ascending: true });

      if (error) throw error;

      // Process data for progress chart
      const processedData = processProgressData(data || []);
      setProgressData(processedData.progressData);
      setVolumeData(processedData.volumeData);

    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processProgressData = (data: any[]) => {
    // Group by date and find max weight/reps per day
    const groupedByDate = data.reduce((acc, set) => {
      const date = set.exercise_sessions.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(set);
      return acc;
    }, {} as Record<string, any[]>);

    const progressData: ProgressData[] = [];
    const volumeData: VolumeData[] = [];

    Object.entries(groupedByDate).forEach(([date, sets]) => {
      const setsArray = sets as any[];
      
      // Find the heaviest set of the day
      const heaviestSet = setsArray.reduce((max: any, set: any) => 
        set.weight_kg > max.weight_kg ? set : max
      );

      // Calculate 1RM using Epley formula: weight * (1 + reps/30)
      const oneRM = Math.round(heaviestSet.weight_kg * (1 + heaviestSet.reps / 30));

      // Calculate total volume for the day
      const totalVolume = setsArray.reduce((sum: number, set: any) => sum + (set.weight_kg * set.reps), 0);

      progressData.push({
        date,
        weight: heaviestSet.weight_kg,
        reps: heaviestSet.reps,
        volume: Math.round(totalVolume),
        oneRM
      });

      volumeData.push({
        date,
        totalVolume: Math.round(totalVolume),
        sets: setsArray.length
      });
    });

    return { progressData, volumeData };
  };

  const formatTooltipDate = (date: string) => {
    return format(new Date(date), 'd. MMM yyyy', { locale: de });
  };

  const selectedExerciseData = exercises.find(ex => ex.id === selectedExercise);
  const latestProgress = progressData[progressData.length - 1];
  const firstProgress = progressData[0];
  
  // Calculate improvements
  const weightImprovement = latestProgress && firstProgress 
    ? Math.round(((latestProgress.weight - firstProgress.weight) / firstProgress.weight) * 100)
    : 0;

  const oneRMImprovement = latestProgress && firstProgress
    ? Math.round(((latestProgress.oneRM - firstProgress.oneRM) / firstProgress.oneRM) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Exercise Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Fortschrittsanalyse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                <SelectTrigger>
                  <SelectValue placeholder="Übung auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {exercises.map((exercise) => (
                    <SelectItem key={exercise.id} value={exercise.id}>
                      {exercise.name} ({exercise.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedExerciseData && (
              <Badge variant="secondary">{selectedExerciseData.category}</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Lade Fortschrittsdaten...
        </div>
      ) : progressData.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Keine Daten für diese Übung gefunden. Starte mit deinem ersten Training!
        </div>
      ) : (
        <>
          {/* Progress Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="p-4 text-center">
                <Award className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">
                  {latestProgress?.weight || 0}kg
                </div>
                <div className="text-sm text-muted-foreground">
                  Aktuelles Max-Gewicht
                </div>
                {weightImprovement !== 0 && (
                  <div className={`text-sm font-medium ${weightImprovement > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {weightImprovement > 0 ? '+' : ''}{weightImprovement}% seit Start
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5">
              <CardContent className="p-4 text-center">
                <Calculator className="h-8 w-8 mx-auto mb-2 text-secondary" />
                <div className="text-2xl font-bold">
                  {latestProgress?.oneRM || 0}kg
                </div>
                <div className="text-sm text-muted-foreground">
                  Geschätztes 1RM
                </div>
                {oneRMImprovement !== 0 && (
                  <div className={`text-sm font-medium ${oneRMImprovement > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {oneRMImprovement > 0 ? '+' : ''}{oneRMImprovement}% seit Start
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-accent/10 to-accent/5">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-accent" />
                <div className="text-2xl font-bold">
                  {progressData.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Trainingseinheiten
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Weight Progress Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Gewichtsentwicklung & 1RM</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(new Date(date), 'd. MMM', { locale: de })}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={formatTooltipDate}
                      formatter={(value, name) => [
                        `${value}${name === 'weight' || name === 'oneRM' ? 'kg' : ''}`,
                        name === 'weight' ? 'Max Gewicht' : 
                        name === 'oneRM' ? '1RM (geschätzt)' : name
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="oneRM" 
                      stroke="hsl(var(--secondary))" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: 'hsl(var(--secondary))', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Volume Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Trainingsvolumen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(new Date(date), 'd. MMM', { locale: de })}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={formatTooltipDate}
                      formatter={(value, name) => [
                        `${value}${name === 'totalVolume' ? 'kg' : ' Sätze'}`,
                        name === 'totalVolume' ? 'Gesamtvolumen' : 'Anzahl Sätze'
                      ]}
                    />
                    <Bar 
                      dataKey="totalVolume" 
                      fill="hsl(var(--accent))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};