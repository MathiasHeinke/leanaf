import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { dayRangeISO } from '@/lib/dateRange';

export type FluidEntry = {
  id: string;
  user_id: string;
  consumed_at: string;
  amount_ml: number;
  notes?: string | null;
};

export function useFluidsToday(userId?: string, date = new Date()) {
  const [{ loading, error, entries, totalMl, waterEqMl }, setState] = useState({
    loading: true, error: null as any, entries: [] as FluidEntry[], totalMl: 0, waterEqMl: 0
  });

  const range = useMemo(() => dayRangeISO(date), [date]);

  useEffect(() => {
    if (!userId) { setState(s => ({ ...s, loading:false })); return; }

    let cancelled = false;
    const run = async () => {
      setState(s => ({ ...s, loading: true, error: null }));
      const { startISO, endISO } = range;

      const { data, error } = await supabase
        .from('user_fluids')
        .select('id,user_id,consumed_at,amount_ml,notes')
        .eq('user_id', userId)
        .gte('consumed_at', startISO)
        .lt('consumed_at', endISO)
        .order('consumed_at', { ascending: false });

      if (cancelled) return;
      if (error) { setState(s => ({ ...s, loading:false, error })); return; }

      const list = (data ?? []);
      const total = list.reduce((acc, r) => acc + (r.amount_ml ?? 0), 0);

      // For now, use same value for water equivalent
      const waterEq = total;

      setState({ loading:false, error:null, entries:list, totalMl:total, waterEqMl:waterEq });
    };

    run(); return () => { cancelled = true; };
  }, [userId, range.startISO, range.endISO]);

  return { loading, error, entries, totalMl, waterEqMl };
}