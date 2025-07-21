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
    
    if (last > first) return <TrendingUp className="h-4 w-4 text-emerald-600" />;
    if (last < first) return <TrendingDown className="h-4 w-4 text-rose-600" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const chartConfig = {
    weight: {
      label: "Gewicht",
      color: "hsl(221, 83%, 53%)",
    },
    waist: {
      label: "Taille",
      color: "hsl(262, 83%, 58%)",
    },
    chest: {
      label: "Brust",
      color: "hsl(340, 84%, 60%)",
    },
    belly: {
      label: "Bauch",
      color: "hsl(43, 96%, 56%)",
    },
    hips: {
      label: "Hüfte",
      color: "hsl(142, 71%, 45%)",
    },
    duration: {
      label: "Dauer",
      color: "hsl(221, 83%, 53%)",
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
    <Card className="p-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Target className="h-5 w-5" />
          Progress
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Tabs defaultValue="weight" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="weight">Gewicht</TabsTrigger>
            <TabsTrigger value="measurements">Maße</TabsTrigger>
            <TabsTrigger value="workouts">Training</TabsTrigger>
          </TabsList>
          
          <TabsContent value="weight" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4" />
                <span className="font-medium">Gewicht</span>
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(weightData, 'weight')}
                <Badge variant="outline">
                  {weightData.length} Messungen
                </Badge>
              </div>
            </div>
            
            {weightData.length > 0 ? (
              <div className="w-full rounded-lg bg-gradient-to-br from-background to-accent/5">
                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart 
                      data={weightData}
                      margin={{ top: 30, right: 10, left: 10, bottom: 40 }}
                    >
                      <defs>
                        <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="displayDate" 
                        fontSize={10}
                        tickMargin={8}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        domain={['dataMin - 5', 'dataMax + 5']}
                        fontSize={10}
                        tickMargin={8}
                        axisLine={false}
                        tickLine={false}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area 
                        type="monotone" 
                        dataKey="weight" 
                        stroke="hsl(221, 83%, 53%)" 
                        fill="url(#weightGradient)" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Noch keine Gewichtsdaten vorhanden
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="measurements" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                <span className="font-medium">Körpermaße</span>
              </div>
              <Badge variant="outline">
                {measurementData.length} Messungen
              </Badge>
            </div>
            
            {measurementData.length > 0 ? (
              <div className="w-full rounded-lg bg-gradient-to-br from-background to-accent/5">
                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={measurementData}
                      margin={{ top: 30, right: 10, left: 10, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="displayDate" 
                        fontSize={10}
                        tickMargin={8}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        domain={['dataMin - 5', 'dataMax + 5']}
                        fontSize={10}
                        tickMargin={8}
                        axisLine={false}
                        tickLine={false}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line 
                        type="monotone" 
                        dataKey="waist" 
                        stroke="hsl(262, 83%, 58%)" 
                        strokeWidth={2}
                        dot={{ r: 2, fill: "hsl(262, 83%, 58%)" }}
                        activeDot={{ r: 4, strokeWidth: 1 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="belly" 
                        stroke="hsl(43, 96%, 56%)" 
                        strokeWidth={2}
                        dot={{ r: 2, fill: "hsl(43, 96%, 56%)" }}
                        activeDot={{ r: 4, strokeWidth: 1 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="chest" 
                        stroke="hsl(340, 84%, 60%)" 
                        strokeWidth={2}
                        dot={{ r: 2, fill: "hsl(340, 84%, 60%)" }}
                        activeDot={{ r: 4, strokeWidth: 1 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="hips" 
                        stroke="hsl(142, 71%, 45%)" 
                        strokeWidth={2}
                        dot={{ r: 2, fill: "hsl(142, 71%, 45%)" }}
                        activeDot={{ r: 4, strokeWidth: 1 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Noch keine Körpermaße erfasst
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="workouts" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="font-medium">Training</span>
              </div>
              <Badge variant="outline">
                {workoutData.length} Workouts
              </Badge>
            </div>
            
            {workoutData.length > 0 ? (
              <div className="w-full rounded-lg bg-gradient-to-br from-background to-accent/5">
                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={workoutData}
                      margin={{ top: 30, right: 10, left: 10, bottom: 40 }}
                    >
                      <defs>
                        <linearGradient id="workoutGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.4}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="displayDate" 
                        fontSize={10}
                        tickMargin={8}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        fontSize={10}
                        tickMargin={8}
                        axisLine={false}
                        tickLine={false}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar 
                        dataKey="duration" 
                        fill="url(#workoutGradient)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
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
