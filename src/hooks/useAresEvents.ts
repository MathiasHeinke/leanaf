/**
 * useAresEvents - Central Event Controller for Optimistic UI Tracking
 * Handles all tracking actions with instant UI feedback and background DB sync
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DAILY_METRICS_KEY, DailyMetrics } from './useDailyMetrics';

export type EventCategory = 'water' | 'coffee' | 'supplement' | 'weight' | 'workout' | 'sleep';

export interface EventPayload {
  amount?: number;
  supplementId?: string;
  timing?: 'morning' | 'noon' | 'evening' | 'pre_workout' | 'post_workout';
  customName?: string;
  
  // Weight (extended)
  weight_kg?: number;
  body_fat_percentage?: number;
  muscle_percentage?: number;
  notes?: string;
  
  // Workout (extended)
  training_type?: 'rpt' | 'zone2' | 'vo2max' | 'sauna';
  split_type?: 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full';
  duration_minutes?: number;
  total_volume_kg?: number;
  session_data?: Record<string, unknown>;
  
  // Sleep (extended)
  sleep_hours?: number;
  sleep_quality?: number; // 1-5
  bedtime?: string;
  wake_time?: string;
  sleep_interruptions?: number;
  screen_time_evening?: number;
  morning_libido?: number;
  motivation_level?: number;
  
  // Shared
  date?: string;
}

export const useAresEvents = () => {
  const queryClient = useQueryClient();

  /**
   * Track an event with optimistic UI update
   * Returns true if background sync succeeded, false otherwise
   */
  const trackEvent = useCallback(async (
    category: EventCategory, 
    payload: EventPayload
  ): Promise<boolean> => {
    
    // === A. OPTIMISTIC UPDATE (INSTANT - 0ms) ===
    queryClient.setQueryData<DailyMetrics>(DAILY_METRICS_KEY, (old) => {
      if (!old) return old;
      
      // Water & Coffee → add to water.current
      if (category === 'water' || category === 'coffee') {
        return {
          ...old,
          water: { 
            ...old.water, 
            current: old.water.current + (payload.amount || 0) 
          }
        };
      }
      
      // Supplement → add to takenIds
      if (category === 'supplement' && payload.supplementId) {
        return {
          ...old,
          supplements: {
            ...old.supplements,
            takenIds: [...old.supplements.takenIds, payload.supplementId],
            total: old.supplements.total + 1
          }
        };
      }
      
      return old;
    });

    // === B. ASYNC DB WRITE (Background) ===
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        throw new Error('Not authenticated');
      }
      
      const today = new Date().toISOString().slice(0, 10);
      const now = new Date().toISOString();
      
      // Handle fluid logging (water/coffee)
      if (category === 'water' || category === 'coffee') {
        const { error } = await supabase.from('user_fluids').insert({
          user_id: auth.user.id,
          amount_ml: payload.amount,
          date: today,
          consumed_at: now,
          custom_name: category === 'coffee' ? 'Kaffee' : (payload.customName || null)
        });
        
        if (error) {
          console.error('[AresEvents] Fluid insert failed:', error);
          throw error;
        }
        
        console.log(`[AresEvents] ✓ Logged ${payload.amount}ml ${category}`);
      }
      
      // Handle supplement logging
      if (category === 'supplement' && payload.supplementId && payload.timing) {
        const { error } = await supabase.from('supplement_intake_log').upsert({
          user_id: auth.user.id,
          user_supplement_id: payload.supplementId,
          date: today,
          timing: payload.timing,
          taken: true
        }, {
          onConflict: 'user_supplement_id,date,timing'
        });
        
        if (error) {
          console.error('[AresEvents] Supplement insert failed:', error);
          throw error;
        }
        
        console.log(`[AresEvents] ✓ Logged supplement ${payload.supplementId} (${payload.timing})`);
      }

      // === WEIGHT (extended) ===
      if (category === 'weight' && payload.weight_kg) {
        const { error } = await supabase.from('weight_history').insert({
          user_id: auth.user.id,
          weight: payload.weight_kg,
          date: payload.date || today,
          body_fat_percentage: payload.body_fat_percentage || null,
          muscle_percentage: payload.muscle_percentage || null,
          notes: payload.notes || null
        });
        
        if (error) {
          console.error('[AresEvents] Weight insert failed:', error);
          throw error;
        }
        
        console.log(`[AresEvents] ✓ Logged weight ${payload.weight_kg}kg`);
        toast.success(`${payload.weight_kg} kg gespeichert`);
      }

      // === WORKOUT (extended) ===
      if (category === 'workout' && payload.training_type) {
        const insertData: Record<string, unknown> = {
          user_id: auth.user.id,
          training_type: payload.training_type,
          split_type: payload.split_type || null,
          total_duration_minutes: payload.duration_minutes || null,
          total_volume_kg: payload.total_volume_kg || null,
          session_data: payload.session_data || {},
          session_date: payload.date || today
        };
        
        const { error } = await supabase.from('training_sessions').insert(insertData as any);
        
        if (error) {
          console.error('[AresEvents] Workout insert failed:', error);
          throw error;
        }
        
        console.log(`[AresEvents] ✓ Logged ${payload.training_type} workout`);
        toast.success('Training gespeichert');
      }

      // === SLEEP (extended) ===
      if (category === 'sleep' && payload.sleep_hours) {
        const { error } = await supabase.from('sleep_tracking').upsert({
          user_id: auth.user.id,
          date: payload.date || today,
          sleep_hours: payload.sleep_hours,
          sleep_quality: payload.sleep_quality || 3,
          bedtime: payload.bedtime || null,
          wake_time: payload.wake_time || null,
          sleep_interruptions: payload.sleep_interruptions || null,
          screen_time_evening: payload.screen_time_evening || null,
          morning_libido: payload.morning_libido || null,
          motivation_level: payload.motivation_level || null
        }, { onConflict: 'user_id,date' });
        
        if (error) {
          console.error('[AresEvents] Sleep insert failed:', error);
          throw error;
        }
        
        console.log(`[AresEvents] ✓ Logged ${payload.sleep_hours}h sleep`);
        toast.success('Schlaf gespeichert');
      }
      
      // === C. SILENT REVALIDATE (Background sync after 2s) ===
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: DAILY_METRICS_KEY });
      }, 2000);
      
      return true;
      
    } catch (err) {
      console.error('[AresEvents] Tracking failed, rolling back:', err);
      
      // === ROLLBACK: Invalidate cache to fetch real data ===
      queryClient.invalidateQueries({ queryKey: DAILY_METRICS_KEY });
      toast.error('Speichern fehlgeschlagen');
      
      return false;
    }
  }, [queryClient]);

  /**
   * Quick helper for water logging
   */
  const logWater = useCallback((amountMl: number) => {
    return trackEvent('water', { amount: amountMl });
  }, [trackEvent]);

  /**
   * Quick helper for coffee logging
   */
  const logCoffee = useCallback((amountMl: number = 150) => {
    return trackEvent('coffee', { amount: amountMl, customName: 'Kaffee' });
  }, [trackEvent]);

  /**
   * Quick helper for weight logging
   */
  const logWeight = useCallback((weightKg: number) => {
    return trackEvent('weight', { weight_kg: weightKg });
  }, [trackEvent]);

  /**
   * Quick helper for workout logging
   */
  const logWorkout = useCallback((type: 'rpt' | 'zone2' | 'vo2max' | 'sauna', durationMin?: number) => {
    return trackEvent('workout', { training_type: type, duration_minutes: durationMin });
  }, [trackEvent]);

  /**
   * Quick helper for sleep logging
   */
  const logSleep = useCallback((hours: number, quality: number = 3) => {
    return trackEvent('sleep', { sleep_hours: hours, sleep_quality: quality });
  }, [trackEvent]);

  return { 
    trackEvent,
    logWater,
    logCoffee,
    logWeight,
    logWorkout,
    logSleep
  };
};
