import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";
import { getGoalStatus, UserGoal } from "@/utils/goalBasedMessaging";
import { useDataRefresh } from "@/hooks/useDataRefresh";
import { HistoryTable } from "./HistoryTable";
import { WeightHistory } from "./WeightHistory";
import { Utensils, Scale } from "lucide-react";

interface DailyGoal {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface MealData {
  id: string;
  text: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  created_at: string;
  meal_type: string;
  images?: string[];
}

interface DailyData {
  date: string;
  displayDate: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  meals: MealData[];
}

interface WeightEntry {
  id: string;
  date: string;
  weight: number;
  body_fat_percentage?: number;
  muscle_percentage?: number;
  photo_urls?: string[];
  notes?: string;
  displayDate: string;
}

interface HistoryProps {
  onClose?: () => void;
  dailyGoal?: DailyGoal;
  onAddMeal?: (selectedDate: string) => void;
}

const History = ({ onClose, dailyGoal = { calories: 2000, protein: 150, carbs: 250, fats: 65 }, onAddMeal }: HistoryProps) => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const [historyData, setHistoryData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userGoal, setUserGoal] = useState<UserGoal>('maintain');
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [weightLoading, setWeightLoading] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();

  const refreshData = useCallback(() => {
    if (user) {
      loadHistoryData();
      loadUserGoal();
      loadWeightHistory();
    }
  }, [user, timeRange]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useDataRefresh(refreshData);

  // Helper function to get German calendar week number
  const getGermanWeekNumber = (date: Date): number => {
    const tempDate = new Date(date.getTime());
    tempDate.setHours(0, 0, 0, 0);
    // Thursday in current week decides the year
    tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
    // January 4 is always in week 1
    const week1 = new Date(tempDate.getFullYear(), 0, 4);
    // Adjust to Thursday in week 1 and count weeks from there
    return 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  // Helper function to get start of week (Monday)
  const getWeekStart = (date: Date): Date => {
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  };

  const loadHistoryData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Load proper amount of days based on time range
      const daysToLoad = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365; // Full year for year view
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysToLoad);

      // Loading data for time range

      const { data: mealsData, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Meals data loaded

      const mealIds = mealsData?.map(meal => meal.id) || [];
      const { data: imagesData, error: imagesError } = await supabase
        .from('meal_images')
        .select('*')
        .in('meal_id', mealIds);

      if (imagesError) {
        console.error('Error loading meal images:', imagesError);
      }

      const imagesByMealId = new Map<string, string[]>();
      imagesData?.forEach(image => {
        if (!imagesByMealId.has(image.meal_id)) {
          imagesByMealId.set(image.meal_id, []);
        }
        imagesByMealId.get(image.meal_id)?.push(image.image_url);
      });

      // For year view, group by calendar weeks (52 weeks)
      if (timeRange === 'year') {
        const weeklyData = new Map<string, DailyData>();
        const today = new Date();
        const currentYear = today.getFullYear();
        
        // Generate all 52 calendar weeks of the current year
        for (let weekNum = 1; weekNum <= 52; weekNum++) {
          // Calculate the Monday of each calendar week
          const jan4 = new Date(currentYear, 0, 4); // January 4th is always in week 1
          const week1Monday = getWeekStart(jan4);
          const weekStart = new Date(week1Monday);
          weekStart.setDate(week1Monday.getDate() + (weekNum - 1) * 7);
          
          // Skip future weeks
          if (weekStart > today) continue;
          
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          
          const weekKey = `${currentYear}-W${weekNum.toString().padStart(2, '0')}`;
          
          weeklyData.set(weekKey, {
            date: weekKey,
            displayDate: `KW ${weekNum}: ${weekStart.toLocaleDateString('de-DE', { 
              day: '2-digit', 
              month: '2-digit' 
            })} - ${weekEnd.toLocaleDateString('de-DE', { 
              day: '2-digit', 
              month: '2-digit' 
            })}`,
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0,
            meals: []
          });
        }

        // Group meals by calendar week
        mealsData?.forEach(meal => {
          const mealDate = new Date(meal.created_at);
          const weekNum = getGermanWeekNumber(mealDate);
          const weekKey = `${mealDate.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
          
          const week = weeklyData.get(weekKey);
          if (week) {
            const mealWithImages = {
              ...meal,
              images: imagesByMealId.get(meal.id) || []
            };
            week.meals.push(mealWithImages);
            week.calories += Number(meal.calories);
            week.protein += Number(meal.protein);
            week.carbs += Number(meal.carbs);
            week.fats += Number(meal.fats);
          }
        });

        // Calculate weekly averages (over all 7 days, not just days with meals)
        weeklyData.forEach(week => {
          const today = new Date();
          const weekMatch = week.date.match(/(\d{4})-W(\d{2})/);
          if (weekMatch) {
            const year = parseInt(weekMatch[1]);
            const weekNum = parseInt(weekMatch[2]);
            
            // Calculate actual week start
            const jan4 = new Date(year, 0, 4);
            const week1Monday = getWeekStart(jan4);
            const weekStart = new Date(week1Monday);
            weekStart.setDate(week1Monday.getDate() + (weekNum - 1) * 7);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            
            // For current week, only count days that have passed
            let daysToAverage = 7;
            if (weekEnd > today) {
              const daysPassed = Math.max(1, Math.ceil((today.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
              daysToAverage = Math.min(7, daysPassed);
            }
            
            // Calculate average over the appropriate number of days
            week.calories = Math.round(week.calories / daysToAverage);
            week.protein = Math.round(week.protein / daysToAverage);
            week.carbs = Math.round(week.carbs / daysToAverage);
            week.fats = Math.round(week.fats / daysToAverage);
          }
        });

        const weeklyArray = Array.from(weeklyData.values())
          .filter(week => week.date <= `${currentYear}-W${getGermanWeekNumber(today).toString().padStart(2, '0')}`)
          .sort((a, b) => b.date.localeCompare(a.date));

        // Weekly entries created for year view
        setHistoryData(weeklyArray);
      } else {
        // For week and month view, show individual days
        const groupedData = new Map<string, DailyData>();
        
        for (let i = 0; i < daysToLoad; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          groupedData.set(dateStr, {
            date: dateStr,
            displayDate: date.toLocaleDateString('de-DE', { 
              day: '2-digit', 
              month: '2-digit' 
            }),
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0,
            meals: []
          });
        }

        mealsData?.forEach(meal => {
          const date = new Date(meal.created_at).toISOString().split('T')[0];
          const day = groupedData.get(date);
          if (day) {
            const mealWithImages = {
              ...meal,
              images: imagesByMealId.get(meal.id) || []
            };
            day.meals.push(mealWithImages);
            day.calories += Number(meal.calories);
            day.protein += Number(meal.protein);
            day.carbs += Number(meal.carbs);
            day.fats += Number(meal.fats);
          }
        });

        const dailyArray = Array.from(groupedData.values()).sort((a, b) => b.date.localeCompare(a.date));
        // Daily entries created for time range view
        setHistoryData(dailyArray);
      }
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error('Fehler beim Laden der Verlaufsdaten');
    } finally {
      setLoading(false);
    }
  };

  const loadUserGoal = async () => {
    if (!user) return;
    
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('goal')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (profileData?.goal) {
        setUserGoal(profileData.goal as UserGoal);
      }
    } catch (error: any) {
      console.error('Error loading user goal:', error);
    }
  };

  const loadWeightHistory = async () => {
    if (!user) return;
    
    setWeightLoading(true);
    try {
      const daysToLoad = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysToLoad);

      const { data: weightData, error } = await supabase
        .from('weight_history')
        .select('id, date, weight, body_fat_percentage, muscle_percentage, photo_urls, notes')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      const formattedWeights = weightData?.map(entry => ({
        id: entry.id,
        date: entry.date,
        weight: Number(entry.weight),
        body_fat_percentage: entry.body_fat_percentage ? Number(entry.body_fat_percentage) : undefined,
        muscle_percentage: entry.muscle_percentage ? Number(entry.muscle_percentage) : undefined,
        photo_urls: Array.isArray(entry.photo_urls) ? entry.photo_urls.filter((url): url is string => typeof url === 'string') : [],
        notes: entry.notes || undefined,
        displayDate: new Date(entry.date).toLocaleDateString('de-DE', { 
          day: '2-digit', 
          month: '2-digit' 
        })
      })) || [];
      
      setWeightHistory(formattedWeights);
    } catch (error: any) {
      console.error('Error loading weight history:', error);
    } finally {
      setWeightLoading(false);
    }
  };

  const deleteMeal = async (mealId: string) => {
    try {
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', mealId);

      if (error) throw error;

      toast.success('Mahlzeit gelöscht');
      await loadHistoryData();
    } catch (error) {
      console.error('Error deleting meal:', error);
      toast.error('Fehler beim Löschen der Mahlzeit');
    }
  };

  const updateMeal = async (mealId: string, updates: Partial<MealData>) => {
    try {
      const { error } = await supabase
        .from('meals')
        .update(updates)
        .eq('id', mealId);

      if (error) throw error;

      toast.success('Mahlzeit aktualisiert');
      await loadHistoryData();
    } catch (error) {
      console.error('Error updating meal:', error);
      toast.error('Fehler beim Aktualisieren der Mahlzeit');
    }
  };

  const duplicateMeal = async (meal: MealData) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('meals')
        .insert({
          user_id: user.id,
          text: meal.text,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fats: meal.fats,
          meal_type: meal.meal_type,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      if (meal.images && meal.images.length > 0) {
        const imageInserts = meal.images.map(imageUrl => ({
          user_id: user.id,
          meal_id: data.id,
          image_url: imageUrl
        }));

        const { error: imageError } = await supabase
          .from('meal_images')
          .insert(imageInserts);

        if (imageError) {
          console.error('Error duplicating images:', imageError);
        }
      }

      toast.success('Mahlzeit erfolgreich dupliziert');
      await loadHistoryData();
    } catch (error) {
      console.error('Error duplicating meal:', error);
      toast.error('Fehler beim Duplizieren der Mahlzeit');
    }
  };

  const refreshDataCallback = useCallback(() => {
    refreshData();
  }, [refreshData]);

  const currentData = historyData;
  const daysWithMeals = currentData.filter(day => day.meals.length > 0);
  const averageCalories = daysWithMeals.length > 0 ? Math.round(
    daysWithMeals.reduce((sum, day) => sum + day.calories, 0) / daysWithMeals.length
  ) : 0;

  const goalsAchieved = currentData.filter(day => {
    const goalStatus = getGoalStatus(day.calories, dailyGoal.calories, userGoal);
    return goalStatus.status === 'success';
  }).length;

  return (
    <div className="space-y-4 pb-20">
      {/* Header Stats */}
      <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{averageCalories}</div>
            <div className="text-sm text-muted-foreground">Ø Kalorien/Tag</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{goalsAchieved}</div>
            <div className="text-sm text-muted-foreground">Ziele erreicht</div>
          </div>
        </div>
      </Card>

      {/* Zeitraum-Auswahl */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant={timeRange === 'week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange('week')}
          className="text-xs"
        >
          7 Tage
        </Button>
        <Button
          variant={timeRange === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange('month')}
          className="text-xs"
        >
          30 Tage
        </Button>
        <Button
          variant={timeRange === 'year' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange('year')}
          className="text-xs"
        >
          52 Wochen
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="table" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="table" className="flex items-center gap-2">
            <Utensils className="h-4 w-4" />
            Mahlzeiten
          </TabsTrigger>
          <TabsTrigger value="weight" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Gewicht
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="table" className="space-y-3 mt-4">
          <HistoryTable
            data={currentData}
            timeRange={timeRange}
            dailyGoal={dailyGoal}
            userGoal={userGoal}
            loading={loading}
            onDeleteMeal={deleteMeal}
            onUpdateMeal={updateMeal}
            onDuplicateMeal={duplicateMeal}
          />
        </TabsContent>
        
        <TabsContent value="weight" className="mt-4">
          <WeightHistory
            weightHistory={weightHistory}
            loading={weightLoading}
            onDataUpdate={refreshDataCallback}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default History;
