/**
 * useQuickLogging - Centralized quick logging for action cards
 * Handles water, supplements, and protein shake logging with XP rewards
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Helper to get current timing based on hour
const getCurrentTiming = (): 'morning' | 'noon' | 'evening' => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'noon';
  return 'evening';
};

export const useQuickLogging = () => {
  const { user } = useAuth();

  // HYDRATION: Save directly to user_fluids
  const logWater = useCallback(async (amountMl: number, type: 'water' | 'coffee' = 'water'): Promise<boolean> => {
    if (!user?.id) {
      toast.error('Nicht angemeldet');
      return false;
    }

    try {
      const today = new Date().toISOString().slice(0, 10);
      
      const { error } = await supabase
        .from('user_fluids')
        .insert({
          user_id: user.id,
          amount_ml: amountMl,
          date: today,
          consumed_at: new Date().toISOString(),
          custom_name: type === 'coffee' ? 'Kaffee' : null
        });

      if (error) throw error;

      console.log(`[useQuickLogging] Logged ${amountMl}ml ${type}`);
      return true;
    } catch (err) {
      console.error('[useQuickLogging] logWater failed:', err);
      toast.error('Trinken konnte nicht gespeichert werden');
      return false;
    }
  }, [user?.id]);

  // SUPPLEMENTS: Mark user supplements for specific timing as taken
  const logSupplementsTaken = useCallback(async (
    timing: 'morning' | 'noon' | 'evening' | 'pre_workout' | 'post_workout'
  ): Promise<boolean> => {
    if (!user?.id) {
      toast.error('Nicht angemeldet');
      return false;
    }

    try {
      const today = new Date().toISOString().slice(0, 10);

      // Get only supplements that have this timing in their timing array
      const { data: supplements, error: fetchError } = await supabase
        .from('user_supplements')
        .select('id, supplement_id, supplements(name)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .contains('timing', [timing]);

      if (fetchError) throw fetchError;

      if (!supplements || supplements.length === 0) {
        const timingLabels: Record<string, string> = {
          morning: 'Morgens',
          noon: 'Mittags', 
          evening: 'Abends',
          pre_workout: 'Pre-Workout',
          post_workout: 'Post-Workout'
        };
        toast.info(`Keine ${timingLabels[timing]}-Supplements konfiguriert`);
        return false;
      }

      // Create log entries for each supplement with this timing
      const logs = supplements.map(s => ({
        user_id: user.id,
        user_supplement_id: s.id,
        date: today,
        timing: timing,
        taken: true
      }));

      const { error: insertError } = await supabase
        .from('supplement_intake_log')
        .upsert(logs, {
          onConflict: 'user_supplement_id,date,timing'
        });

      if (insertError) throw insertError;

      // Get supplement names for feedback
      const names = supplements
        .map(s => (s.supplements as any)?.name)
        .filter(Boolean)
        .slice(0, 3);
      
      const namesStr = names.length > 0 ? names.join(', ') : `${supplements.length} Supplements`;
      console.log(`[useQuickLogging] Logged ${supplements.length} ${timing} supplements as taken: ${namesStr}`);
      
      return true;
    } catch (err) {
      console.error('[useQuickLogging] logSupplementsTaken failed:', err);
      toast.error('Supplements konnten nicht gespeichert werden');
      return false;
    }
  }, [user?.id]);

  // PROTEIN SHAKE: Quick meal entry with ~25g protein
  const logProteinShake = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      toast.error('Nicht angemeldet');
      return false;
    }

    try {
      const today = new Date().toISOString().slice(0, 10);

      const { error } = await supabase
        .from('meals')
        .insert({
          user_id: user.id,
          text: 'Protein Shake',
          title: 'Protein Shake',
          calories: 150,
          protein: 25,
          carbs: 5,
          fat: 2,
          meal_type: 'snack',
          date: today
        });

      if (error) throw error;

      console.log('[useQuickLogging] Logged protein shake');
      return true;
    } catch (err) {
      console.error('[useQuickLogging] logProteinShake failed:', err);
      toast.error('Protein Shake konnte nicht gespeichert werden');
      return false;
    }
  }, [user?.id]);

  return { 
    logWater, 
    logSupplementsTaken, 
    logProteinShake,
    getCurrentTiming
  };
};
