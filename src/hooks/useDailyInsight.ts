/**
 * useDailyInsight - Prefetch + Cache daily AI insights
 * One insight per day, cached in localStorage + React Query
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'ares-daily-insight';
export const DAILY_INSIGHT_KEY = ['daily-insight'];

interface DailyInsight {
  insight: string;
  date: string;
  generated_at: string;
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getCachedInsight(): DailyInsight | null {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    // Only valid if from same day
    if (parsed.date === getTodayKey()) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function setCachedInsight(insight: DailyInsight): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(insight));
}

export const useDailyInsight = (shouldPrefetch: boolean = false) => {
  return useQuery({
    queryKey: DAILY_INSIGHT_KEY,
    queryFn: async (): Promise<DailyInsight | null> => {
      // 1. Check localStorage first
      const cached = getCachedInsight();
      if (cached) {
        console.log('[DailyInsight] Using cached insight from today');
        return cached;
      }
      
      // 2. Fetch from API
      console.log('[DailyInsight] Fetching fresh insight...');
      const { data, error } = await supabase.functions.invoke('ares-insight-generator');
      
      if (error || !data?.insight) {
        console.error('[DailyInsight] Failed:', error);
        return null;
      }
      
      // 3. Cache for today
      const result: DailyInsight = {
        insight: data.insight,
        date: getTodayKey(),
        generated_at: data.generated_at || new Date().toISOString()
      };
      
      setCachedInsight(result);
      return result;
    },
    enabled: shouldPrefetch,
    staleTime: 1000 * 60 * 60 * 24, // 24h
    gcTime: 1000 * 60 * 60 * 24,
    retry: 1,
    refetchOnWindowFocus: false,
  });
};

// Manual fetch for click when cache is empty
export const useFetchInsight = () => {
  const queryClient = useQueryClient();
  
  const fetchInsight = async (): Promise<string | null> => {
    // Check cache first
    const cached = getCachedInsight();
    if (cached) return cached.insight;
    
    // Fetch if not cached
    const { data, error } = await supabase.functions.invoke('ares-insight-generator');
    
    if (error || !data?.insight) return null;
    
    const result: DailyInsight = {
      insight: data.insight,
      date: getTodayKey(),
      generated_at: data.generated_at || new Date().toISOString()
    };
    
    setCachedInsight(result);
    queryClient.setQueryData(DAILY_INSIGHT_KEY, result);
    
    return result.insight;
  };
  
  return fetchInsight;
};
