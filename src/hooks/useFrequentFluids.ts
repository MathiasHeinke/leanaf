import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

export function useFrequentFluids(userId?: string, lookbackDays = 45): { frequent: FrequentFluids; loading: boolean } {
  const [frequent, setFrequent] = useState<FrequentFluids>({ drinks: [], amounts: [], databaseEntries: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchFrequentFluids = async () => {
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
          console.error('Error fetching frequent fluids:', error);
          setFrequent({ drinks: [], amounts: [], databaseEntries: [] });
          return;
        }

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

        setFrequent({
          drinks: topDrinks,
          amounts: topAmounts,
          databaseEntries: topDatabaseEntries
        });
      } catch (error) {
        console.error('Error in fetchFrequentFluids:', error);
        setFrequent({ drinks: [], amounts: [], databaseEntries: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchFrequentFluids();
  }, [userId, lookbackDays]);

  return { frequent, loading };
}