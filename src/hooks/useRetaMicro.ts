import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { differenceInDays, addDays } from "date-fns";

export interface RetaMicroLog {
  id: string;
  user_id: string;
  dose_mg: number;
  injected_at: string;
  injection_site: 'abdomen' | 'thigh_left' | 'thigh_right' | 'arm_left' | 'arm_right';
  days_since_last_dose: number | null;
  target_interval_days: number;
  appetite_score: number | null; // 1-10
  satiety_duration_hours: number | null;
  energy_level: number | null; // 1-10
  cravings_controlled: boolean | null;
  gi_side_effects: string[];
  gi_severity: number | null; // 1-5
  notes: string | null;
  created_at: string;
}

interface LogDoseInput {
  dose_mg: number;
  injection_site: RetaMicroLog['injection_site'];
  appetite_score?: number;
  satiety_duration_hours?: number;
  energy_level?: number;
  cravings_controlled?: boolean;
  gi_side_effects?: string[];
  gi_severity?: number;
  notes?: string;
}

const TARGET_INTERVAL_DAYS = 12; // Recommended 10-14 days, default to 12

export function useRetaMicro() {
  const [logs, setLogs] = useState<RetaMicroLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('reta_micro_log')
        .select('*')
        .eq('user_id', user.id)
        .order('injected_at', { ascending: false });

      if (error) throw error;

      const mapped: RetaMicroLog[] = (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        user_id: row.user_id as string,
        dose_mg: (row.dose_mg as number) || 0.5,
        injected_at: row.injected_at as string,
        injection_site: (row.injection_site as RetaMicroLog['injection_site']) || 'abdomen',
        days_since_last_dose: row.days_since_last_dose as number | null,
        target_interval_days: (row.target_interval_days as number) || TARGET_INTERVAL_DAYS,
        appetite_score: row.appetite_score as number | null,
        satiety_duration_hours: row.satiety_duration_hours as number | null,
        energy_level: row.energy_level as number | null,
        cravings_controlled: row.cravings_controlled as boolean | null,
        gi_side_effects: (row.gi_side_effects as string[]) || [],
        gi_severity: row.gi_severity as number | null,
        notes: row.notes as string | null,
        created_at: row.created_at as string,
      }));

      setLogs(mapped);
    } catch (err) {
      console.error('Error fetching reta micro logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const logDose = async (input: LogDoseInput): Promise<RetaMicroLog | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht eingeloggt");

      const lastDose = logs[0];
      const daysSinceLast = lastDose
        ? differenceInDays(new Date(), new Date(lastDose.injected_at))
        : null;

      const { data, error } = await supabase
        .from('reta_micro_log')
        .insert({
          user_id: user.id,
          dose_mg: input.dose_mg,
          injected_at: new Date().toISOString(),
          injection_site: input.injection_site,
          days_since_last_dose: daysSinceLast,
          target_interval_days: TARGET_INTERVAL_DAYS,
          appetite_score: input.appetite_score,
          satiety_duration_hours: input.satiety_duration_hours,
          energy_level: input.energy_level,
          cravings_controlled: input.cravings_controlled,
          gi_side_effects: input.gi_side_effects || [],
          gi_severity: input.gi_severity,
          notes: input.notes,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Reta Micro geloggt! 💉",
        description: `${input.dose_mg}mg in ${getSiteLabel(input.injection_site)}`,
      });

      await fetchLogs();
      return data as unknown as RetaMicroLog;
    } catch (err) {
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Dosis konnte nicht geloggt werden",
        variant: "destructive",
      });
      return null;
    }
  };

  const lastDose = useMemo(() => logs[0] || null, [logs]);

  const getDaysSinceLastDose = useCallback((): number | null => {
    if (!lastDose) return null;
    return differenceInDays(new Date(), new Date(lastDose.injected_at));
  }, [lastDose]);

  const getNextDoseDate = useCallback((): Date | null => {
    if (!lastDose) return null;
    return addDays(new Date(lastDose.injected_at), TARGET_INTERVAL_DAYS);
  }, [lastDose]);

  const getDaysUntilNextDose = useCallback((): number | null => {
    const nextDose = getNextDoseDate();
    if (!nextDose) return null;
    const days = differenceInDays(nextDose, new Date());
    return Math.max(0, days);
  }, [getNextDoseDate]);

  const isDue = useCallback((): boolean => {
    const daysUntil = getDaysUntilNextDose();
    return daysUntil !== null && daysUntil <= 0;
  }, [getDaysUntilNextDose]);

  const getAverageInterval = useCallback((): number => {
    if (logs.length < 2) return TARGET_INTERVAL_DAYS;
    
    const intervals = logs.slice(0, -1).map((log, i) => {
      const nextLog = logs[i + 1];
      return differenceInDays(new Date(log.injected_at), new Date(nextLog.injected_at));
    });
    
    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  }, [logs]);

  const getInjectionSiteRotation = useCallback((): RetaMicroLog['injection_site'][] => {
    const sites: RetaMicroLog['injection_site'][] = ['abdomen', 'thigh_left', 'thigh_right', 'arm_left', 'arm_right'];
    const lastSite = lastDose?.injection_site;
    
    if (!lastSite) return sites;
    
    // Rotate to put last used site at the end
    const lastIndex = sites.indexOf(lastSite);
    return [...sites.slice(lastIndex + 1), ...sites.slice(0, lastIndex + 1)];
  }, [lastDose]);

  const getGISideEffectStats = useCallback(() => {
    const withSideEffects = logs.filter(l => l.gi_side_effects.length > 0);
    const avgSeverity = withSideEffects.length > 0
      ? withSideEffects.reduce((sum, l) => sum + (l.gi_severity || 0), 0) / withSideEffects.length
      : 0;

    const effectCounts: Record<string, number> = {};
    logs.forEach(log => {
      log.gi_side_effects.forEach(effect => {
        effectCounts[effect] = (effectCounts[effect] || 0) + 1;
      });
    });

    return {
      occurrenceRate: logs.length > 0 ? (withSideEffects.length / logs.length) * 100 : 0,
      averageSeverity: avgSeverity,
      mostCommon: Object.entries(effectCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([effect]) => effect),
    };
  }, [logs]);

  const getStats = useCallback(() => {
    return {
      totalDoses: logs.length,
      averageInterval: getAverageInterval(),
      averageAppetiteScore: logs.length > 0
        ? logs.filter(l => l.appetite_score).reduce((sum, l) => sum + (l.appetite_score || 0), 0) / logs.filter(l => l.appetite_score).length
        : null,
      averageSatietyHours: logs.length > 0
        ? logs.filter(l => l.satiety_duration_hours).reduce((sum, l) => sum + (l.satiety_duration_hours || 0), 0) / logs.filter(l => l.satiety_duration_hours).length
        : null,
      giStats: getGISideEffectStats(),
    };
  }, [logs, getAverageInterval, getGISideEffectStats]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    lastDose,
    loading,
    logDose,
    getDaysSinceLastDose,
    getNextDoseDate,
    getDaysUntilNextDose,
    isDue,
    getAverageInterval,
    getInjectionSiteRotation,
    getGISideEffectStats,
    getStats,
    refetch: fetchLogs,
  };
}

// Helper function for injection site labels
function getSiteLabel(site: RetaMicroLog['injection_site']): string {
  const labels: Record<RetaMicroLog['injection_site'], string> = {
    'abdomen': 'Bauch',
    'thigh_left': 'Linker Oberschenkel',
    'thigh_right': 'Rechter Oberschenkel',
    'arm_left': 'Linker Oberarm',
    'arm_right': 'Rechter Oberarm',
  };
  return labels[site] || site;
}

export { getSiteLabel };
