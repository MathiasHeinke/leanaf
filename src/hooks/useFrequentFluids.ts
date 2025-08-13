import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type FrequentFluids = {
  drinks: string[];
  amounts: number[];
};

export function useFrequentFluids(userId?: string, lookbackDays = 45): { frequent: FrequentFluids; loading: boolean } {
  const [frequent, setFrequent] = useState<FrequentFluids>({ drinks: [], amounts: [] });
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
            fluid_database (name)
          `)
          .eq('user_id', userId)
          .gte('date', cutoffDate.toISOString().split('T')[0])
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching frequent fluids:', error);
          setFrequent({ drinks: [], amounts: [] });
          return;
        }

        // Count drink names
        const drinkCounts: { [key: string]: number } = {};
        const amountCounts: { [key: number]: number } = {};

        userFluids?.forEach(fluid => {
          const drinkName = fluid.fluid_database?.name || fluid.custom_name || 'Unbekannt';
          drinkCounts[drinkName] = (drinkCounts[drinkName] || 0) + 1;
          
          const amount = fluid.amount_ml;
          amountCounts[amount] = (amountCounts[amount] || 0) + 1;
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

        setFrequent({
          drinks: topDrinks,
          amounts: topAmounts
        });
      } catch (error) {
        console.error('Error in fetchFrequentFluids:', error);
        setFrequent({ drinks: [], amounts: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchFrequentFluids();
  }, [userId, lookbackDays]);

  return { frequent, loading };
}