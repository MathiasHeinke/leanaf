import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { addDays, differenceInDays } from "date-fns";

export interface RapamycinLog {
  id: string;
  user_id: string;
  dose_mg: number;
  taken_at: string;
  taken_fasted: boolean;
  week_number: number | null;
  cycle_active: boolean;
  days_since_last_dose: number | null;
  target_interval_days: number;
  weight_kg: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  side_effects: Array<{ effect: string; severity: number }>;
  infection_signs: boolean;
  infection_notes: string | null;
  pause_reason: string | null;
  notes: string | null;
  medical_disclaimer_accepted: boolean;
  created_at: string;
}

interface LogDoseInput {
  dose_mg: number;
  taken_fasted?: boolean;
  weight_kg?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  infection_signs?: boolean;
  notes?: string;
}

export const RAPAMYCIN_SIDE_EFFECTS = [
  { id: 'none', label: 'Keine' },
  { id: 'mouth_sores', label: 'Mund-Läsionen/Aphthen' },
  { id: 'fatigue', label: 'Müdigkeit' },
  { id: 'elevated_lipids', label: 'Erhöhte Blutfette (bekannt)' },
  { id: 'delayed_wound_healing', label: 'Verzögerte Wundheilung' },
  { id: 'gi_issues', label: 'Magen-Darm-Beschwerden' },
  { id: 'headache', label: 'Kopfschmerzen' },
  { id: 'skin_issues', label: 'Hautprobleme' },
];

const TARGET_INTERVAL_DAYS = 7;

export function useRapamycin() {
  const [logs, setLogs] = useState<RapamycinLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const { toast } = useToast();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('rapamycin_log')
        .select('*')
        .eq('user_id', user.id)
        .order('taken_at', { ascending: false });

      if (error) throw error;

      const mapped: RapamycinLog[] = (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        user_id: row.user_id as string,
        dose_mg: Number(row.dose_mg) || 5,
        taken_at: row.taken_at as string,
        taken_fasted: row.taken_fasted as boolean ?? true,
        week_number: row.week_number as number | null,
        cycle_active: row.cycle_active as boolean ?? true,
        days_since_last_dose: row.days_since_last_dose as number | null,
        target_interval_days: (row.target_interval_days as number) || TARGET_INTERVAL_DAYS,
        weight_kg: row.weight_kg as number | null,
        blood_pressure_systolic: row.blood_pressure_systolic as number | null,
        blood_pressure_diastolic: row.blood_pressure_diastolic as number | null,
        side_effects: (row.side_effects as Array<{ effect: string; severity: number }>) || [],
        infection_signs: row.infection_signs as boolean ?? false,
        infection_notes: row.infection_notes as string | null,
        pause_reason: row.pause_reason as string | null,
        notes: row.notes as string | null,
        medical_disclaimer_accepted: row.medical_disclaimer_accepted as boolean ?? false,
        created_at: row.created_at as string,
      }));

      setLogs(mapped);

      // Check if disclaimer was ever accepted
      if (mapped.length > 0) {
        setDisclaimerAccepted(mapped.some(l => l.medical_disclaimer_accepted));
      }
    } catch (err) {
      console.error('Error fetching rapamycin logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const logDose = async (input: LogDoseInput): Promise<RapamycinLog | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht eingeloggt");

      // Calculate days since last dose
      const lastLog = logs[0];
      const daysSinceLastDose = lastLog
        ? differenceInDays(new Date(), new Date(lastLog.taken_at))
        : null;

      // Calculate week number with 8 on / 4 off cycle logic
      let weekNumber = 1;
      if (lastLog?.week_number) {
        const nextWeek = lastLog.week_number + 1;
        // Cycle resets after week 12 (8 on + 4 off)
        weekNumber = nextWeek > 12 ? 1 : nextWeek;
      }

      // Check if we should be on a break (weeks 9-12 are off)
      const isOnBreak = weekNumber >= 9 && weekNumber <= 12;

      const { data, error } = await supabase
        .from('rapamycin_log')
        .insert({
          user_id: user.id,
          dose_mg: input.dose_mg,
          taken_at: new Date().toISOString(),
          taken_fasted: input.taken_fasted ?? true,
          week_number: weekNumber,
          cycle_active: !isOnBreak,
          days_since_last_dose: daysSinceLastDose,
          target_interval_days: TARGET_INTERVAL_DAYS,
          weight_kg: input.weight_kg || null,
          blood_pressure_systolic: input.blood_pressure_systolic || null,
          blood_pressure_diastolic: input.blood_pressure_diastolic || null,
          infection_signs: input.infection_signs ?? false,
          notes: input.notes || null,
          medical_disclaimer_accepted: disclaimerAccepted,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Rapamycin geloggt ✓",
        description: `${input.dose_mg}mg - Woche ${weekNumber}`,
      });

      await fetchLogs();
      return data as unknown as RapamycinLog;
    } catch (err) {
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Dosis konnte nicht geloggt werden",
        variant: "destructive",
      });
      return null;
    }
  };

  const logSideEffect = async (logId: string, effect: string, severity: number) => {
    try {
      const log = logs.find(l => l.id === logId);
      if (!log) return;

      const updatedSideEffects = [
        ...(log.side_effects || []),
        { effect, severity }
      ];

      const { error } = await supabase
        .from('rapamycin_log')
        .update({ side_effects: updatedSideEffects })
        .eq('id', logId);

      if (error) throw error;

      toast({
        title: "Nebenwirkung geloggt",
        description: "Sprich mit deinem Arzt bei anhaltenden Beschwerden.",
      });

      await fetchLogs();
    } catch (err) {
      console.error('Error logging side effect:', err);
    }
  };

  const pauseProtocol = async (reason: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mark latest active log with pause reason
      const latestActive = logs.find(l => l.cycle_active);
      if (latestActive) {
        await supabase
          .from('rapamycin_log')
          .update({
            cycle_active: false,
            pause_reason: reason
          })
          .eq('id', latestActive.id);
      }

      toast({
        title: "Protokoll pausiert",
        description: `Grund: ${reason}`,
      });

      await fetchLogs();
    } catch (err) {
      console.error('Error pausing protocol:', err);
    }
  };

  const lastLog = useMemo(() => logs[0] || null, [logs]);

  const getNextDoseDate = useCallback((): { date: Date; daysRemaining: number } | null => {
    const lastActive = logs.find(l => l.cycle_active);
    if (!lastActive) return null;

    const lastTaken = new Date(lastActive.taken_at);
    const nextDate = addDays(lastTaken, lastActive.target_interval_days);
    const daysRemaining = Math.max(0, differenceInDays(nextDate, new Date()));

    return { date: nextDate, daysRemaining };
  }, [logs]);

  const isDueToday = useCallback((): boolean => {
    const next = getNextDoseDate();
    if (!next) return true; // No logs = due
    return next.daysRemaining <= 0;
  }, [getNextDoseDate]);

  const getStats = useCallback(() => {
    const activeLogs = logs.filter(l => l.cycle_active);
    const totalWeeks = logs.length;
    const avgInterval = logs.length > 1
      ? logs.reduce((sum, l) => sum + (l.days_since_last_dose || 7), 0) / logs.length
      : 7;

    const sideEffectCount = logs.reduce(
      (sum, l) => sum + (l.side_effects?.length || 0),
      0
    );

    // Current week in cycle (1-8 active, 9-12 break)
    const currentWeek = lastLog?.week_number || 0;

    return {
      totalWeeks,
      currentWeek,
      avgInterval: Math.round(avgInterval * 10) / 10,
      sideEffectCount,
      lastDose: logs[0]?.taken_at ? new Date(logs[0].taken_at) : null,
      avgDose: logs.length > 0
        ? logs.reduce((sum, l) => sum + l.dose_mg, 0) / logs.length
        : 5,
      isOnBreak: currentWeek >= 9 && currentWeek <= 12,
      weeksUntilBreak: currentWeek < 9 ? 8 - currentWeek : 0,
      weeksInBreak: currentWeek >= 9 ? currentWeek - 8 : 0,
    };
  }, [logs, lastLog]);

  const acceptDisclaimer = useCallback(() => {
    setDisclaimerAccepted(true);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    lastLog,
    loading,
    disclaimerAccepted,
    acceptDisclaimer,
    logDose,
    logSideEffect,
    pauseProtocol,
    getNextDoseDate,
    isDueToday,
    getStats,
    SIDE_EFFECTS: RAPAMYCIN_SIDE_EFFECTS,
    refetch: fetchLogs,
  };
}
