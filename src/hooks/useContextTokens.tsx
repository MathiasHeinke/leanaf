import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentDateString } from '@/utils/dateHelpers';

interface ContextTokens {
  userName?: string;
  timeOfDay: string;
  lastWorkout?: string;
  sleepHours?: number;
  calLeft?: number;
  lastLift?: number;
  coachFocus?: string;
}

export const useContextTokens = (userId?: string) => {
  const [tokens, setTokens] = useState<ContextTokens>({
    timeOfDay: getTimeOfDay()
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchContextData = async () => {
      try {
        setLoading(true);
        
        // For now, use simple fallback values with basic DB integration
        // This avoids complex type issues while still providing real context
        
        try {
          // Try to get daily goals if available
          const { data: goals } = await supabase
            .from('daily_goals')
            .select('calories')
            .eq('user_id', userId)
            .maybeSingle();

          // Try to get today's meals
          const today = getCurrentDateString();
          const { data: meals } = await supabase
            .from('meals')
            .select('calories')
            .eq('user_id', userId)
            .gte('created_at', today + 'T00:00:00')
            .lt('created_at', today + 'T23:59:59');

          // Calculate calories left
          const consumedCalories = meals?.reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0) || 0;
          const dailyCalories = goals?.calories || 2000;
          const caloriesLeft = Math.max(0, dailyCalories - consumedCalories);

          setTokens({
            userName: 'Nutzer', // Will be enhanced with auth user data
            timeOfDay: getTimeOfDay(),
            lastWorkout: undefined,
            sleepHours: undefined,
            calLeft: caloriesLeft > 0 ? caloriesLeft : undefined,
            lastLift: undefined,
            coachFocus: undefined
          });
        } catch (dbError) {
          // Fallback to basic tokens if DB queries fail
          setTokens({
            userName: 'Nutzer',
            timeOfDay: getTimeOfDay(),
            lastWorkout: undefined,
            sleepHours: undefined,
            calLeft: undefined,
            lastLift: undefined,
            coachFocus: undefined
          });
        }
      } catch (error) {
        console.error('Error fetching context tokens:', error);
        // Fallback to basic tokens
        setTokens({
          userName: 'Nutzer',
          timeOfDay: getTimeOfDay(),
          lastWorkout: undefined,
          sleepHours: undefined,
          calLeft: undefined,
          lastLift: undefined,
          coachFocus: undefined
        });
      } finally {
        setLoading(false);
      }
    };

    fetchContextData();
  }, [userId]);

  return { tokens, loading, setTokens };
};

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morgen';
  if (hour < 18) return 'Tag';
  return 'Abend';
}

function extractFirstName(email?: string): string | undefined {
  if (!email) return undefined;
  const localPart = email.split('@')[0];
  
  // Filter out "office" and other non-name patterns
  if (localPart === 'office' || localPart === 'admin' || localPart === 'info' || localPart === 'support') {
    return undefined;
  }
  
  // Try to extract a name-like part (before dots, numbers, etc.)
  const nameMatch = localPart.match(/^([a-zA-Z]+)/);
  return nameMatch?.[1] || undefined;
}