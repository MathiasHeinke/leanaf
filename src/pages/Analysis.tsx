import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { HistoryCharts } from "@/components/HistoryCharts";
import { Overview } from "@/components/Overview";
import { TrainingAnalysis } from "@/components/TrainingAnalysis";
import { roundNutritionalValue } from "@/utils/numberFormatting";

const Analysis = () => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [dailyGoals, setDailyGoals] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bodyMeasurementsHistory, setBodyMeasurementsHistory] = useState<any[]>([]);

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

        setTodaysTotals({
          calories: roundNutritionalValue(totals.calories, 'calories'),
          protein: roundNutritionalValue(totals.protein, 'macros'),
          carbs: roundNutritionalValue(totals.carbs, 'macros'),
          fats: roundNutritionalValue(totals.fats, 'macros')
        });
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
              displayDate: new Date(date).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit'
              }),
              meals: [],
              calories: 0,
              protein: 0,
              carbs: 0,
              fats: 0
            };
          }
          
          dailyData[date].meals.push(meal);
          dailyData[date].calories += meal.calories || 0;
          dailyData[date].protein += meal.protein || 0;
          dailyData[date].carbs += meal.carbs || 0;
          dailyData[date].fats += meal.fats || 0;
        });

        const historyArray = Object.values(dailyData).sort((a: any, b: any) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setHistoryData(historyArray);

        // Calculate weekly averages
        const lastWeekData = historyArray.slice(0, 7);
        if (lastWeekData.length > 0) {
          const weeklyAverages = lastWeekData.reduce((sum: any, day: any) => ({
            calories: sum.calories + day.calories,
            protein: sum.protein + day.protein,
            carbs: sum.carbs + day.carbs,
            fats: sum.fats + day.fats
          }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

          setAverages({
            calories: roundNutritionalValue(weeklyAverages.calories / lastWeekData.length, 'calories'),
            protein: roundNutritionalValue(weeklyAverages.protein / lastWeekData.length, 'macros'),
            carbs: roundNutritionalValue(weeklyAverages.carbs / lastWeekData.length, 'macros'),
            fats: roundNutritionalValue(weeklyAverages.fats / lastWeekData.length, 'macros')
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

      // Load body measurements history (load more data to ensure we get all entries)
      const { data: bodyMeasurementsData } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(100); // Increased limit to ensure we get all historical data

      if (bodyMeasurementsData) {
        setBodyMeasurementsHistory(bodyMeasurementsData);
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

    const recentAvg = recent3Days.reduce((sum, day) => sum + day.calories, 0) / recent3Days.length;
    const previousAvg = previous3Days.reduce((sum, day) => sum + day.calories, 0) / previous3Days.length;

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Wichtige Überblick Card - sauber und übersichtlich */}
      <Overview 
        todaysTotals={todaysTotals}
        dailyGoals={dailyGoals}
        averages={averages}
        weightHistory={weightHistory}
      />

      {/* Training & Kraft Analysis - neue Sektion */}
      <TrainingAnalysis timeRange="month" />

      {/* History Charts - nur die Charts behalten */}
      <HistoryCharts 
        data={historyData}
        weightHistory={weightHistory}
        bodyMeasurementsHistory={bodyMeasurementsHistory}
        timeRange="month"
        loading={loading}
      />
    </div>
  );
};

export default Analysis;