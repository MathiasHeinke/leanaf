/**
 * useLiveWorkout Hook
 * 
 * State management for ARES Live Workout Companion (Phase 2)
 * - LocalStorage persistence for crash recovery
 * - Server sync on exercise completion
 * - Automatic progression calculations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LiveExercise {
  name: string;
  normalized_name: string;
  exercise_id?: string;
  planned_sets: number;
  planned_reps: number;
  planned_weight_kg: number;
  planned_rpe: number;
  progression_hint?: string;
  last_performance?: {
    weight_kg: number;
    reps: number;
    rpe: number;
    date: string;
  };
}

export interface CompletedExercise {
  exercise_index: number;
  actual_sets: number;
  actual_reps: number;
  actual_weight_kg: number;
  actual_rpe: number;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
  notes?: string;
}

export interface LiveWorkoutState {
  session_id: string;
  user_id: string;
  status: 'planning' | 'active' | 'paused' | 'completed';
  workout_type: string;
  
  exercises: LiveExercise[];
  current_exercise_index: number;
  
  session_started_at: string;
  current_exercise_started_at: string;
  
  completed_exercises: CompletedExercise[];
  last_saved_at: string;
}

export interface LiveWorkoutPlan {
  session_id: string;
  workout_type: string;
  exercises: LiveExercise[];
  estimated_duration_minutes?: number;
  ares_message?: string;
}

export interface ExerciseResult {
  actual_sets: number;
  actual_reps: number;
  actual_weight_kg: number;
  actual_rpe: number;
  notes?: string;
}

const STORAGE_KEY = 'ares_live_workout';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function calculateDuration(startTime: string, endTime: string): number {
  return Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000);
}

async function findOrCreateExercise(name: string, userId: string): Promise<string> {
  const normalizedName = name.trim();
  
  // 1. Exact match (case-insensitive)
  const { data: exact } = await supabase
    .from('exercises')
    .select('id')
    .ilike('name', normalizedName)
    .limit(1)
    .maybeSingle();
  
  if (exact?.id) return exact.id;
  
  // 2. Fuzzy match (first word)
  const firstWord = normalizedName.split(' ')[0];
  const { data: fuzzy } = await supabase
    .from('exercises')
    .select('id, name')
    .ilike('name', `%${firstWord}%`)
    .limit(1)
    .maybeSingle();
  
  if (fuzzy?.id) return fuzzy.id;
  
  // 3. Create new custom exercise
  const { data: newExercise } = await supabase
    .from('exercises')
    .insert({
      name: normalizedName,
      category: 'Custom',
      muscle_groups: inferMuscleGroups(normalizedName),
      is_compound: false,
      created_by: userId,
      is_public: false
    })
    .select('id')
    .single();
  
  return newExercise?.id || crypto.randomUUID();
}

function inferMuscleGroups(name: string): string[] {
  const n = name.toLowerCase();
  if (n.includes('bank') || n.includes('bench')) return ['chest', 'triceps', 'front_delts'];
  if (n.includes('ruder') || n.includes('row')) return ['lats', 'mid_back', 'biceps'];
  if (n.includes('kniebeu') || n.includes('squat')) return ['quads', 'glutes', 'hamstrings'];
  if (n.includes('schulter') || n.includes('shoulder') || n.includes('press')) return ['shoulders', 'triceps'];
  if (n.includes('klimmz') || n.includes('pull')) return ['lats', 'biceps'];
  if (n.includes('kreuz') || n.includes('dead')) return ['lower_back', 'glutes', 'hamstrings'];
  if (n.includes('bizeps') || n.includes('curl')) return ['biceps'];
  if (n.includes('trizeps') || n.includes('tricep')) return ['triceps'];
  if (n.includes('seitheb') || n.includes('lateral')) return ['shoulders'];
  return ['other'];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useLiveWorkout(userId?: string) {
  const [state, setState] = useState<LiveWorkoutState | null>(null);
  const [isRecovered, setIsRecovered] = useState(false);
  const hasShownRecoveryRef = useRef(false);
  const queryClient = useQueryClient();

  // ─────────────────────────────────────────────────────────────────────────────
  // PERSISTENCE: Load from LocalStorage on mount
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (hasShownRecoveryRef.current) return;
    
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: LiveWorkoutState = JSON.parse(saved);
        if (parsed.status === 'active' || parsed.status === 'paused') {
          setIsRecovered(true);
          setState(parsed);
          console.log('[LiveWorkout] Recovered session:', parsed.session_id);
        } else {
          // Completed or invalid - clear
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {
      console.warn('[LiveWorkout] Failed to load state:', e);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // PERSISTENCE: Save to LocalStorage on every change
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (state && state.status !== 'completed') {
      const toSave = { ...state, last_saved_at: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    }
  }, [state]);

  // ─────────────────────────────────────────────────────────────────────────────
  // DERIVED STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const isActive = state?.status === 'active' || state?.status === 'paused';
  
  const currentExercise = state && state.current_exercise_index < state.exercises.length
    ? state.exercises[state.current_exercise_index]
    : null;
  
  const progress = state
    ? {
        current: state.current_exercise_index + 1,
        total: state.exercises.length,
        percent: Math.round(((state.current_exercise_index) / state.exercises.length) * 100)
      }
    : { current: 0, total: 0, percent: 0 };

  const elapsedTime = state?.session_started_at
    ? formatElapsedTime(state.session_started_at)
    : '00:00';

  function formatElapsedTime(startTime: string): string {
    const seconds = Math.round((Date.now() - new Date(startTime).getTime()) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────────────────────────
  
  const startSession = useCallback((plan: LiveWorkoutPlan) => {
    if (!userId) {
      console.error('[LiveWorkout] No userId provided');
      return;
    }
    
    const now = new Date().toISOString();
    const newState: LiveWorkoutState = {
      session_id: plan.session_id,
      user_id: userId,
      status: 'active',
      workout_type: plan.workout_type,
      exercises: plan.exercises,
      current_exercise_index: 0,
      session_started_at: now,
      current_exercise_started_at: now,
      completed_exercises: [],
      last_saved_at: now
    };
    
    setState(newState);
    setIsRecovered(false);
    hasShownRecoveryRef.current = false;
    
    console.log('[LiveWorkout] Session started:', plan.session_id);
  }, [userId]);

  const completeExercise = useCallback(async (result: ExerciseResult) => {
    if (!state || !currentExercise) return;
    
    const completedAt = new Date().toISOString();
    const duration = calculateDuration(state.current_exercise_started_at, completedAt);
    
    const completedExercise: CompletedExercise = {
      exercise_index: state.current_exercise_index,
      ...result,
      started_at: state.current_exercise_started_at,
      completed_at: completedAt,
      duration_seconds: duration
    };
    
    const nextIndex = state.current_exercise_index + 1;
    const isLastExercise = nextIndex >= state.exercises.length;
    
    const newState: LiveWorkoutState = {
      ...state,
      completed_exercises: [...state.completed_exercises, completedExercise],
      current_exercise_index: nextIndex,
      current_exercise_started_at: completedAt,
      status: isLastExercise ? 'completed' : 'active'
    };
    
    setState(newState);
    
    // If last exercise, finish the workout
    if (isLastExercise) {
      await finishSession(newState);
    }
    
    return completedExercise;
  }, [state, currentExercise]);

  const skipExercise = useCallback(() => {
    if (!state) return;
    
    const nextIndex = state.current_exercise_index + 1;
    const isLastExercise = nextIndex >= state.exercises.length;
    
    const newState: LiveWorkoutState = {
      ...state,
      current_exercise_index: nextIndex,
      current_exercise_started_at: new Date().toISOString(),
      status: isLastExercise ? 'completed' : 'active'
    };
    
    setState(newState);
    
    if (isLastExercise) {
      finishSession(newState);
    }
  }, [state]);

  const pauseSession = useCallback(() => {
    if (!state) return;
    setState({ ...state, status: 'paused' });
  }, [state]);

  const resumeSession = useCallback(() => {
    if (!state) return;
    setState({ 
      ...state, 
      status: 'active',
      current_exercise_started_at: new Date().toISOString()
    });
    hasShownRecoveryRef.current = true;
  }, [state]);

  const discardSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(null);
    setIsRecovered(false);
    hasShownRecoveryRef.current = true;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // DUAL-WRITE: Save to Layer 2 + Layer 3
  // ─────────────────────────────────────────────────────────────────────────────
  const finishSession = useCallback(async (finalState?: LiveWorkoutState) => {
    const workoutState = finalState || state;
    if (!workoutState || !userId) {
      console.warn('[LiveWorkout] Cannot finish - no state or userId');
      return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate totals
    const totalVolume = workoutState.completed_exercises.reduce((sum, ex) => 
      sum + (ex.actual_weight_kg * ex.actual_reps * ex.actual_sets), 0
    );
    const totalDuration = Math.round(
      (Date.now() - new Date(workoutState.session_started_at).getTime()) / 60000
    );

    try {
      // STEP 1: training_sessions (Layer 2)
      const { data: trainingSession, error: trainingError } = await supabase
        .from('training_sessions')
        .insert({
          user_id: userId,
          session_date: today,
          training_type: 'rpt' as string,
          split_type: workoutState.workout_type,
          total_duration_minutes: totalDuration,
          total_volume_kg: totalVolume,
          session_data: JSON.parse(JSON.stringify({
            source: 'ares_live_workout',
            exercises: workoutState.completed_exercises,
            timestamps: {
              started: workoutState.session_started_at,
              completed: new Date().toISOString()
            }
          }))
        })
        .select('id')
        .single();

      if (trainingError) {
        console.error('[LiveWorkout] Error saving training_session:', trainingError);
        throw trainingError;
      }

      // STEP 2: exercise_sessions (Layer 3)
      const { data: exerciseSession, error: exerciseError } = await supabase
        .from('exercise_sessions')
        .insert({
          user_id: userId,
          date: today,
          session_name: `ARES ${workoutState.workout_type} Live Workout`,
          workout_type: 'strength',
          start_time: workoutState.session_started_at,
          end_time: new Date().toISOString(),
          duration_minutes: totalDuration,
          metadata: { 
            source: 'ares_live_workout', 
            training_session_id: trainingSession?.id 
          }
        })
        .select('id')
        .single();

      if (exerciseError) {
        console.error('[LiveWorkout] Error saving exercise_session:', exerciseError);
        throw exerciseError;
      }

      // STEP 3: exercise_sets (Layer 3)
      for (const completed of workoutState.completed_exercises) {
        const exercise = workoutState.exercises[completed.exercise_index];
        const exerciseId = await findOrCreateExercise(exercise.normalized_name, userId);
        
        // Insert one set entry per exercise (simplified - all sets with same weight/reps)
        for (let i = 0; i < completed.actual_sets; i++) {
          await supabase.from('exercise_sets').insert({
            session_id: exerciseSession?.id,
            user_id: userId,
            exercise_id: exerciseId,
            set_number: i + 1,
            weight_kg: completed.actual_weight_kg,
            reps: completed.actual_reps,
            rpe: completed.actual_rpe,
            date: today,
            origin: 'ares_live_workout'
          });
        }
      }

      // Cleanup
      localStorage.removeItem(STORAGE_KEY);
      
      // Query invalidation
      queryClient.invalidateQueries({ queryKey: ['training-session-today'] });
      queryClient.invalidateQueries({ queryKey: ['training-week-overview'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-sessions'] });
      
      toast.success('Workout gespeichert! 💪', {
        description: `${workoutState.completed_exercises.length} Übungen, ${totalVolume.toLocaleString()} kg Volumen`
      });

      console.log('[LiveWorkout] Session saved successfully:', trainingSession?.id);
      
    } catch (error) {
      console.error('[LiveWorkout] Failed to save workout:', error);
      toast.error('Fehler beim Speichern', {
        description: 'Das Workout wird lokal behalten. Versuche es später erneut.'
      });
      // Don't clear localStorage on error - keep for retry
      return;
    }

    // Clear state after successful save
    setState(null);
    setIsRecovered(false);
  }, [state, userId, queryClient]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────────────────────────
  return {
    state,
    isActive,
    isRecovered,
    currentExercise,
    progress,
    elapsedTime,
    
    // Actions
    startSession,
    completeExercise,
    skipExercise,
    pauseSession,
    resumeSession,
    finishSession,
    discardSession,
    
    // For recovery UI
    markRecoveryShown: () => { hasShownRecoveryRef.current = true; }
  };
}
