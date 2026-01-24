import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";

export interface MaintenanceProtocol {
  id: string;
  user_id: string;
  substance_name: string;
  substance_category: 'longevity' | 'hormone' | 'metabolic';
  dose_amount: number;
  dose_unit: string;
  frequency: 'daily' | 'weekly' | 'every_10_14_days' | 'twice_daily';
  frequency_days: number | null;
  timing: string;
  current_streak_days: number;
  longest_streak_days: number;
  total_doses_taken: number;
  last_taken_at: string | null;
  is_active: boolean;
  protocol_phase: number;
  started_in_phase: number;
  continued_from_phase: number | null;
  dose_adjustments: Array<{
    date: string;
    old_dose: number;
    new_dose: number;
    reason: string;
  }>;
  created_at: string;
  updated_at: string;
}

interface CreateMaintenanceProtocolInput {
  substance_name: string;
  dose_amount: number;
  dose_unit: string;
  frequency: 'daily' | 'weekly' | 'every_10_14_days' | 'twice_daily';
  frequency_days?: number;
  timing: string;
  continued_from_phase?: number;
}

const CATEGORY_MAP: Record<string, 'longevity' | 'hormone' | 'metabolic'> = {
  'ca_akg': 'longevity',
  'glycine': 'longevity',
  'trt_maintenance': 'hormone',
  'reta_micro': 'metabolic',
  'nad_maintenance': 'longevity',
};

export function useMaintenanceProtocols() {
  const [protocols, setProtocols] = useState<MaintenanceProtocol[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProtocols = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('maintenance_protocols')
        .select('*')
        .eq('user_id', user.id)
        .order('substance_category', { ascending: true });

      if (error) throw error;

      // Map database fields to interface
      const mapped: MaintenanceProtocol[] = (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        user_id: row.user_id as string,
        substance_name: row.substance_name as string,
        substance_category: (row.substance_category as 'longevity' | 'hormone' | 'metabolic') || 'longevity',
        dose_amount: (row.dose_amount as number) || 0,
        dose_unit: (row.dose_unit as string) || 'mg',
        frequency: (row.frequency as 'daily' | 'weekly' | 'every_10_14_days' | 'twice_daily') || 'daily',
        frequency_days: row.frequency_days as number | null,
        timing: (row.timing as string) || '',
        current_streak_days: (row.current_streak_days as number) || 0,
        longest_streak_days: (row.longest_streak_days as number) || 0,
        total_doses_taken: (row.total_doses_taken as number) || 0,
        last_taken_at: row.last_taken_at as string | null,
        is_active: row.is_active !== false,
        protocol_phase: (row.protocol_phase as number) || 3,
        started_in_phase: (row.started_in_phase as number) || 3,
        continued_from_phase: row.continued_from_phase as number | null,
        dose_adjustments: (row.dose_adjustments as MaintenanceProtocol['dose_adjustments']) || [],
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
      }));

      setProtocols(mapped);
    } catch (err) {
      console.error('Error fetching maintenance protocols:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProtocol = async (input: CreateMaintenanceProtocolInput) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht eingeloggt");

      const { data, error } = await supabase
        .from('maintenance_protocols')
        .insert({
          user_id: user.id,
          substance_name: input.substance_name,
          substance_category: CATEGORY_MAP[input.substance_name] || 'longevity',
          dose_amount: input.dose_amount,
          dose_unit: input.dose_unit,
          frequency: input.frequency,
          frequency_days: input.frequency_days || null,
          timing: input.timing,
          protocol_phase: 3,
          started_in_phase: 3,
          continued_from_phase: input.continued_from_phase || null,
          current_streak_days: 0,
          longest_streak_days: 0,
          total_doses_taken: 0,
          is_active: true,
          dose_adjustments: [],
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Maintenance-Protokoll erstellt", {
        description: `${input.substance_name} hinzugefügt`,
      });

      await fetchProtocols();
      return data;
    } catch (err) {
      toast.error("Fehler", {
        description: err instanceof Error ? err.message : "Protokoll konnte nicht erstellt werden",
      });
      return null;
    }
  };

  const logDose = async (protocolId: string) => {
    try {
      const protocol = protocols.find(p => p.id === protocolId);
      if (!protocol) return;

      const now = new Date();
      const lastTaken = protocol.last_taken_at ? new Date(protocol.last_taken_at) : null;

      // Calculate streak
      let newStreak = 1;
      if (lastTaken) {
        const daysSinceLastDose = differenceInDays(now, lastTaken);
        const expectedInterval = protocol.frequency === 'daily' || protocol.frequency === 'twice_daily'
          ? 1
          : protocol.frequency === 'weekly'
            ? 7
            : protocol.frequency_days || 12;

        // If within expected interval (+1 day grace), continue streak
        if (daysSinceLastDose <= expectedInterval + 1) {
          newStreak = protocol.current_streak_days + 1;
        }
      }

      const { error } = await supabase
        .from('maintenance_protocols')
        .update({
          last_taken_at: now.toISOString(),
          current_streak_days: newStreak,
          longest_streak_days: Math.max(newStreak, protocol.longest_streak_days),
          total_doses_taken: protocol.total_doses_taken + 1,
          updated_at: now.toISOString(),
        })
        .eq('id', protocolId);

      if (error) throw error;

      toast.success("Dosis geloggt ✓", {
        description: `Streak: ${newStreak} ${newStreak === 1 ? 'Tag' : 'Tage'}`,
      });

      await fetchProtocols();
    } catch (err) {
      toast.error("Fehler", {
        description: err instanceof Error ? err.message : "Dosis konnte nicht geloggt werden",
      });
    }
  };

  const adjustDose = async (protocolId: string, newDose: number, reason: string) => {
    try {
      const protocol = protocols.find(p => p.id === protocolId);
      if (!protocol) return;

      const adjustment = {
        date: new Date().toISOString(),
        old_dose: protocol.dose_amount,
        new_dose: newDose,
        reason,
      };

      const { error } = await supabase
        .from('maintenance_protocols')
        .update({
          dose_amount: newDose,
          dose_adjustments: [...protocol.dose_adjustments, adjustment],
          updated_at: new Date().toISOString(),
        })
        .eq('id', protocolId);

      if (error) throw error;

      toast.success("Dosis angepasst", {
        description: `${protocol.dose_amount}${protocol.dose_unit} → ${newDose}${protocol.dose_unit}`,
      });

      await fetchProtocols();
    } catch (err) {
      toast.error("Fehler", {
        description: err instanceof Error ? err.message : "Anpassung fehlgeschlagen",
      });
    }
  };

  const toggleActive = async (protocolId: string) => {
    try {
      const protocol = protocols.find(p => p.id === protocolId);
      if (!protocol) return;

      const { error } = await supabase
        .from('maintenance_protocols')
        .update({
          is_active: !protocol.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', protocolId);

      if (error) throw error;

      toast.success(protocol.is_active ? "Protokoll pausiert" : "Protokoll reaktiviert");
      await fetchProtocols();
    } catch (err) {
      toast.error("Fehler beim Aktualisieren");
    }
  };

  const isDueToday = (protocol: MaintenanceProtocol): boolean => {
    if (!protocol.is_active) return false;
    if (!protocol.last_taken_at) return true;

    const lastTaken = new Date(protocol.last_taken_at);
    const daysSince = differenceInDays(new Date(), lastTaken);

    switch (protocol.frequency) {
      case 'daily':
      case 'twice_daily':
        return daysSince >= 1;
      case 'weekly':
        return daysSince >= 7;
      case 'every_10_14_days':
        return daysSince >= (protocol.frequency_days || 10);
      default:
        return true;
    }
  };

  const getOverallCompliance = (): number => {
    const activeProtocols = protocols.filter(p => p.is_active);
    if (activeProtocols.length === 0) return 100;

    const compliant = activeProtocols.filter(p => !isDueToday(p)).length;
    return Math.round((compliant / activeProtocols.length) * 100);
  };

  const getProtocolsByCategory = (category: 'longevity' | 'hormone' | 'metabolic') => {
    return protocols.filter(p => p.substance_category === category);
  };

  const getActiveProtocols = () => protocols.filter(p => p.is_active);
  const getDueProtocols = () => protocols.filter(p => isDueToday(p));

  useEffect(() => {
    fetchProtocols();
  }, [fetchProtocols]);

  return {
    protocols,
    loading,
    createProtocol,
    logDose,
    adjustDose,
    toggleActive,
    isDueToday,
    getOverallCompliance,
    getProtocolsByCategory,
    getActiveProtocols,
    getDueProtocols,
    refetch: fetchProtocols,
  };
}
