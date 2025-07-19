
import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useGlobalMealInput } from "@/hooks/useGlobalMealInput";
import { MealList } from "@/components/MealList";
import { DailyProgress } from "@/components/DailyProgress";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MealInput } from "@/components/MealInput";

const Index = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const mealInputHook = useGlobalMealInput();
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calorieSummary, setCalorieSummary] = useState<{ consumed: number; burned: number }>({ consumed: 0, burned: 0 });
  const [weeklyCalorieData, setWeeklyCalorieData] = useState([]);

  useEffect(() => {
    if (user) {
      fetchMealsForDate(currentDate);
      fetchWeeklyCalorieData();
    }
  }, [user, currentDate]);

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

      // Aggregate calories by date using created_at
      const aggregatedData = data?.reduce((acc: any, item: any) => {
        const date = item.created_at.split('T')[0]; // Extract date part
        if (!acc[date]) {
          acc[date] = { date: date, calories: 0 };
        }
        acc[date].calories += item.calories || 0;
        return acc;
      }, {});

      // Convert aggregated data to array format for Recharts
      const weeklyData = Object.values(aggregatedData || {});

      // Ensure all dates in the last 7 days are present, even with 0 calories
      for (let i = 6; i >= 0; i--) {
        const date = new Date(endDate);
        date.setDate(endDate.getDate() - i);
        const dateString = date.toISOString().split('T')[0];

        if (!aggregatedData?.[dateString]) {
          weeklyData.push({ date: dateString, calories: 0 });
        }
      }

      // Sort by date
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

  const formatDate = (date: Date): string => {
    return format(date, 'EEEE, d. MMMM', { locale: de });
  };

  const handleMealDeleted = async () => {
    await fetchMealsForDate(currentDate);
    await fetchWeeklyCalorieData();
  };

  const handleMealUpdated = async () => {
    await fetchMealsForDate(currentDate);
    await fetchWeeklyCalorieData();
  };

  return (
    <>
      <div className="md:flex md:gap-4">
        <div className="md:w-1/3 space-y-4">
          <DailyProgress 
            dailyTotals={{
              calories: calorieSummary.consumed,
              protein: meals.reduce((sum, meal) => sum + (meal.protein || 0), 0),
              carbs: meals.reduce((sum, meal) => sum + (meal.carbs || 0), 0),
              fats: meals.reduce((sum, meal) => sum + (meal.fats || 0), 0)
            }}
            dailyGoal={{
              calories: 2000,
              protein: 150,
              carbs: 200,
              fats: 70
            }}
          />
          <Card className="glass-card hover-scale">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <h4 className="font-medium text-foreground">Kalender</h4>
              </div>
              <div className="flex items-center justify-between">
                <button onClick={() => { const newDate = new Date(currentDate); newDate.setDate(newDate.getDate() - 1); handleDateChange(newDate); }} className="hover:bg-muted p-1 rounded-full transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>
                </button>
                <span className="font-semibold">{formatDate(currentDate)}</span>
                <button onClick={() => { const newDate = new Date(currentDate); newDate.setDate(newDate.getDate() + 1); handleDateChange(newDate); }} className="hover:bg-muted p-1 rounded-full transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                </button>
              </div>
              <Separator className="my-4" />
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

        <div className="md:w-2/3">
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-3">
              <Badge className="opacity-80">{meals.length}</Badge>
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

      {/* Floating Meal Input - Fully Transparent Background */}
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
