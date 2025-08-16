import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { safeQueryMany } from "@/utils/safeQuery";
import { useAuth } from "./useAuth";

const DEBUG_MEALS = true;

interface MealData {
  id: string;
  user_id: string;
  title: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  quality_score?: number;
  image_url?: string;
  ts: string;
  date: string;
  created_at: string;
}

export function useRecentMeals(days = 7) {
  const { user } = useAuth();
  const [data, setData] = useState<MealData[] | null>(null);
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

    const fetchRecentMeals = async () => {
      setIsLoading(true);
      setError(null);

      if (DEBUG_MEALS) {
        console.log("🍽️ Fetching recent meals for user:", user.id);
      }

      try {
        if (abortController.signal.aborted) return;

        const since = new Date();
        since.setDate(since.getDate() - days);
        
        if (DEBUG_MEALS) {
          console.log("🍽️ Date range:", since.toISOString().slice(0, 10), "to", new Date().toISOString().slice(0, 10));
        }
        
        const queryPromise = supabase
          .from("meals")
          .select(`
            id,
            user_id,
            title,
            calories,
            protein,
            carbs,
            fat,
            quality_score,
            image_url,
            ts,
            date,
            created_at
          `)
          .eq("user_id", user.id)
          .gte("date", since.toISOString().slice(0, 10))
          .order("ts", { ascending: false })
          .limit(20);
          
        const { data: meals, error } = await safeQueryMany<MealData>(queryPromise);

        if (DEBUG_MEALS) {
          console.log("🍽️ Query result:", { mealsCount: meals?.length || 0, error });
        }

        if (!abortController.signal.aborted) {
          if (error) {
            console.error("🍽️ Meals query error:", error);
            setError(error);
            setData([]);
          } else {
            const mealsData = (meals as MealData[]) || [];
            if (DEBUG_MEALS) {
              console.log("🍽️ Setting meals data:", mealsData.length, "items");
            }
            setData(mealsData);
          }
          setIsLoading(false);
        }
      } catch (err: any) {
        if (!abortController.signal.aborted) {
          console.error('🍽️ Recent meals fetch error:', err);
          setError(err.message || 'Failed to load recent meals');
          setData([]);
          setIsLoading(false);
        }
      }
    };

    fetchRecentMeals();

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