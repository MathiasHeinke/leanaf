import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { HotSwipeActionCard, HotAction } from './HotSwipeActionCard';
import { openMeal, openWorkout, openSleep, openSupplements, openFluidInput } from '@/components/quick/quickAddBus';
import { Utensils, Droplets, Pill, MessageCircle, Moon, Scale } from 'lucide-react';

interface SmartSuggestionsHubProps {
  date: Date;
  calories: { today: number; goal: number };
  totalWaterMl: number;
}

export const SmartSuggestionsHub: React.FC<SmartSuggestionsHubProps> = ({ 
  date, 
  calories, 
  totalWaterMl 
}) => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<HotAction[]>([]);
  const [loading, setLoading] = useState(false);
  
  const dateStr = useMemo(() => date.toISOString().slice(0, 10), [date]);
  const currentHour = useMemo(() => new Date().getHours(), []);
  const isToday = useMemo(() => dateStr === new Date().toISOString().slice(0, 10), [dateStr]);

  const generateSmartSuggestions = async () => {
    if (!user || !isToday) {
      setSuggestions([]);
      return;
    }
    
    setLoading(true);
    const smartActions: HotAction[] = [];
    
    try {
      // Check what's missing for today
      const [mealsResult, sleepResult, supplementsResult, coachResult, weightResult] = await Promise.all([
        supabase.from('meals').select('id').eq('user_id', user.id).eq('date', dateStr),
        supabase.from('sleep_tracking').select('id').eq('user_id', user.id).eq('date', dateStr),
        supabase.from('supplement_intake_log').select('id').eq('user_id', user.id).eq('date', dateStr),
        supabase.from('coach_conversations').select('id').eq('user_id', user.id).gte('created_at', dateStr + 'T00:00:00Z'),
        supabase.from('weight_history').select('id').eq('user_id', user.id).eq('date', dateStr)
      ]);

      // 1. Meal suggestion based on calories and time
      const mealCount = mealsResult.data?.length || 0;
      const caloriesToGo = Math.max(0, calories.goal - calories.today);
      
      if (caloriesToGo > 200 && mealCount < 4) {
        const timeBasedMeal = currentHour < 10 ? 'Frühstück' : 
                            currentHour < 14 ? 'Mittagessen' : 
                            currentHour < 18 ? 'Snack' : 'Abendessen';
        
        smartActions.push({
          id: 'meal-suggestion',
          title: `${timeBasedMeal} hinzufügen`,
          subtitle: `Noch ${Math.round(caloriesToGo)} kcal bis zum Ziel`,
          onTap: () => openMeal()
        });
      }

      // 2. Water suggestion if intake is low
      const waterGoal = 2500;
      if (totalWaterMl < waterGoal * 0.6) {
        smartActions.push({
          id: 'water-suggestion',
          title: 'Mehr trinken',
          subtitle: `Nur ${Math.round(totalWaterMl)}ml von ${waterGoal}ml`,
          onTap: () => openFluidInput()
        });
      }

      // 3. Supplements based on time of day
      const supplementCount = supplementsResult.data?.length || 0;
      if (supplementCount === 0) {
        const timeBasedSupp = currentHour < 12 ? 'Morgen-Supplements' : 'Abend-Supplements';
        smartActions.push({
          id: 'supplements-suggestion',
          title: timeBasedSupp,
          subtitle: 'Supplements für heute abhaken',
          onTap: () => openSupplements()
        });
      }

      // 4. Coach message if none sent today
      const coachCount = coachResult.data?.length || 0;
      if (coachCount === 0) {
        smartActions.push({
          id: 'coach-suggestion',
          title: 'Coach Nachricht',
          subtitle: 'Wie läuft dein Tag?',
          onTap: () => {}
        });
      }

      // 5. Sleep if it's evening and not logged
      const sleepCount = sleepResult.data?.length || 0;
      if (sleepCount === 0 && currentHour >= 20) {
        smartActions.push({
          id: 'sleep-suggestion',
          title: 'Schlaf eintragen',
          subtitle: 'Wie hast du geschlafen?',
          onTap: () => openSleep()
        });
      }

      // 6. Weight measurement (if none this week)
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const { data: weeklyWeight } = await supabase
        .from('weight_history')
        .select('id')
        .eq('user_id', user.id)
        .gte('date', weekStart.toISOString().slice(0, 10));
        
      if (!weeklyWeight?.length && currentHour >= 6 && currentHour <= 10) {
        smartActions.push({
          id: 'weight-suggestion',
          title: 'Gewicht messen',
          subtitle: 'Wöchentliche Kontrolle',
          onTap: () => {} // Navigate to weight tracking
        });
      }

      setSuggestions(smartActions.slice(0, 5)); // Max 5 suggestions
    } catch (error) {
      console.error('Error generating smart suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateSmartSuggestions();
  }, [user?.id, dateStr, calories.today, totalWaterMl, currentHour]);

  if (!isToday || suggestions.length === 0 || loading) {
    return null;
  }

  return (
    <div className="mb-6">
      <HotSwipeActionCard actions={suggestions} />
    </div>
  );
};