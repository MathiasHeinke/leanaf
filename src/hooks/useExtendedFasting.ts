import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { addMonths, differenceInHours, differenceInDays } from "date-fns";

export interface DailyFastingLog {
  day: number;
  weight_kg?: number;
  ketones_mmol?: number;
  glucose_mg_dl?: number;
  energy: number; // 1-10
  mood: number; // 1-10
  hunger: number; // 1-10
  notes?: string;
  logged_at: string;
}

export interface AutophagyIndicators {
  skin_clarity?: boolean;
  mental_clarity?: boolean;
  reduced_inflammation?: boolean;
  improved_sleep?: boolean;
}

export interface ExtendedFastingCycle {
  id: string;
  user_id: string;
  fasting_type: 'water_only' | 'fmd' | 'bone_broth';
  planned_duration_days: number;
  actual_duration_days: number | null;
  started_at: string | null;
  ended_at: string | null;
  current_day: number;
  status: 'planned' | 'active' | 'completed' | 'aborted';
  daily_logs: DailyFastingLog[];
  entered_ketosis_day: number | null;
  peak_ketones_mmol: number | null;
  autophagy_indicators: AutophagyIndicators | null;
  refeeding_started_at: string | null;
  refeeding_duration_days: number;
  refeeding_log: Array<{ day: number; notes: string }>;
  next_fast_due: string | null;
  electrolytes_taken: boolean;
  supplements_paused: string[];
  notes: string | null;
  abort_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface StartFastInput {
  fasting_type: 'water_only' | 'fmd' | 'bone_broth';
  planned_duration_days: number;
  supplements_to_pause?: string[];
}

export function useExtendedFasting() {
  const [cycles, setCycles] = useState<ExtendedFastingCycle[]>([]);
  const [activeFast, setActiveFast] = useState<ExtendedFastingCycle | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCycles = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('extended_fasting_cycles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: ExtendedFastingCycle[] = (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        user_id: row.user_id as string,
        fasting_type: (row.fasting_type as ExtendedFastingCycle['fasting_type']) || 'water_only',
        planned_duration_days: (row.planned_duration_days as number) || 5,
        actual_duration_days: row.actual_duration_days as number | null,
        started_at: row.started_at as string | null,
        ended_at: row.ended_at as string | null,
        current_day: (row.current_day as number) || 1,
        status: (row.status as ExtendedFastingCycle['status']) || 'planned',
        daily_logs: (row.daily_logs as DailyFastingLog[]) || [],
        entered_ketosis_day: row.entered_ketosis_day as number | null,
        peak_ketones_mmol: row.peak_ketones_mmol as number | null,
        autophagy_indicators: row.autophagy_indicators as AutophagyIndicators | null,
        refeeding_started_at: row.refeeding_started_at as string | null,
        refeeding_duration_days: (row.refeeding_duration_days as number) || 3,
        refeeding_log: (row.refeeding_log as Array<{ day: number; notes: string }>) || [],
        next_fast_due: row.next_fast_due as string | null,
        electrolytes_taken: (row.electrolytes_taken as boolean) ?? true,
        supplements_paused: (row.supplements_paused as string[]) || [],
        notes: row.notes as string | null,
        abort_reason: row.abort_reason as string | null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
      }));

      setCycles(mapped);
      setActiveFast(mapped.find(c => c.status === 'active') || null);
    } catch (err) {
      console.error('Error fetching fasting cycles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const startFast = async (input: StartFastInput): Promise<ExtendedFastingCycle | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht eingeloggt");

      if (activeFast) {
        throw new Error("Es läuft bereits ein aktives Fasten");
      }

      const { data, error } = await supabase
        .from('extended_fasting_cycles')
        .insert({
          user_id: user.id,
          fasting_type: input.fasting_type,
          planned_duration_days: input.planned_duration_days,
          started_at: new Date().toISOString(),
          current_day: 1,
          status: 'active',
          daily_logs: [],
          electrolytes_taken: true,
          supplements_paused: input.supplements_to_pause || ['nmn', 'protein'],
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Fasten gestartet! 🧘",
        description: `${input.planned_duration_days}-Tage ${input.fasting_type === 'water_only' ? 'Wasserfasten' : input.fasting_type} beginnt`,
      });

      await fetchCycles();
      return data as unknown as ExtendedFastingCycle;
    } catch (err) {
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Fasten konnte nicht gestartet werden",
        variant: "destructive",
      });
      return null;
    }
  };

  const logDailyProgress = async (
    cycleId: string,
    log: Omit<DailyFastingLog, 'day' | 'logged_at'>
  ) => {
    try {
      const cycle = cycles.find(c => c.id === cycleId);
      if (!cycle || cycle.status !== 'active') return;

      const newLog: DailyFastingLog = {
        ...log,
        day: cycle.current_day,
        logged_at: new Date().toISOString(),
      };

      const updatedLogs = [...cycle.daily_logs, newLog];

      // Check for ketosis entry (>= 0.5 mmol/L)
      const ketosisDay = log.ketones_mmol && log.ketones_mmol >= 0.5 && !cycle.entered_ketosis_day
        ? cycle.current_day
        : cycle.entered_ketosis_day;

      // Track peak ketones
      const peakKetones = log.ketones_mmol
        ? Math.max(log.ketones_mmol, cycle.peak_ketones_mmol || 0)
        : cycle.peak_ketones_mmol;

      const { error } = await supabase
        .from('extended_fasting_cycles')
        .update({
          daily_logs: JSON.parse(JSON.stringify(updatedLogs)),
          current_day: cycle.current_day + 1,
          entered_ketosis_day: ketosisDay,
          peak_ketones_mmol: peakKetones,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cycleId);

      if (error) throw error;

      toast({
        title: "Tag geloggt ✓",
        description: `Tag ${cycle.current_day} abgeschlossen. Weiter so! 💪`,
      });

      await fetchCycles();
    } catch (err) {
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Log fehlgeschlagen",
        variant: "destructive",
      });
    }
  };

  const completeFast = async (cycleId: string, autophagyIndicators?: AutophagyIndicators) => {
    try {
      const cycle = cycles.find(c => c.id === cycleId);
      if (!cycle) return;

      const { error } = await supabase
        .from('extended_fasting_cycles')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          actual_duration_days: cycle.current_day - 1,
          autophagy_indicators: autophagyIndicators ? JSON.parse(JSON.stringify(autophagyIndicators)) : null,
          refeeding_started_at: new Date().toISOString(),
          next_fast_due: addMonths(new Date(), 4).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', cycleId);

      if (error) throw error;

      toast({
        title: "Fasten abgeschlossen! 🎉",
        description: `${cycle.current_day - 1} Tage geschafft! Jetzt sanftes Refeeding.`,
      });

      await fetchCycles();
    } catch (err) {
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Abschluss fehlgeschlagen",
        variant: "destructive",
      });
    }
  };

  const abortFast = async (cycleId: string, reason: string) => {
    try {
      const cycle = cycles.find(c => c.id === cycleId);
      if (!cycle) return;

      const { error } = await supabase
        .from('extended_fasting_cycles')
        .update({
          status: 'aborted',
          ended_at: new Date().toISOString(),
          actual_duration_days: cycle.current_day - 1,
          abort_reason: reason,
          next_fast_due: addMonths(new Date(), 4).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', cycleId);

      if (error) throw error;

      toast({
        title: "Fasten abgebrochen",
        description: "Kein Problem - höre auf deinen Körper! 🙏",
      });

      await fetchCycles();
    } catch (err) {
      console.error('Error aborting fast:', err);
    }
  };

  const getHoursFasted = (): number | null => {
    if (!activeFast?.started_at) return null;
    return differenceInHours(new Date(), new Date(activeFast.started_at));
  };

  const getDaysFasted = (): number | null => {
    if (!activeFast?.started_at) return null;
    return differenceInDays(new Date(), new Date(activeFast.started_at));
  };

  const getFastingStats = () => {
    const completed = cycles.filter(c => c.status === 'completed');
    return {
      totalFasts: completed.length,
      totalDaysFasted: completed.reduce((sum, c) => sum + (c.actual_duration_days || 0), 0),
      averageDuration: completed.length > 0
        ? completed.reduce((sum, c) => sum + (c.actual_duration_days || 0), 0) / completed.length
        : 0,
      longestFast: Math.max(...completed.map(c => c.actual_duration_days || 0), 0),
      lastFastDate: completed[0]?.ended_at ? new Date(completed[0].ended_at) : null,
    };
  };

  const getNextFastDue = (): Date | null => {
    const completed = cycles.filter(c => c.status === 'completed');
    if (completed.length === 0) return null;
    
    const lastCompleted = completed[0];
    if (lastCompleted?.next_fast_due) {
      return new Date(lastCompleted.next_fast_due);
    }
    return null;
  };

  const isNextFastDue = (): boolean => {
    const nextDue = getNextFastDue();
    if (!nextDue) return false;
    return new Date() >= nextDue;
  };

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  return {
    cycles,
    activeFast,
    loading,
    startFast,
    logDailyProgress,
    completeFast,
    abortFast,
    getHoursFasted,
    getDaysFasted,
    getFastingStats,
    getNextFastDue,
    isNextFastDue,
    refetch: fetchCycles,
  };
}
