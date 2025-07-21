
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Area, AreaChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar,
  Target,
  Activity,
  Ruler,
  Scale
} from "lucide-react";

interface ProgressChartsProps {
  timeRange?: 'week' | 'month' | 'year';
}

interface WeightData {
  date: string;
  weight: number;
  displayDate: string;
}

interface MeasurementData {
  date: string;
  waist: number;
  chest: number;
  hips: number;
  belly: number;
  displayDate: string;
}

interface WorkoutData {
  date: string;
  duration: number;
  intensity: number;
  type: string;
  displayDate: string;
}

export const ProgressCharts = ({ timeRange = 'month' }: ProgressChartsProps) => {
  const { user } = useAuth();
  const [weightData, setWeightData] = useState<WeightData[]>([]);
  const [measurementData, setMeasurementData] = useState<MeasurementData[]>([]);
  const [workoutData, setWorkoutData] = useState<WorkoutData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProgressData();
    }
  }, [user, timeRange]);

  const loadProgressData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const daysToLoad = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysToLoad);

      // Load weight data
      const { data: weightData, error: weightError } = await supabase
        .from('weight_history')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (weightError) throw weightError;

      // Load measurement data
      const { data: measurementData, error: measurementError } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (measurementError) throw measurementError;

      // Load workout data
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .eq('did_workout', true)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (workoutError) throw workoutError;

      // Format data
      const formattedWeightData = weightData?.map(entry => ({
        date: entry.date,
        weight: Number(entry.weight),
        displayDate: new Date(entry.date).toLocaleDateString('de-DE', { 
          day: '2-digit', 
          month: '2-digit' 
        })
      })) || [];

      const formattedMeasurementData = measurementData?.map(entry => ({
        date: entry.date,
        waist: Number(entry.waist) || 0,
        chest: Number(entry.chest) || 0,
        hips: Number(entry.hips) || 0,
        belly: Number(entry.belly) || 0,
        displayDate: new Date(entry.date).toLocaleDateString('de-DE', { 
          day: '2-digit', 
          month: '2-digit' 
        })
      })) || [];

      const formattedWorkoutData = workoutData?.map(entry => ({
        date: entry.date,
        duration: Number(entry.duration_minutes) || 0,
        intensity: Number(entry.intensity) || 0,
        type: entry.workout_type || 'kraft',
        displayDate: new Date(entry.date).toLocaleDateString('de-DE', { 
          day: '2-digit', 
          month: '2-digit' 
        })
      })) || [];

      setWeightData(formattedWeightData);
      setMeasurementData(formattedMeasurementData);
      setWorkoutData(formattedWorkoutData);
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (data: any[], key: string) => {
    if (data.length < 2) return <Minus className="h-4 w-4 text-gray-500" />;
    
    const first = data[0][key];
    const last = data[data.length - 1][key];
    
    if (last > first) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (last < first) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const chartConfig = {
    weight: {
      label: "Gewicht",
      color: "hsl(var(--chart-1))",
    },
    waist: {
      label: "Taille",
      color: "hsl(var(--chart-2))",
    },
    chest: {
      label: "Brust",
      color: "hsl(var(--chart-3))",
    },
    belly: {
      label: "Bauch",
      color: "hsl(var(--chart-4))",
    },
    hips: {
      label: "Hüfte",
      color: "hsl(var(--chart-5))",
    },
    duration: {
      label: "Dauer (Min)",
      color: "hsl(var(--chart-1))",
    },
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Progress Visualisierung
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Tabs defaultValue="weight" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="weight">Gewicht</TabsTrigger>
            <TabsTrigger value="measurements">Körpermaße</TabsTrigger>
            <TabsTrigger value="workouts">Training</TabsTrigger>
          </TabsList>
          
          <TabsContent value="weight" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4" />
                <span className="font-medium">Gewichtsverlauf</span>
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(weightData, 'weight')}
                <Badge variant="outline">
                  {weightData.length} Messungen
                </Badge>
              </div>
            </div>
            
            {weightData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weightData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="displayDate" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="var(--color-weight)" 
                      fill="var(--color-weight)" 
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Noch keine Gewichtsdaten vorhanden
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="measurements" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                <span className="font-medium">Körpermaße Entwicklung</span>
              </div>
              <Badge variant="outline">
                {measurementData.length} Messungen
              </Badge>
            </div>
            
            {measurementData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={measurementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="displayDate" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="waist" 
                      stroke="var(--color-waist)" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="belly" 
                      stroke="var(--color-belly)" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="chest" 
                      stroke="var(--color-chest)" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="hips" 
                      stroke="var(--color-hips)" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Noch keine Körpermaße erfasst
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="workouts" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="font-medium">Training Aktivität</span>
              </div>
              <Badge variant="outline">
                {workoutData.length} Workouts
              </Badge>
            </div>
            
            {workoutData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workoutData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="displayDate" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey="duration" 
                      fill="var(--color-duration)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Noch keine Trainings erfasst
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
