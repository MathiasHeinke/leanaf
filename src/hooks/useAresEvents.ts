/**
 * useAresEvents - Central Event Controller for Optimistic UI Tracking
 * Handles all tracking actions with instant UI feedback and background DB sync
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DAILY_METRICS_KEY, DailyMetrics } from './useDailyMetrics';
import { invalidateCategory } from '@/constants/queryKeys';
import { getCurrentDateString, getSleepDateString } from '@/utils/dateHelpers';

export type EventCategory = 'water' | 'coffee' | 'supplement' | 'weight' | 'workout' | 'sleep' | 'journal';

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
  training_type?: 'rpt' | 'zone2' | 'vo2max' | 'sauna' | 'movement' | 'rest';
  did_workout?: boolean;
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
  deep_sleep_minutes?: number; // Tiefschlaf in Minuten
  
  // Journal (NEW)
  content?: string;
  mood?: 'dankbarkeit' | 'reflektion' | 'ziele';
  entry_type?: 'text' | 'voice';
  prompt_used?: string;
  
  // Override date for retrospective logging
  override_date?: string;
  
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
    const todayStr = getCurrentDateString();
    
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
      
      // Weight → update latest weight
      if (category === 'weight' && payload.weight_kg) {
        return {
          ...old,
          weight: {
            latest: payload.weight_kg,
            date: payload.date || todayStr
          }
        };
      }
      
      // Workout → update training info
      if (category === 'workout' && payload.training_type) {
        return {
          ...old,
          training: {
            todayType: payload.training_type,
            todayMinutes: payload.duration_minutes || null
          }
        };
      }
      
      // Sleep → update sleep info (use sleep date for proper tracking)
      if (category === 'sleep' && payload.sleep_hours) {
        const sleepDate = getSleepDateString();
        return {
          ...old,
          sleep: {
            lastHours: payload.sleep_hours,
            lastQuality: payload.sleep_quality || 3,
            date: payload.date || sleepDate,
            deepSleepMinutes: payload.deep_sleep_minutes || null
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
      
      const now = new Date().toISOString();
      
      // Handle fluid logging (water/coffee)
      if (category === 'water' || category === 'coffee') {
        const { error } = await supabase.from('user_fluids').insert({
          user_id: auth.user.id,
          amount_ml: payload.amount,
          date: todayStr,
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
          date: todayStr,
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
        const { error } = await supabase.from('weight_history').upsert({
          user_id: auth.user.id,
          weight: payload.weight_kg,
          date: payload.date || todayStr,
          body_fat_percentage: payload.body_fat_percentage || null,
          muscle_percentage: payload.muscle_percentage || null,
          notes: payload.notes || null
        }, {
          onConflict: 'user_id,date'
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
        // Use override_date if provided (retrospective logging), else date, else today
        const workoutDate = payload.override_date || payload.date || todayStr;
        
        const insertData: Record<string, unknown> = {
          user_id: auth.user.id,
          training_type: payload.training_type,
          split_type: payload.split_type || null,
          total_duration_minutes: payload.duration_minutes || null,
          total_volume_kg: payload.total_volume_kg || null,
          session_data: payload.session_data || {},
          session_date: workoutDate
        };
        
        const { error } = await supabase.from('training_sessions').insert(insertData as any);
        
        if (error) {
          console.error('[AresEvents] Workout insert failed:', error);
          throw error;
        }
        
        console.log(`[AresEvents] ✓ Logged ${payload.training_type} workout for ${workoutDate}`);
        toast.success('Training gespeichert');
      }

      // === SLEEP (extended) - uses getSleepDateString for 02:00 AM cutoff ===
      if (category === 'sleep' && payload.sleep_hours) {
        const sleepDate = payload.date || getSleepDateString();
        const { error } = await supabase.from('sleep_tracking').upsert({
          user_id: auth.user.id,
          date: sleepDate,
          sleep_hours: payload.sleep_hours,
          sleep_quality: payload.sleep_quality || 3,
          bedtime: payload.bedtime || null,
          wake_time: payload.wake_time || null,
          sleep_interruptions: payload.sleep_interruptions || null,
          screen_time_evening: payload.screen_time_evening || null,
          morning_libido: payload.morning_libido || null,
          motivation_level: payload.motivation_level || null,
          deep_sleep_minutes: payload.deep_sleep_minutes || null
        }, { onConflict: 'user_id,date' });
        
        if (error) {
          console.error('[AresEvents] Sleep insert failed:', error);
          throw error;
        }
        
        console.log(`[AresEvents] ✓ Logged ${payload.sleep_hours}h sleep`);
        toast.success('Schlaf gespeichert');
      }

      // === JOURNAL (NEW) ===
      if (category === 'journal' && payload.content) {
        console.log('[AresEvents] Attempting journal insert:', { 
          userId: auth.user.id, 
          contentLength: payload.content.length,
          mood: payload.mood,
          date: payload.date || todayStr
        });
        
        const { data, error } = await supabase.from('diary_entries').insert({
          user_id: auth.user.id,
          date: payload.date || todayStr,
          content: payload.content,
          mood: payload.mood || null,
          entry_type: payload.entry_type || 'text',
          prompt_used: payload.prompt_used || null
        }).select('id').single();
        
        if (error) {
          console.error('[AresEvents] Journal insert failed:', error.message, error.code, error.details);
          throw error;
        }
        
        console.log(`[AresEvents] ✓ Logged journal entry (${payload.mood}), id: ${data?.id}`);
        toast.success('Tagebuch gespeichert ✨');
      }
      
      // === C. IMMEDIATE CACHE INVALIDATION ===
      // Invalidate all relevant queries for this category (no delay!)
      invalidateCategory(queryClient, category);
      
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
