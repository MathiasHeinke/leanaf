import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addMonths, differenceInDays } from "date-fns";

export interface EpitalonCycle {
  id: string;
  user_id: string;
  dose_mg: number;
  duration_days: number;
  cycle_number: number;
  cycle_started_at: string | null;
  cycle_ended_at: string | null;
  current_day: number;
  status: 'scheduled' | 'active' | 'completed' | 'skipped';
  next_cycle_due: string | null;
  injections_completed: number;
  injection_site_rotation: string[];
  last_injection_site: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_INJECTION_SITES = ['abdomen', 'thigh', 'deltoid'];

export function useEpitalonCycles() {
  const [cycles, setCycles] = useState<EpitalonCycle[]>([]);
  const [activeCycle, setActiveCycle] = useState<EpitalonCycle | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCycles = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from('epitalon_cycles')
        .select('*')
        .eq('user_id', user.id)
        .order('cycle_number', { ascending: false });

      if (error) throw error;

      // Map data with defaults for nullable fields
      const mappedCycles: EpitalonCycle[] = (data || []).map((c: any) => ({
        ...c,
        current_day: c.current_day ?? 0,
        injections_completed: c.injections_completed ?? 0,
        status: c.status ?? 'scheduled',
        injection_site_rotation: c.injection_site_rotation ?? DEFAULT_INJECTION_SITES,
      }));

      setCycles(mappedCycles);
      setActiveCycle(mappedCycles.find(c => c.status === 'active') || null);
    } catch (err) {
      console.error('Error fetching epitalon cycles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const startNewCycle = async (durationDays: number = 10) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht eingeloggt");

      const lastCycle = cycles[0];
      const cycleNumber = lastCycle ? lastCycle.cycle_number + 1 : 1;

      const { data, error } = await (supabase as any)
        .from('epitalon_cycles')
        .insert({
          user_id: user.id,
          dose_mg: 10,
          duration_days: durationDays,
          cycle_number: cycleNumber,
          cycle_started_at: new Date().toISOString(),
          current_day: 1,
          status: 'active',
          injections_completed: 0,
          injection_site_rotation: DEFAULT_INJECTION_SITES,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Epitalon-Zyklus gestartet", {
        description: `Zyklus ${cycleNumber}: ${durationDays} Tage, 10mg/Tag`,
      });

      await fetchCycles();
      return data;
    } catch (err) {
      toast.error("Fehler", {
        description: err instanceof Error ? err.message : "Zyklus konnte nicht gestartet werden",
      });
      return null;
    }
  };

  const logInjection = async (cycleId: string, injectionSite: string, notes?: string) => {
    try {
      const cycle = cycles.find(c => c.id === cycleId);
      if (!cycle || cycle.status !== 'active') return;

      const newDay = cycle.current_day + 1;
      const isCompleted = newDay > cycle.duration_days;

      const updateData: Record<string, any> = {
        current_day: isCompleted ? cycle.duration_days : newDay,
        injections_completed: cycle.injections_completed + 1,
        last_injection_site: injectionSite,
        notes: notes || cycle.notes,
        updated_at: new Date().toISOString(),
      };

      if (isCompleted) {
        updateData.status = 'completed';
        updateData.cycle_ended_at = new Date().toISOString();
        updateData.next_cycle_due = addMonths(new Date(), 6).toISOString();
      }

      const { error } = await (supabase as any)
        .from('epitalon_cycles')
        .update(updateData)
        .eq('id', cycleId);

      if (error) throw error;

      if (isCompleted) {
        toast.success("Zyklus abgeschlossen! 🎉", {
          description: `Nächster Zyklus in 6 Monaten fällig`,
        });
      } else {
        toast.success(`Tag ${cycle.current_day} geloggt`, {
          description: `${cycle.duration_days - cycle.current_day} Tage verbleibend`,
        });
      }

      await fetchCycles();
    } catch (err) {
      toast.error("Fehler", {
        description: err instanceof Error ? err.message : "Log fehlgeschlagen",
      });
    }
  };

  const getDaysUntilNextCycle = (): number | null => {
    const lastCompletedCycle = cycles.find(c => c.status === 'completed');
    if (!lastCompletedCycle?.next_cycle_due) return null;

    const nextDue = new Date(lastCompletedCycle.next_cycle_due);
    return differenceInDays(nextDue, new Date());
  };

  const isNextCycleDue = (): boolean => {
    const daysUntil = getDaysUntilNextCycle();
    return daysUntil !== null && daysUntil <= 0;
  };

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  return {
    cycles,
    activeCycle,
    loading,
    startNewCycle,
    logInjection,
    getDaysUntilNextCycle,
    isNextCycleDue,
    refetch: fetchCycles,
  };
}
