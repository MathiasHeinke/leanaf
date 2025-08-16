import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { safeQueryMany } from "@/utils/safeQuery";
import { useAuth } from "./useAuth";

interface DailySummaryData {
  id: string;
  user_id: string;
  date: string;
  total_calories?: number;
  total_protein?: number;
  total_carbs?: number;
  total_fats?: number;
  workout_volume?: number;
  sleep_score?: number;
  hydration_score?: number;
  created_at: string;
  updated_at: string;
}

export function useDailySummary(days = 30) {
  const { user } = useAuth();
  const [data, setData] = useState<DailySummaryData[] | null>(null);
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

    const fetchDailySummaries = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (abortController.signal.aborted) return;

        const since = new Date();
        since.setDate(since.getDate() - days);
        
        const queryPromise = supabase
          .from("daily_summaries")
          .select(`
            id,
            user_id,
            date,
            total_calories,
            total_protein,
            total_carbs,
            total_fats,
            workout_volume,
            sleep_score,
            hydration_score,
            created_at,
            updated_at
          `)
          .eq("user_id", user.id)
          .gte("date", since.toISOString().slice(0, 10)) // YYYY-MM-DD
          .order("date", { ascending: false });
          
        const { data: summaries, error } = await safeQueryMany<DailySummaryData>(queryPromise);

        if (!abortController.signal.aborted) {
          if (error) {
            setError(error);
            setData([]);
          } else {
            setData((summaries as DailySummaryData[]) || []);
          }
          setIsLoading(false);
        }
      } catch (err: any) {
        if (!abortController.signal.aborted) {
          console.error('Daily summary fetch error:', err);
          setError(err.message || 'Failed to load daily summaries');
          setData([]);
          setIsLoading(false);
        }
      }
    };

    fetchDailySummaries();

    // Cleanup function
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