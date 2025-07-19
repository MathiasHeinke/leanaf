
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useGlobalMealInput } from "@/hooks/useGlobalMealInput";
import { MealList } from "@/components/MealList";
import { DailyProgress } from "@/components/DailyProgress";
import { DailyGreeting } from "@/components/DailyGreeting";
import { QuickWeightInput } from "@/components/QuickWeightInput";
import { DateNavigation } from "@/components/DateNavigation";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MealInput } from "@/components/MealInput";

const Index = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const mealInputHook = useGlobalMealInput();
  
  // State management
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calorieSummary, setCalorieSummary] = useState<{ consumed: number; burned: number }>({ consumed: 0, burned: 0 });
  const [weeklyCalorieData, setWeeklyCalorieData] = useState([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [dailyGoals, setDailyGoals] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Load user data
  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  // Load meals when date changes
  useEffect(() => {
    if (user && dailyGoals) {
      fetchMealsForDate(currentDate);
      fetchWeeklyCalorieData();
    }
  }, [user, currentDate, dailyGoals]);

  const loadUserData = async () => {
    if (!user) return;
    
    setDataLoading(true);
    try {
      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error loading profile:', profileError);
      } else {
        setUserProfile(profileData);
      }

      // Load daily goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('daily_goals')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (goalsError) {
        console.error('Error loading daily goals:', goalsError);
        // Set default goals if none exist
        setDailyGoals({
          calories: 2000,
          protein: 150,
          carbs: 250,
          fats: 65
        });
      } else {
        setDailyGoals(goalsData || {
          calories: 2000,
          protein: 150,
          carbs: 250,
          fats: 65
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchMealsForDate = async (date: Date) => {
    setLoading(true);
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user?.id)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mealsData = data || [];
      setMeals(mealsData);
      updateCalorieSummary(mealsData);
    } catch (error) {
      console.error('Error fetching meals:', error);
      setMeals([]);
      updateCalorieSummary([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyCalorieData = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 6);

      const { data, error } = await supabase
        .from('meals')
        .select('calories, created_at')
        .eq('user_id', user?.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      // Aggregate calories by date
      const aggregatedData = data?.reduce((acc: any, item: any) => {
        const date = item.created_at.split('T')[0];
        if (!acc[date]) {
          acc[date] = { date: date, calories: 0 };
        }
        acc[date].calories += item.calories || 0;
        return acc;
      }, {});

      const weeklyData = Object.values(aggregatedData || {});

      // Ensure all dates in the last 7 days are present
      for (let i = 6; i >= 0; i--) {
        const date = new Date(endDate);
        date.setDate(endDate.getDate() - i);
        const dateString = date.toISOString().split('T')[0];

        if (!aggregatedData?.[dateString]) {
          weeklyData.push({ date: dateString, calories: 0 });
        }
      }

      weeklyData.sort((a: any, b: any) => (a.date > b.date ? 1 : -1));
      setWeeklyCalorieData(weeklyData as any);
    } catch (error) {
      console.error('Error fetching weekly calorie data:', error);
    }
  };

  const updateCalorieSummary = (meals: any[]) => {
    const consumed = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    setCalorieSummary({ consumed, burned: 0 });
  };

  const handleDateChange = (date: Date) => {
    setCurrentDate(new Date(date));
  };

  const handleMealDeleted = async () => {
    await fetchMealsForDate(currentDate);
    await fetchWeeklyCalorieData();
  };

  const handleMealUpdated = async () => {
    await fetchMealsForDate(currentDate);
    await fetchWeeklyCalorieData();
  };

  const handleWeightAdded = () => {
    loadUserData(); // Reload user data to get updated weight
  };

  if (dataLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Daily Greeting */}
        <DailyGreeting userProfile={userProfile} />

        {/* Date Navigation - Prominently placed */}
        <DateNavigation 
          currentDate={currentDate}
          onDateChange={handleDateChange}
        />

        <div className="md:flex md:gap-6">
          <div className="md:w-1/3 space-y-4">
            {/* Quick Weight Input */}
            <QuickWeightInput 
              currentWeight={userProfile?.weight}
              onWeightAdded={handleWeightAdded}
            />

            {/* Daily Progress with real data */}
            <DailyProgress 
              dailyTotals={{
                calories: calorieSummary.consumed,
                protein: meals.reduce((sum, meal) => sum + (meal.protein || 0), 0),
                carbs: meals.reduce((sum, meal) => sum + (meal.carbs || 0), 0),
                fats: meals.reduce((sum, meal) => sum + (meal.fats || 0), 0)
              }}
              dailyGoal={{
                calories: dailyGoals?.calories || 2000,
                protein: dailyGoals?.protein || 150,
                carbs: dailyGoals?.carbs || 250,
                fats: dailyGoals?.fats || 65
              }}
              userGoal={userProfile?.goal || 'maintain'}
            />

            {/* Weekly Chart */}
            <Card className="glass-card hover-scale">
              <CardContent className="p-4">
                <h4 className="font-medium text-foreground mb-4">7-Tage Überblick</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weeklyCalorieData} margin={{ top: 20, right: 0, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(date) => format(new Date(date), 'E', { locale: de })} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="calories" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="md:w-2/3 mt-6 md:mt-0">
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-3">
                <Badge className="opacity-80">{meals.length} Mahlzeiten</Badge>
              </div>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <MealList 
                  dailyMeals={meals.map((meal: any) => ({
                    id: meal.id,
                    text: meal.text,
                    calories: meal.calories,
                    protein: meal.protein,
                    carbs: meal.carbs,
                    fats: meal.fats,
                    timestamp: new Date(meal.created_at),
                    meal_type: meal.meal_type
                  }))} 
                  onEditMeal={(meal: any) => {}}
                  onDeleteMeal={handleMealDeleted}
                  onUpdateMeal={handleMealUpdated}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Meal Input */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-transparent">
        <div className="max-w-md mx-auto px-4 pb-3 pt-2 bg-transparent">
          <MealInput 
            inputText={mealInputHook.inputText}
            setInputText={mealInputHook.setInputText}
            onSubmitMeal={mealInputHook.handleSubmitMeal}
            onPhotoUpload={mealInputHook.handlePhotoUpload}
            onVoiceRecord={mealInputHook.handleVoiceRecord}
            isAnalyzing={mealInputHook.isAnalyzing}
            isRecording={mealInputHook.isRecording}
            isProcessing={mealInputHook.isProcessing}
            uploadedImages={mealInputHook.uploadedImages}
            onRemoveImage={mealInputHook.removeImage}
          />
        </div>
      </div>
    </>
  );
};

export default Index;
