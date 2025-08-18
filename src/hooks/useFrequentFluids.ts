import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDataRefresh } from '@/hooks/useDataRefresh';

export type FrequentFluids = {
  drinks: string[];
  amounts: number[];
  databaseEntries: Array<{
    id: string;
    name: string;
    default_amount: number;
    category: string;
    icon_name: string;
    count: number;
  }>;
};

const FREQUENT_FLUIDS_TTL = 60000; // 1 minute cache for frequent fluids
type FrequentFluidsCacheEntry = { data: FrequentFluids; ts: number };
const frequentFluidsCache = new Map<string, FrequentFluidsCacheEntry>();

// Export cache clearing function for external use
export const clearFrequentFluidsCache = () => {
  console.log('[FREQUENT_FLUIDS] Clearing cache, entries:', frequentFluidsCache.size);
  frequentFluidsCache.clear();
};

export function useFrequentFluids(userId?: string, lookbackDays = 45): { frequent: FrequentFluids; loading: boolean } {
  const [frequent, setFrequent] = useState<FrequentFluids>({ drinks: [], amounts: [], databaseEntries: [] });
  const [loading, setLoading] = useState(false);
  const acRef = useRef<AbortController | null>(null);

  const fetchFrequentFluids = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Cancel any previous request
    if (acRef.current) acRef.current.abort();
    const ac = new AbortController();
    acRef.current = ac;

    const cacheKey = `${userId}:${lookbackDays}`;
    const now = Date.now();

    // Check cache first
    const cached = frequentFluidsCache.get(cacheKey);
    if (cached && now - cached.ts < FREQUENT_FLUIDS_TTL) {
      if (ac.signal.aborted) return;
      console.log('[FREQUENT_FLUIDS] Cache hit:', { cacheKey, databaseEntriesLength: cached.data.databaseEntries.length });
      setFrequent(cached.data);
      setLoading(false);
      return;
    }

    console.log('[FREQUENT_FLUIDS] Cache miss, loading fresh data:', { cacheKey, cached: !!cached });
    try {
      setLoading(true);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);
      
      const { data: userFluids, error } = await supabase
        .from('user_fluids')
        .select(`
          custom_name,
          amount_ml,
          fluid_id,
          fluid_database (
            id,
            name,
            default_amount,
            category,
            icon_name
          )
        `)
        .eq('user_id', userId)
        .gte('date', cutoffDate.toISOString().split('T')[0])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[FREQUENT_FLUIDS] Error fetching frequent fluids:', error);
        const emptyData = { drinks: [], amounts: [], databaseEntries: [] };
        setFrequent(emptyData);
        return;
      }

      if (ac.signal.aborted) return;

      console.log('[FREQUENT_FLUIDS] Raw data:', userFluids?.length, 'entries');

        // Count drink names
        const drinkCounts: { [key: string]: number } = {};
        const amountCounts: { [key: number]: number } = {};
        const databaseEntryCounts: { [key: string]: { entry: any; count: number } } = {};

        userFluids?.forEach(fluid => {
          const drinkName = fluid.fluid_database?.name || fluid.custom_name || 'Unbekannt';
          drinkCounts[drinkName] = (drinkCounts[drinkName] || 0) + 1;
          
          const amount = fluid.amount_ml;
          amountCounts[amount] = (amountCounts[amount] || 0) + 1;

          // Track database entries specifically
          if (fluid.fluid_database && fluid.fluid_id) {
            const entryId = fluid.fluid_database.id;
            if (!databaseEntryCounts[entryId]) {
              databaseEntryCounts[entryId] = {
                entry: fluid.fluid_database,
                count: 0
              };
            }
            databaseEntryCounts[entryId].count++;
          }
        });

        // Get top 3 drinks
        const topDrinks = Object.entries(drinkCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([drink]) => drink);

        // Get top 3 amounts
        const topAmounts = Object.entries(amountCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([amount]) => parseInt(amount));

        // Get top 3 database entries
        const topDatabaseEntries = Object.values(databaseEntryCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .map(({ entry, count }) => ({
            id: entry.id,
            name: entry.name,
            default_amount: entry.default_amount,
            category: entry.category,
            icon_name: entry.icon_name,
            count
          }));

      const result = {
        drinks: topDrinks,
        amounts: topAmounts,
        databaseEntries: topDatabaseEntries
      };

      // Update cache
      frequentFluidsCache.set(cacheKey, { data: result, ts: Date.now() });
      
      setFrequent(result);

      console.log('[FREQUENT_FLUIDS] Processed results:', { 
        drinks: topDrinks.length, 
        amounts: topAmounts.length, 
        databaseEntries: topDatabaseEntries.length 
      });
    } catch (error) {
      if (!ac.signal.aborted) {
        console.error('Error in fetchFrequentFluids:', error);
        const emptyData = { drinks: [], amounts: [], databaseEntries: [] };
        setFrequent(emptyData);
      }
    } finally {
      if (!ac.signal.aborted) {
        setLoading(false);
      }
    }
  }, [userId, lookbackDays]);

  // Initial load
  useEffect(() => {
    fetchFrequentFluids();
    return () => {
      acRef.current?.abort();
    };
  }, [fetchFrequentFluids]);

  // Respond to data refresh events
  useDataRefresh(() => {
    // Clear cache and refetch when data changes
    const cacheKey = `${userId}:${lookbackDays}`;
    frequentFluidsCache.delete(cacheKey);
    fetchFrequentFluids();
  });

  return { frequent, loading };
}