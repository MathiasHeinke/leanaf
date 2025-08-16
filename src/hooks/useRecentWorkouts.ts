import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { safeQueryMany } from "@/utils/safeQuery";
import { useAuth } from "./useAuth";

interface WorkoutData {
  id: string;
  user_id: string;
  date: string;
  did_workout: boolean;
  duration_minutes?: number;
  intensity?: number;
  workout_type?: string;
  notes?: string;
  steps?: number;
  distance_km?: number;
  quality_score?: number;
  created_at: string;
  updated_at: string;
}

export function useRecentWorkouts(days = 14) {
  const { user } = useAuth();
  const [data, setData] = useState<WorkoutData[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setData([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchRecentWorkouts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (abortController.signal.aborted) return;

        const since = new Date();
        since.setDate(since.getDate() - days);
        
        const queryPromise = supabase
          .from("workouts")
          .select(`
            id,
            user_id,
            date,
            did_workout,
            duration_minutes,
            intensity,
            workout_type,
            notes,
            steps,
            distance_km,
            quality_score,
            created_at,
            updated_at
          `)
          .eq("user_id", user.id)
          .gte("date", since.toISOString().slice(0, 10))
          .order("date", { ascending: false });
          
        const { data: workouts, error } = await safeQueryMany<WorkoutData>(queryPromise);

        if (!abortController.signal.aborted) {
          if (error) {
            setError(error);
            setData([]);
          } else {
            setData((workouts as WorkoutData[]) || []);
          }
          setIsLoading(false);
        }
      } catch (err: any) {
        if (!abortController.signal.aborted) {
          console.error('Recent workouts fetch error:', err);
          setError(err.message || 'Failed to load recent workouts');
          setData([]);
          setIsLoading(false);
        }
      }
    };

    fetchRecentWorkouts();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user?.id, days]);

  return { 
    data, 
    isLoading, 
    error,
    hasData: (data && data.length > 0) || false
  };
}