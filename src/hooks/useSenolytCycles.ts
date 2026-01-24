import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addMonths, differenceInDays } from "date-fns";

export interface SenolytCycle {
  id: string;
  user_id: string;
  senolytic_type: 'fisetin' | 'quercetin_dasatinib' | 'custom' | null;
  primary_dose_mg: number | null;
  secondary_dose_mg: number | null;
  protocol_name: string | null;
  duration_days: number;
  cycle_number: number;
  cycle_started_at: string | null;
  cycle_ended_at: string | null;
  current_day: number;
  status: 'scheduled' | 'active' | 'completed' | 'skipped' | null;
  next_cycle_due: string | null;
  preferred_cycle_day: number;
  doses_taken: number;
  fasting_during_cycle: boolean;
  quercetin_preload: boolean;
  side_effects: Array<{ day: number; effect: string; severity: number }>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface StartCycleInput {
  senolytic_type: 'fisetin' | 'quercetin_dasatinib';
  duration_days: number;
  user_weight_kg?: number;
  fasting_during_cycle?: boolean;
  quercetin_preload?: boolean;
}

export function useSenolytCycles() {
  const [cycles, setCycles] = useState<SenolytCycle[]>([]);
  const [activeCycle, setActiveCycle] = useState<SenolytCycle | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCycles = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('senolytic_cycles')
        .select('*')
        .eq('user_id', user.id)
        .order('cycle_number', { ascending: false });

      if (error) throw error;

      const mappedCycles: SenolytCycle[] = (data || []).map(c => ({
        id: c.id,
        user_id: c.user_id,
        senolytic_type: c.senolytic_type as SenolytCycle['senolytic_type'],
        primary_dose_mg: c.primary_dose_mg,
        secondary_dose_mg: c.secondary_dose_mg,
        protocol_name: c.protocol_name,
        duration_days: c.duration_days || 2,
        cycle_number: c.cycle_number || 1,
        cycle_started_at: c.cycle_started_at,
        cycle_ended_at: c.cycle_ended_at,
        current_day: c.current_day || 0,
        status: c.status as SenolytCycle['status'],
        next_cycle_due: c.next_cycle_due,
        preferred_cycle_day: c.preferred_cycle_day || 1,
        doses_taken: c.doses_taken || 0,
        fasting_during_cycle: c.fasting_during_cycle ?? true,
        quercetin_preload: c.quercetin_preload ?? false,
        side_effects: (c.side_effects as SenolytCycle['side_effects']) || [],
        notes: c.notes,
        created_at: c.created_at,
        updated_at: c.updated_at,
      }));

      setCycles(mappedCycles);
      setActiveCycle(mappedCycles.find(c => c.status === 'active') || null);
    } catch (err) {
      console.error('Error fetching senolytic cycles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateFisetinDose = (weightKg: number): number => {
    // Mayo-Protokoll: ~20mg/kg
    return Math.round(weightKg * 20);
  };

  const startCycle = async (input: StartCycleInput) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht eingeloggt");

      if (activeCycle) {
        throw new Error("Es läuft bereits ein aktiver Zyklus");
      }

      const lastCycle = cycles[0];
      const cycleNumber = lastCycle ? (lastCycle.cycle_number || 0) + 1 : 1;

      let primaryDose: number;
      let secondaryDose: number | null = null;

      if (input.senolytic_type === 'fisetin') {
        primaryDose = input.user_weight_kg
          ? calculateFisetinDose(input.user_weight_kg)
          : 1500;
      } else {
        primaryDose = 100; // Dasatinib
        secondaryDose = 1000; // Quercetin
      }

      const { data, error } = await supabase
        .from('senolytic_cycles')
        .insert({
          user_id: user.id,
          senolytic_type: input.senolytic_type,
          primary_dose_mg: primaryDose,
          secondary_dose_mg: secondaryDose,
          protocol_name: 'mayo_clinic',
          duration_days: input.duration_days,
          cycle_number: cycleNumber,
          cycle_started_at: new Date().toISOString(),
          current_day: 1,
          status: 'active',
          doses_taken: 0,
          fasting_during_cycle: input.fasting_during_cycle ?? true,
          quercetin_preload: input.quercetin_preload ?? false,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Senolytischer Zyklus gestartet! 🎯", {
        description: `${input.senolytic_type === 'fisetin' ? 'Fisetin' : 'Q+D'} - Tag 1 von ${input.duration_days}`,
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

  const logDose = async (
    cycleId: string,
    sideEffects?: { effect: string; severity: number }
  ) => {
    try {
      const cycle = cycles.find(c => c.id === cycleId);
      if (!cycle || cycle.status !== 'active') return;

      const newDoseCount = cycle.doses_taken + 1;
      const isLastDay = cycle.current_day >= cycle.duration_days;

      const updatedSideEffects = sideEffects
        ? [...(cycle.side_effects || []), { day: cycle.current_day, ...sideEffects }]
        : cycle.side_effects;

      const updateData: Record<string, unknown> = {
        doses_taken: newDoseCount,
        side_effects: updatedSideEffects,
        updated_at: new Date().toISOString(),
      };

      if (isLastDay) {
        updateData.status = 'completed';
        updateData.cycle_ended_at = new Date().toISOString();
        updateData.next_cycle_due = addMonths(new Date(), 1).toISOString();
      } else {
        updateData.current_day = cycle.current_day + 1;
      }

      const { error } = await supabase
        .from('senolytic_cycles')
        .update(updateData)
        .eq('id', cycleId);

      if (error) throw error;

      if (isLastDay) {
        toast.success("Zyklus abgeschlossen! 🎉", {
          description: "Senolytischer Hit-and-Run erfolgreich. Nächster Zyklus in ~30 Tagen.",
        });
      } else {
        toast.success("Dosis geloggt ✓", {
          description: `Tag ${cycle.current_day}/${cycle.duration_days} abgeschlossen`,
        });
      }

      await fetchCycles();
    } catch (err) {
      toast.error("Fehler", {
        description: err instanceof Error ? err.message : "Dosis konnte nicht geloggt werden",
      });
    }
  };

  const skipCycle = async (cycleId: string, reason?: string) => {
    try {
      const cycle = cycles.find(c => c.id === cycleId);
      if (!cycle) return;

      const { error } = await supabase
        .from('senolytic_cycles')
        .update({
          status: 'skipped',
          notes: reason || 'Zyklus übersprungen',
          next_cycle_due: addMonths(new Date(), 1).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', cycleId);

      if (error) throw error;

      toast("Zyklus übersprungen", {
        description: "Nächster Zyklus in ~30 Tagen geplant",
      });

      await fetchCycles();
    } catch (err) {
      console.error('Error skipping cycle:', err);
    }
  };

  const getNextCycleDate = (): Date | null => {
    const lastCompleted = cycles.find(c => c.status === 'completed');
    if (lastCompleted?.next_cycle_due) {
      return new Date(lastCompleted.next_cycle_due);
    }
    return new Date();
  };

  const getDaysUntilNextCycle = (): number | null => {
    const nextDate = getNextCycleDate();
    if (!nextDate) return null;
    return Math.max(0, differenceInDays(nextDate, new Date()));
  };

  const isNextCycleDue = (): boolean => {
    const days = getDaysUntilNextCycle();
    return days !== null && days <= 0;
  };

  const getCycleStats = () => {
    const completed = cycles.filter(c => c.status === 'completed');
    return {
      totalCycles: completed.length,
      totalDosesTaken: completed.reduce((sum, c) => sum + (c.doses_taken || 0), 0),
      averageDuration: completed.length > 0
        ? completed.reduce((sum, c) => sum + (c.duration_days || 2), 0) / completed.length
        : 0,
      lastCycleDate: completed[0]?.cycle_ended_at
        ? new Date(completed[0].cycle_ended_at)
        : null,
    };
  };

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  return {
    cycles,
    activeCycle,
    loading,
    startCycle,
    logDose,
    skipCycle,
    calculateFisetinDose,
    getNextCycleDate,
    getDaysUntilNextCycle,
    isNextCycleDue,
    getCycleStats,
    refetch: fetchCycles,
  };
}
