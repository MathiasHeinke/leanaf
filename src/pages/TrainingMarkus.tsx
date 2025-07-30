import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SpecializedCoachChatWrapped } from '@/components/SpecializedCoachChatWrapped';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { debounce, clearCache } from '@/utils/supabaseHelpers';

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
  user_id: string;
  created_at: string;
}

interface TrendData {
  weeklyAverage: number;
  monthlyAverage: number;
  trend: 'up' | 'down' | 'stable';
  improvement: string;
  weeklyGoalReach: number;
}

interface SleepData {
  id: string;
  sleep_hours: number;
  sleep_quality: number;
  date: string;
  libido?: number;
  motivation?: number;
  stress_level?: number;
}

interface BodyMeasurement {
  id: string;
  date: string;
  chest?: number;
  waist?: number;
  belly?: number;
  hips?: number;
  thigh?: number;
  arms?: number;
  neck?: number;
  photo_url?: string;
  notes?: string;
}

interface WorkoutData {
  id: string;
  date: string;
  workout_type: string;
  duration_minutes?: number;
  intensity?: number;
  did_workout: boolean;
  distance_km?: number;
  steps?: number;
  notes?: string;
}

interface ProfileData {
  user_id: string;
  display_name?: string;
  age?: number;
  gender?: string;
  height?: number;
  weight?: number;
  goal?: string;
  activity_level?: string;
  body_fat_percentage?: number;
  muscle_mass_kg?: number;
}

const TrainingMarkus = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Data State
  const [historyData, setHistoryData] = useState<HistoryEntry[]>([]);
  const [dailyGoals, setDailyGoals] = useState<DailyGoal | null>(null);
  const [todaysMeals, setTodaysMeals] = useState<MealData[]>([]);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [sleepData, setSleepData] = useState<SleepData[]>([]);
  const [bodyMeasurements, setBodyMeasurements] = useState<BodyMeasurement[]>([]);
  const [workoutData, setWorkoutData] = useState<WorkoutData[]>([]);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [progressPhotos, setProgressPhotos] = useState<string[]>([]);

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
          loadWeightHistoryData(),
          loadSleepData(),
          loadBodyMeasurements(),
          loadWorkoutData(),
          loadProfileData(),
          loadProgressPhotos()
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
    }
  };

  const loadSleepData = async () => {
    if (!user) return;
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: sleepData, error } = await supabase
        .from('sleep_tracking')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });
      
      if (error) throw error;
      setSleepData(sleepData || []);
    } catch (error) {
      console.error('Error loading sleep data:', error);
      setSleepData([]);
    }
  };

  const loadBodyMeasurements = async () => {
    if (!user) return;
    
    try {
      const { data: measurements, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      setBodyMeasurements(measurements || []);
    } catch (error) {
      console.error('Error loading body measurements:', error);
      setBodyMeasurements([]);
    }
  };

  const loadWorkoutData = async () => {
    if (!user) return;
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: workouts, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });
      
      if (error) throw error;
      setWorkoutData(workouts || []);
    } catch (error) {
      console.error('Error loading workout data:', error);
      setWorkoutData([]);
    }
  };

  const loadProfileData = async () => {
    if (!user) return;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      setProfileData(profile);
    } catch (error) {
      console.error('Error loading profile data:', error);
      setProfileData(null);
    }
  };

  const loadProgressPhotos = async () => {
    if (!user) return;
    
    try {
      const { data: measurements, error } = await supabase
        .from('body_measurements')
        .select('photo_url')
        .eq('user_id', user.id)
        .not('photo_url', 'is', null)
        .order('date', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      const photos = measurements?.map(m => m.photo_url).filter(Boolean) || [];
      setProgressPhotos(photos);
    } catch (error) {
      console.error('Error loading progress photos:', error);
      setProgressPhotos([]);
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
    <div className="h-screen bg-background">
      <SpecializedCoachChatWrapped
          coach={{
            id: 'markus',
            name: 'Markus Rühl',
            role: 'The German Beast',
            description: 'The German Beast - Schwer und falsch trainieren für maximale Muskelmasse!',
            expertise: ['Hardcore Bodybuilding', 'Heavy Training', 'Volume Training', 'Mental Toughness'],
            personality: 'hart',
            color: 'orange',
            imageUrl: '/lovable-uploads/e96e839c-c781-4825-bb29-7c45b9febcdf.png',
            avatar: '/lovable-uploads/e96e839c-c781-4825-bb29-7c45b9febcdf.png',
            age: 51,
            icon: 'dumbbell',
            accentColor: 'from-orange-600 to-red-600',
            quickActions: [
              { text: 'Schwer und falsch!', prompt: 'Erkläre mir das Heavy+Volume Prinzip und wie ich es umsetze.' },
              { text: 'Beast Mode aktivieren', prompt: 'Gib mir mentale Härte und Motivation für ein krasses Training!' },
              { text: 'Muss net schmegge!', prompt: 'Welche Supplements brauche ich für maximale Muskelmasse?' }
            ]
          }}
          onBack={() => navigate('/training')}
          todaysTotals={todaysTotals}
          dailyGoals={dailyGoals || { calories: 1323, protein: 116, carbs: 99, fats: 51 }}
          averages={averages}
          historyData={historyData}
          trendData={trendData}
          weightHistory={weightHistory}
          sleepData={sleepData}
          bodyMeasurements={bodyMeasurements}
          workoutData={workoutData}
          profileData={profileData}
          progressPhotos={progressPhotos}
        />
    </div>
  );
};

export default TrainingMarkus;