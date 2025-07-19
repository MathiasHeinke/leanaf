import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useMealInput } from "@/hooks/useMealInput";
import { MainLayout } from "@/layouts/MainLayout";
import { MealList } from "@/components/MealList";
import { WeightTracker } from "@/components/WeightTracker";
import { DailySummary } from "@/components/DailySummary";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { UtcToLocal } from "@/components/UtcToLocal";
import { MealInput } from "@/components/MealInput";

const Index = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const mealInputHook = useMealInput();
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calorieSummary, setCalorieSummary] = useState<{ consumed: number; burned: number }>({ consumed: 0, burned: 0 });
  const [weeklyCalorieData, setWeeklyCalorieData] = useState([]);

  useEffect(() => {
    if (user) {
      fetchWeightHistory();
      fetchMealsForDate(currentDate);
      fetchWeeklyCalorieData();
    }
  }, [user, currentDate]);

  const fetchWeightHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('weight_history')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setWeightHistory(data || []);
    } catch (error) {
      console.error('Error fetching weight history:', error);
    }
  };

  const fetchMealsForDate = async (date: Date) => {
    setLoading(true);
    try {
      const formattedDate = date.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user?.id)
        .eq('date', formattedDate)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeals(data || []);
      updateCalorieSummary(data || []);
    } catch (error) {
      console.error('Error fetching meals:', error);
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
        .select('date, calories')
        .eq('user_id', user?.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);
  
      if (error) throw error;
  
      // Aggregate calories by date
      const aggregatedData = data?.reduce((acc: any, item: any) => {
        const date = item.date;
        if (!acc[date]) {
          acc[date] = { date: date, calories: 0 };
        }
        acc[date].calories += item.calories;
        return acc;
      }, {});
  
      // Convert aggregated data to array format for Recharts
      const weeklyData = Object.values(aggregatedData);
  
      // Ensure all dates in the last 7 days are present, even with 0 calories
      for (let i = 6; i >= 0; i--) {
        const date = new Date(endDate);
        date.setDate(endDate.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
  
        if (!aggregatedData[dateString]) {
          weeklyData.push({ date: dateString, calories: 0 });
        }
      }
  
      // Sort by date
      weeklyData.sort((a: any, b: any) => (a.date > b.date ? 1 : -1));
  
      setWeeklyCalorieData(weeklyData);
    } catch (error) {
      console.error('Error fetching weekly calorie data:', error);
    }
  };

  const updateCalorieSummary = (meals: any[]) => {
    const consumed = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    setCalorieSummary({ ...calorieSummary, consumed });
  };

  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
  };

  const handleWeightAdded = () => {
    fetchWeightHistory();
  };

  const formatDate = (date: Date): string => {
    return format(date, 'EEEE, d. MMMM', { locale: de });
  };

  return (
    <div>
      <MainLayout>
        <div className="md:flex md:gap-4">
          <div className="md:w-1/3 space-y-4">
            <WeightTracker weightHistory={weightHistory} onWeightAdded={handleWeightAdded} />
            <DailySummary calorieSummary={calorieSummary} />
            <Card className="glass-card hover-scale">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <h4 className="font-medium text-foreground">Kalender</h4>
                </div>
                <div className="flex items-center justify-between">
                  <button onClick={() => handleDateChange(new Date(currentDate.setDate(currentDate.getDate() - 1)))} className="hover:bg-muted p-1 rounded-full transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>
                  </button>
                  <span className="font-semibold">{formatDate(currentDate)}</span>
                  <button onClick={() => handleDateChange(new Date(currentDate.setDate(currentDate.getDate() + 1)))} className="hover:bg-muted p-1 rounded-full transition-colors">
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
                <h2 className="scroll-m-20 pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0 text-foreground">
                  {t('meals.title')}
                </h2>
                <Badge className="opacity-80">{meals.length}</Badge>
              </div>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <MealList meals={meals} onMealDeleted={() => fetchMealsForDate(currentDate)} />
              )}
            </div>
          </div>
        </div>

      </MainLayout>

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
            onRemoveImage={mealInputHook.handleRemoveImage}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
