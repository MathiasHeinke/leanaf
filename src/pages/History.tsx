
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History as HistoryIcon, TrendingUp, Calendar, Filter, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { HistoryCharts } from "@/components/HistoryCharts";
import { HistoryTable } from "@/components/HistoryTable";
import { PointsHistoryModal } from "@/components/PointsHistoryModal";
import { format, subDays, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { de } from "date-fns/locale";

interface MealEntry {
  id: string;
  meal_name: string;
  meal_type: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  quality_score: number;
  created_at: string;
  date: string;
}

interface WeightEntry {
  id: string;
  weight: number;
  date: string;
  created_at: string;
}

const History = () => {
  const { user } = useAuth();
  const [showPointsHistory, setShowPointsHistory] = useState(false);
  const [mealData, setMealData] = useState<MealEntry[]>([]);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const [loading, setLoading] = useState(false);

  const dailyGoal = {
    calories: 2000,
    protein: 150,
    carbs: 250,
    fats: 65
  };

  const loadHistoryData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      let startDate: Date;
      const today = new Date();

      switch (timeRange) {
        case 'week':
          startDate = startOfWeek(today, { weekStartsOn: 1 });
          break;
        case 'month':
          startDate = startOfMonth(today);
          break;
        case 'year':
          startDate = startOfYear(today);
          break;
        default:
          startDate = subDays(today, 7);
      }

      // Load meal data
      const { data: meals, error: mealsError } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false });

      if (mealsError) throw mealsError;

      // Load weight history
      const { data: weights, error: weightsError } = await supabase
        .from('weight_history')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (weightsError) throw weightsError;

      setMealData(meals || []);
      setWeightHistory(weights || []);
    } catch (error) {
      console.error('Error loading history data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistoryData();
  }, [user?.id, timeRange]);

  const handleDeleteMeal = async (mealId: string) => {
    try {
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', mealId)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Refresh data
      loadHistoryData();
    } catch (error) {
      console.error('Error deleting meal:', error);
    }
  };

  const handleUpdateMeal = async (mealId: string, updates: Partial<MealEntry>) => {
    try {
      const { error } = await supabase
        .from('meals')
        .update(updates)
        .eq('id', mealId)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Refresh data
      loadHistoryData();
    } catch (error) {
      console.error('Error updating meal:', error);
    }
  };

  const handleDuplicateMeal = async (meal: MealEntry) => {
    try {
      const { id, created_at, ...mealData } = meal;
      const { error } = await supabase
        .from('meals')
        .insert({
          ...mealData,
          user_id: user?.id,
          date: format(new Date(), 'yyyy-MM-dd')
        });

      if (error) throw error;

      // Refresh data
      loadHistoryData();
    } catch (error) {
      console.error('Error duplicating meal:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <HistoryIcon className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Verlauf</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowPointsHistory(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Punkte-Verlauf
          </Button>
          
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={timeRange === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange('week')}
            >
              Woche
            </Button>
            <Button
              variant={timeRange === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange('month')}
            >
              Monat
            </Button>
            <Button
              variant={timeRange === 'year' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange('year')}
            >
              Jahr
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="charts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="charts">Diagramme</TabsTrigger>
          <TabsTrigger value="table">Tabelle</TabsTrigger>
        </TabsList>
        
        <TabsContent value="charts" className="space-y-6">
          <HistoryCharts 
            data={mealData}
            weightHistory={weightHistory}
            timeRange={timeRange}
            loading={loading}
          />
        </TabsContent>
        
        <TabsContent value="table" className="space-y-6">
          <HistoryTable 
            data={mealData}
            timeRange={timeRange}
            dailyGoal={dailyGoal}
            userGoal="lose"
            loading={loading}
            onDeleteMeal={handleDeleteMeal}
            onUpdateMeal={handleUpdateMeal}
            onDuplicateMeal={handleDuplicateMeal}
          />
        </TabsContent>
      </Tabs>

      <PointsHistoryModal
        isOpen={showPointsHistory}
        onClose={() => setShowPointsHistory(false)}
      />
    </div>
  );
};

export default History;
