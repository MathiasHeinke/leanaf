import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, BarChart3, TrendingUp, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { InsightsAnalysis } from "@/components/InsightsAnalysis";
import { CoachChat } from "@/components/CoachChat";
import { PremiumGate } from "@/components/PremiumGate";
import { HistoryCharts } from "@/components/HistoryCharts";
import { WeightHistory } from "@/components/WeightHistory";

const Analysis = () => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [dailyGoals, setDailyGoals] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Today's nutritional totals
  const [todaysTotals, setTodaysTotals] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0
  });

  // Weekly averages
  const [averages, setAverages] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0
  });

  useEffect(() => {
    if (user?.id) {
      loadAnalysisData();
    }
  }, [user?.id]);

  const loadAnalysisData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Load user profile and goals
      const [profileResult, goalsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('daily_goals')
          .select('*')
          .eq('user_id', user.id)
          .single()
      ]);

      if (profileResult.data) {
        setUserProfile(profileResult.data);
      }

      if (goalsResult.data) {
        setDailyGoals(goalsResult.data);
      }

      // Load today's meals for current totals
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: todaysMeals } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());

      if (todaysMeals) {
        const totals = todaysMeals.reduce((sum, meal) => ({
          calories: sum.calories + (meal.calories || 0),
          protein: sum.protein + (meal.protein || 0),
          carbs: sum.carbs + (meal.carbs || 0),
          fats: sum.fats + (meal.fats || 0)
        }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

        setTodaysTotals(totals);
      }

      // Load historical data (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: historicalMeals } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (historicalMeals) {
        // Group by day and calculate daily totals
        const dailyData: { [key: string]: any } = {};
        
        historicalMeals.forEach(meal => {
          const date = meal.created_at.split('T')[0];
          if (!dailyData[date]) {
            dailyData[date] = {
              date,
              totals: { calories: 0, protein: 0, carbs: 0, fats: 0 },
              mealCount: 0
            };
          }
          
          dailyData[date].totals.calories += meal.calories || 0;
          dailyData[date].totals.protein += meal.protein || 0;
          dailyData[date].totals.carbs += meal.carbs || 0;
          dailyData[date].totals.fats += meal.fats || 0;
          dailyData[date].mealCount += 1;
        });

        const historyArray = Object.values(dailyData).sort((a: any, b: any) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setHistoryData(historyArray);

        // Calculate weekly averages
        const lastWeekData = historyArray.slice(0, 7);
        if (lastWeekData.length > 0) {
          const weeklyAverages = lastWeekData.reduce((sum: any, day: any) => ({
            calories: sum.calories + day.totals.calories,
            protein: sum.protein + day.totals.protein,
            carbs: sum.carbs + day.totals.carbs,
            fats: sum.fats + day.totals.fats
          }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

          setAverages({
            calories: Math.round(weeklyAverages.calories / lastWeekData.length),
            protein: Math.round(weeklyAverages.protein / lastWeekData.length),
            carbs: Math.round(weeklyAverages.carbs / lastWeekData.length),
            fats: Math.round(weeklyAverages.fats / lastWeekData.length)
          });
        }

        // Calculate trend data
        const trendCalc = calculateTrendData(historyArray);
        setTrendData(trendCalc);
      }

      // Load weight history
      const { data: weightData } = await supabase
        .from('weight_history')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(30);

      if (weightData) {
        setWeightHistory(weightData);
      }

    } catch (error) {
      console.error('Error loading analysis data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTrendData = (historyArray: any[]) => {
    if (historyArray.length < 3) return null;

    const recent3Days = historyArray.slice(0, 3);
    const previous3Days = historyArray.slice(3, 6);

    if (previous3Days.length === 0) return null;

    const recentAvg = recent3Days.reduce((sum, day) => sum + day.totals.calories, 0) / recent3Days.length;
    const previousAvg = previous3Days.reduce((sum, day) => sum + day.totals.calories, 0) / previous3Days.length;

    const change = recentAvg - previousAvg;
    const percentChange = ((change / previousAvg) * 100);

    return {
      trend: change > 50 ? 'up' : change < -50 ? 'down' : 'stable',
      change: Math.round(change),
      percentChange: Math.round(percentChange),
      recentAverage: Math.round(recentAvg),
      previousAverage: Math.round(previousAvg)
    };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const coachPersonality = userProfile?.coach_personality || 'motivierend';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Analyse</h1>
          <p className="text-muted-foreground">Detaillierte Einblicke in deinen Fortschritt</p>
        </div>
      </div>

      <Tabs defaultValue="insights" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analyse
          </TabsTrigger>
          <TabsTrigger value="coach" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Coach
            <Badge variant="secondary" className="text-xs">
              {coachPersonality === 'streng' ? '🎯' : coachPersonality === 'motivierend' ? '💪' : '😊'}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-6">
          {/* Current Analytics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Heute</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Kalorien</span>
                    <span className="font-medium">{todaysTotals.calories}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Protein</span>
                    <span className="font-medium">{todaysTotals.protein}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Kohlenhydrate</span>
                    <span className="font-medium">{todaysTotals.carbs}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Fette</span>
                    <span className="font-medium">{todaysTotals.fats}g</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">7-Tage Durchschnitt</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Kalorien</span>
                    <span className="font-medium">{averages.calories}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Protein</span>
                    <span className="font-medium">{averages.protein}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Kohlenhydrate</span>
                    <span className="font-medium">{averages.carbs}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Fette</span>
                    <span className="font-medium">{averages.fats}g</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {trendData ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className={`h-4 w-4 ${
                        trendData.trend === 'up' ? 'text-orange-500' : 
                        trendData.trend === 'down' ? 'text-blue-500' : 'text-green-500'
                      }`} />
                      <span className="font-medium">
                        {trendData.trend === 'up' ? 'Steigend' : 
                         trendData.trend === 'down' ? 'Fallend' : 'Stabil'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {trendData.change > 0 ? '+' : ''}{trendData.change} Kalorien
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {Math.abs(trendData.percentChange)}% Veränderung
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sammle mehr Daten...</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Smart Insights */}
          <InsightsAnalysis
            todaysTotals={todaysTotals}
            dailyGoals={dailyGoals}
            averages={averages}
            historyData={historyData}
            trendData={trendData}
            weightHistory={weightHistory}
            onWeightAdded={() => loadAnalysisData()}
          />

          {/* History Charts */}
          <HistoryCharts 
            data={historyData}
            weightHistory={weightHistory}
            timeRange="month"
            loading={loading}
          />

          {/* Weight History */}
          <WeightHistory 
            weightHistory={weightHistory}
            loading={loading}
            onDataUpdate={() => loadAnalysisData()}
          />
        </TabsContent>

        <TabsContent value="coach">
          <PremiumGate 
            feature="premium_insights"
            fallbackMessage="Der persönliche KaloAI Coach ist ein Premium Feature. Upgrade für unbegrenzten Zugang zu deinem persönlichen Fitness- und Ernährungscoach!"
          >
            <CoachChat coachPersonality={coachPersonality} />
          </PremiumGate>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analysis;