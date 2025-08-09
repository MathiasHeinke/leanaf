import React, { useState, useEffect, useCallback } from 'react';
import { QuickCardShell } from './QuickCardShell';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { QuickMealSheet } from '@/components/quick/QuickMealSheet';
import { Badge } from '@/components/ui/badge';
import { Utensils, Camera, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentDateString } from '@/utils/dateHelpers';

interface TodaysMeal {
  id: string;
  title?: string;
  calories?: number;
  protein?: number;
  created_at: string;
}

export const QuickMealsCard: React.FC = () => {
  const { user } = useAuth();
  const [quickMealOpen, setQuickMealOpen] = useState(false);
  const [todaysMeals, setTodaysMeals] = useState<TodaysMeal[]>([]);

  const loadTodaysMeals = useCallback(async () => {
    if (!user) return;

    try {
      const today = getCurrentDateString();
      const { data, error } = await supabase
        .from('meals')
        .select('id, title, calories, protein, created_at')
        .eq('user_id', user.id)
        .eq('date', today)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      setTodaysMeals(data || []);
    } catch (error) {
      console.error('Error loading today meals:', error);
    }
  }, [user]);

  useEffect(() => {
    loadTodaysMeals();
  }, [loadTodaysMeals]);

  const getTotalCalories = () => {
    return todaysMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
  };

  const getTotalProtein = () => {
    return todaysMeals.reduce((sum, meal) => sum + (meal.protein || 0), 0);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLastMealTitle = () => {
    if (todaysMeals.length === 0) return 'Keine Mahlzeiten';
    const lastMeal = todaysMeals[0];
    return lastMeal.title || 'Mahlzeit ohne Titel';
  };

  const mealCount = todaysMeals.length;
  const totalCalories = getTotalCalories();
  const totalProtein = getTotalProtein();
  const targetCalories = 1800; // Could be from user preferences
  const progressPercent = totalCalories > 0 ? Math.min(100, (totalCalories / targetCalories) * 100) : 0;
  const dataState = mealCount === 0 ? 'empty' : 
                   progressPercent >= 80 ? 'done' : 'partial';

  return (
    <>
      <QuickCardShell
        title="Mahlzeiten"
        icon={<Utensils className="h-4 w-4" />}
        dataState={dataState}
        progressPercent={progressPercent}
        status={mealCount > 0 ? `${mealCount} Mahlzeit(en)` : 'Noch keine Mahlzeiten'}
        quickActions={[
          {
            label: '+ Hinzufügen',
            onClick: () => setQuickMealOpen(true),
            variant: 'default'
          }
        ]}
        dropdownActions={todaysMeals.slice(0, 3).map(meal => ({
          label: meal.title || 'Unbenannte Mahlzeit',
          icon: <Utensils className="h-3 w-3" />,
          onClick: () => setQuickMealOpen(true) // Could open specific meal edit in future
        }))}
      >
        {mealCount > 0 && (
          <div className="space-y-3">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 bg-muted/30 rounded">
                <div className="font-semibold text-orange-600">{Math.round(totalCalories)}</div>
                <div className="text-xs text-muted-foreground">Kalorien</div>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded">
                <div className="font-semibold text-blue-600">{Math.round(totalProtein)}g</div>
                <div className="text-xs text-muted-foreground">Protein</div>
              </div>
            </div>

            {/* Recent Meals */}
            <div className="space-y-2">
              {todaysMeals.slice(0, 2).map(meal => (
                <div key={meal.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Utensils className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{meal.title || 'Mahlzeit'}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {formatTime(meal.created_at)}
                      </span>
                    </div>
                    {meal.calories && (
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(meal.calories)} kcal
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </QuickCardShell>

      <QuickMealSheet 
        open={quickMealOpen} 
        onOpenChange={setQuickMealOpen}
      />
    </>
  );
};