import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
        
        // Simple implementation - avoid complex DB queries for now
        // Basic context tokens with time of day
        setTokens({
          userName: 'Nutzer', // Will be enhanced when we know the correct DB schema
          timeOfDay: getTimeOfDay(),
          lastWorkout: undefined,
          sleepHours: undefined,
          calLeft: undefined,
          lastLift: undefined,
          coachFocus: undefined
        });
      } catch (error) {
        console.error('Error fetching context tokens:', error);
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