import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Overview } from "@/components/Overview";
import { InsightsAnalysis } from "@/components/InsightsAnalysis";
import { ChatCoach } from "@/components/ChatCoach";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { debounce, clearCache } from "@/utils/supabaseHelpers";
import { 
  Loader2,
  Brain,
  Clock
} from "lucide-react";

interface CoachProps {
  onClose?: () => void;
}

interface DailyGoal {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  bmr?: number;
  tdee?: number;
}

interface MealData {
  id: string;
  text: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  timestamp: Date;
  meal_type?: string;
}

interface HistoryEntry {
  date: string;
  meals: MealData[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
}

interface WeightEntry {
  id: string;
  weight: number;
  date: string;
}

interface TrendData {
  weeklyAverage: number;
  monthlyAverage: number;
  trend: 'up' | 'down' | 'stable';
  improvement: string;
  weeklyGoalReach: number;
}

const Coach = ({ onClose }: CoachProps) => {
  // Greeting State
  const [coachGreeting, setCoachGreeting] = useState<string>('');
  const [greetingLoading, setGreetingLoading] = useState(false);
  
  // Weight History State
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  
  // Trend Analysis State
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  
  // Data State
  const [historyData, setHistoryData] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dailyGoals, setDailyGoals] = useState<DailyGoal | null>(null);
  const [todaysMeals, setTodaysMeals] = useState<MealData[]>([]);
  const { user } = useAuth();
  const { t } = useTranslation();

  const loadWeightHistoryData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('weight_history')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      setWeightHistory(data || []);
    } catch (error) {
      console.error('Error loading weight history:', error);
    }
  }, [user?.id]);

  // Debounced data loading to prevent excessive requests
  const debouncedLoadData = useRef(
    debounce(async (userId: string) => {
      if (!userId) return;
      
      try {
        await Promise.all([
          loadDailyGoals(),
          loadTodaysMeals(),
          loadHistoryData(),
          loadWeightHistoryData()
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    }, 500)
  ).current;

  useEffect(() => {
    if (user?.id) {
      debouncedLoadData(user.id);
    }
  }, [user?.id, debouncedLoadData]);

  // Calculate trends when data is available
  useEffect(() => {
    if (user && dailyGoals && todaysMeals.length >= 0 && historyData.length >= 0) {
      calculateTrends();
    }
  }, [user, dailyGoals, todaysMeals, historyData]);

  // Cleanup function to clear cache and reset connections on unmount
  useEffect(() => {
    return () => {
      clearCache();
    };
  }, []);

  const loadDailyGoals = async () => {
    if (!user) return;
    
    try {
      const { data: goalsData, error } = await supabase
        .from('daily_goals')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      setDailyGoals({
        calories: goalsData?.calories || 1323,
        protein: goalsData?.protein || 116,
        carbs: goalsData?.carbs || 99,
        fats: goalsData?.fats || 51,
        bmr: goalsData?.bmr,
        tdee: goalsData?.tdee
      });
    } catch (error: any) {
      console.error('Error loading daily goals:', error);
      // Set fallback values on error
      setDailyGoals({
        calories: 1323,
        protein: 116,
        carbs: 99,
        fats: 51
      });
    }
  };

  const loadTodaysMeals = async () => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: mealsData, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', today)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const meals = mealsData?.map(meal => ({
        id: meal.id,
        text: meal.text,
        calories: Number(meal.calories),
        protein: Number(meal.protein),
        carbs: Number(meal.carbs),
        fats: Number(meal.fats),
        timestamp: new Date(meal.created_at),
        meal_type: meal.meal_type,
      })) || [];
      
      setTodaysMeals(meals);
    } catch (error: any) {
      console.error('Error loading today\'s meals:', error);
      setTodaysMeals([]); // Set empty array on error
    }
  };

  const calculateTrends = () => {
    if (historyData.length < 7) return;
    
    try {
      const last7Days = historyData.slice(0, 7);
      const last30Days = historyData.slice(0, 30);
      
      const weeklyAvg = last7Days.reduce((sum, day) => sum + day.totals.calories, 0) / 7;
      const monthlyAvg = last30Days.reduce((sum, day) => sum + day.totals.calories, 0) / Math.min(30, last30Days.length);
      
      const goalReaches = last7Days.filter(day => day.totals.calories >= (dailyGoals?.calories || 1323) * 0.9).length;
      const weeklyGoalReach = (goalReaches / 7) * 100;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (weeklyAvg > monthlyAvg * 1.05) trend = 'up';
      else if (weeklyAvg < monthlyAvg * 0.95) trend = 'down';
      
      const improvement = trend === 'up' ? 
        'Deine Kalorienzufuhr steigt - achte auf deine Ziele!' :
        trend === 'down' ? 
        'Du isst weniger - stelle sicher, dass du genug Energie bekommst!' :
        'Deine Ernährung ist stabil - gut so!';
      
      setTrendData({
        weeklyAverage: Math.round(weeklyAvg),
        monthlyAverage: Math.round(monthlyAvg),
        trend,
        improvement,
        weeklyGoalReach: Math.round(weeklyGoalReach)
      });
    } catch (error) {
      console.error('Error calculating trends:', error);
    }
  };

  const loadHistoryData = async () => {
    if (!user) return;
    
    setHistoryLoading(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: mealsData, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const mealsByDate = mealsData?.reduce((acc: { [key: string]: MealData[] }, meal) => {
        const date = new Date(meal.created_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push({
          id: meal.id,
          text: meal.text,
          calories: Number(meal.calories),
          protein: Number(meal.protein),
          carbs: Number(meal.carbs),
          fats: Number(meal.fats),
          timestamp: new Date(meal.created_at),
          meal_type: meal.meal_type,
        });
        return acc;
      }, {}) || {};
      
      const historyEntries: HistoryEntry[] = Object.entries(mealsByDate).map(([date, meals]) => {
        const totals = meals.reduce(
          (sum, meal) => ({
            calories: sum.calories + meal.calories,
            protein: sum.protein + meal.protein,
            carbs: sum.carbs + meal.carbs,
            fats: sum.fats + meal.fats,
          }),
          { calories: 0, protein: 0, carbs: 0, fats: 0 }
        );
        
        return { date, meals, totals };
      });
      
      setHistoryData(historyEntries);
    } catch (error: any) {
      console.error('Error loading history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Calculate today's totals
  const todaysTotals = todaysMeals.reduce(
    (sum, meal) => ({
      calories: sum.calories + meal.calories,
      protein: sum.protein + meal.protein,
      carbs: sum.carbs + meal.carbs,
      fats: sum.fats + meal.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  // Calculate averages based on filled days only
  const calculateAverages = () => {
    const daysWithData = historyData.filter(entry => entry.meals.length > 0);
    if (daysWithData.length === 0) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    
    const totals = daysWithData.reduce(
      (sum, entry) => ({
        calories: sum.calories + entry.totals.calories,
        protein: sum.protein + entry.totals.protein,
        carbs: sum.carbs + entry.totals.carbs,
        fats: sum.fats + entry.totals.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
    
    return {
      calories: Math.round(totals.calories / daysWithData.length),
      protein: Math.round(totals.protein / daysWithData.length),
      carbs: Math.round(totals.carbs / daysWithData.length),
      fats: Math.round(totals.fats / daysWithData.length),
    };
  };

  const averages = calculateAverages();

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs defaultValue="analyse" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analyse">Analyse</TabsTrigger>
          <TabsTrigger value="coach">Coach</TabsTrigger>
        </TabsList>
        
        <TabsContent value="analyse" className="space-y-6 mt-6">
          {/* Überblick - grundlegende Statistiken */}
          <Overview 
            todaysTotals={todaysTotals}
            dailyGoals={dailyGoals}
            averages={averages}
            weightHistory={weightHistory}
          />

          {/* Insights Analysis - tiefere Einsichten */}
          <InsightsAnalysis 
            todaysTotals={todaysTotals}
            dailyGoals={dailyGoals}
            averages={averages}
            historyData={historyData}
            trendData={trendData}
            weightHistory={weightHistory}
            onWeightAdded={loadWeightHistoryData}
          />
        </TabsContent>
        
        <TabsContent value="coach" className="mt-6">
          <ChatCoach 
            todaysTotals={todaysTotals}
            dailyGoals={dailyGoals}
            averages={averages}
            historyData={historyData}
            trendData={trendData}
            weightHistory={weightHistory}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Coach;
