import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Utensils, 
  Droplets, 
  Moon,
  Target,
  Calendar,
  Award,
  ArrowRight
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';

interface DailySummaryData {
  id: string;
  date: string;
  total_calories: number;
  total_protein: number;
  workout_volume: number;
  hydration_score: number;
  sleep_score: number;
  summary_md: string;
  kpi_xxl_json: any;
}

interface WeekComparison {
  currentWeek: {
    avgCalories: number;
    avgProtein: number;
    totalVolume: number;
    workoutDays: number;
  };
  lastWeek: {
    avgCalories: number;
    avgProtein: number;
    totalVolume: number;
    workoutDays: number;
  };
  trends: {
    calories: 'up' | 'down' | 'stable';
    protein: 'up' | 'down' | 'stable';
    volume: 'up' | 'down' | 'stable';
    consistency: 'up' | 'down' | 'stable';
  };
}

interface WearableData {
  steps: number;
  heartRate?: number;
  sleepHours?: number;
  activeMinutes?: number;
}

export const EnhancedDailySummary: React.FC<{ date?: string }> = ({ 
  date = new Date().toISOString().split('T')[0] 
}) => {
  const { user } = useAuth();
  const [summaryData, setSummaryData] = useState<DailySummaryData | null>(null);
  const [weekComparison, setWeekComparison] = useState<WeekComparison | null>(null);
  const [wearableData, setWearableData] = useState<WearableData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummaryData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch daily summary
      const { data: summary, error: summaryError } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)
        .maybeSingle();

      if (summaryError) throw summaryError;

      setSummaryData(summary);

      // Fetch week comparison data
      const currentWeekStart = startOfWeek(new Date(date), { weekStartsOn: 1 });
      const currentWeekEnd = endOfWeek(new Date(date), { weekStartsOn: 1 });
      const lastWeekStart = startOfWeek(subDays(new Date(date), 7), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subDays(new Date(date), 7), { weekStartsOn: 1 });

      const [currentWeekData, lastWeekData] = await Promise.all([
        supabase
          .from('daily_summaries')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', format(currentWeekStart, 'yyyy-MM-dd'))
          .lte('date', format(currentWeekEnd, 'yyyy-MM-dd')),
        supabase
          .from('daily_summaries')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', format(lastWeekStart, 'yyyy-MM-dd'))
          .lte('date', format(lastWeekEnd, 'yyyy-MM-dd'))
      ]);

      if (currentWeekData.error) throw currentWeekData.error;
      if (lastWeekData.error) throw lastWeekData.error;

      // Calculate week comparisons
      const calculateWeekStats = (data: DailySummaryData[]) => ({
        avgCalories: data.length > 0 ? data.reduce((sum, d) => sum + (d.total_calories || 0), 0) / data.length : 0,
        avgProtein: data.length > 0 ? data.reduce((sum, d) => sum + (d.total_protein || 0), 0) / data.length : 0,
        totalVolume: data.reduce((sum, d) => sum + (d.workout_volume || 0), 0),
        workoutDays: data.filter(d => d.workout_volume > 0).length
      });

      const currentStats = calculateWeekStats(currentWeekData.data || []);
      const lastStats = calculateWeekStats(lastWeekData.data || []);

      const calculateTrend = (current: number, last: number): 'up' | 'down' | 'stable' => {
        const diff = ((current - last) / Math.max(last, 1)) * 100;
        if (diff > 5) return 'up';
        if (diff < -5) return 'down';
        return 'stable';
      };

      setWeekComparison({
        currentWeek: currentStats,
        lastWeek: lastStats,
        trends: {
          calories: calculateTrend(currentStats.avgCalories, lastStats.avgCalories),
          protein: calculateTrend(currentStats.avgProtein, lastStats.avgProtein),
          volume: calculateTrend(currentStats.totalVolume, lastStats.totalVolume),
          consistency: calculateTrend(currentStats.workoutDays, lastStats.workoutDays)
        }
      });

      // Fetch wearable data (steps from workouts table)
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .select('steps, distance_km, duration_minutes')
        .eq('user_id', user.id)
        .eq('date', date)
        .maybeSingle();

      if (workoutError) console.warn('Could not fetch workout data:', workoutError);

      if (workoutData) {
        setWearableData({
          steps: workoutData.steps || 0,
          activeMinutes: workoutData.duration_minutes || 0
        });
      }

    } catch (error) {
      console.error('Error fetching summary data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaryData();
  }, [user, date]);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <ArrowRight className="h-4 w-4 text-gray-500" />;
    }
  };

  const generateOptimizationTips = (): string[] => {
    if (!summaryData || !weekComparison) return [];

    const tips: string[] = [];

    // Protein optimization
    if (summaryData.total_protein < 100) {
      tips.push('Protein erhöhen: Ziel 1.6-2.2g pro kg Körpergewicht für optimalen Muskelaufbau');
    }

    // Training consistency
    if (weekComparison.currentWeek.workoutDays < 3) {
      tips.push('Trainingsfrequenz steigern: 3-4 Trainingseinheiten pro Woche für beste Ergebnisse');
    }

    // Volume progression
    if (weekComparison.trends.volume === 'down') {
      tips.push('Trainingsvolumen steigern: Progressive Überladung durch mehr Gewicht oder Wiederholungen');
    }

    // Steps/Activity
    if (wearableData && wearableData.steps < 8000) {
      tips.push('Aktivität erhöhen: Ziel 8.000-10.000 Schritte täglich für bessere Gesundheit');
    }

    // Hydration
    if (summaryData.hydration_score && summaryData.hydration_score < 7) {
      tips.push('Hydration verbessern: 2-3 Liter Wasser täglich für optimale Leistung');
    }

    return tips.slice(0, 3); // Limit to 3 most relevant tips
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!summaryData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Keine Daten für {format(new Date(date), 'dd.MM.yyyy', { locale: de })} verfügbar</p>
            <p className="text-sm mt-2">Logge deine erste Mahlzeit oder dein Training, um eine Zusammenfassung zu erhalten.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const optimizationTips = generateOptimizationTips();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          Tages-Zusammenfassung
        </h2>
        <Badge variant="outline">
          {format(new Date(date), 'dd. MMMM yyyy', { locale: de })}
        </Badge>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kalorien</CardTitle>
            <Utensils className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(summaryData.total_calories)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {weekComparison && getTrendIcon(weekComparison.trends.calories)}
              <span className="ml-1">vs. letzte Woche</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Protein</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(summaryData.total_protein)}g</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {weekComparison && getTrendIcon(weekComparison.trends.protein)}
              <span className="ml-1">vs. letzte Woche</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Training</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(summaryData.workout_volume / 1000)}k</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {weekComparison && getTrendIcon(weekComparison.trends.volume)}
              <span className="ml-1">kg Volumen</span>
            </div>
          </CardContent>
        </Card>

        {wearableData && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Schritte</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{wearableData.steps.toLocaleString()}</div>
              <Progress 
                value={(wearableData.steps / 10000) * 100} 
                className="h-1 mt-2" 
              />
            </CardContent>
          </Card>
        )}

        {summaryData.hydration_score && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hydration</CardTitle>
              <Droplets className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryData.hydration_score}/10</div>
              <Progress 
                value={summaryData.hydration_score * 10} 
                className="h-1 mt-2" 
              />
            </CardContent>
          </Card>
        )}

        {summaryData.sleep_score && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Schlaf</CardTitle>
              <Moon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryData.sleep_score}/10</div>
              <Progress 
                value={summaryData.sleep_score * 10} 
                className="h-1 mt-2" 
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Week Comparison */}
      {weekComparison && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Wochen-Vergleich
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Ø Kalorien</div>
                <div className="text-xl font-bold">
                  {Math.round(weekComparison.currentWeek.avgCalories)}
                </div>
                <div className="text-xs text-muted-foreground">
                  vs. {Math.round(weekComparison.lastWeek.avgCalories)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Ø Protein</div>
                <div className="text-xl font-bold">
                  {Math.round(weekComparison.currentWeek.avgProtein)}g
                </div>
                <div className="text-xs text-muted-foreground">
                  vs. {Math.round(weekComparison.lastWeek.avgProtein)}g
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Trainingsvolumen</div>
                <div className="text-xl font-bold">
                  {Math.round(weekComparison.currentWeek.totalVolume / 1000)}k
                </div>
                <div className="text-xs text-muted-foreground">
                  vs. {Math.round(weekComparison.lastWeek.totalVolume / 1000)}k
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Trainingstage</div>
                <div className="text-xl font-bold">
                  {weekComparison.currentWeek.workoutDays}
                </div>
                <div className="text-xs text-muted-foreground">
                  vs. {weekComparison.lastWeek.workoutDays}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optimization Tips */}
      {optimizationTips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2" />
              Optimierungs-Tipps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {optimizationTips.map((tip, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <p className="text-sm">{tip}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Summary */}
      {summaryData.summary_md && (
        <Card>
          <CardHeader>
            <CardTitle>KI-Analyse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <div dangerouslySetInnerHTML={{ __html: summaryData.summary_md.replace(/\n/g, '<br />') }} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};