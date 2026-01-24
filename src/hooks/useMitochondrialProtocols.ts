import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MitochondrialProtocol {
  id: string;
  user_id: string;
  substance_name: string;
  dose_amount: number;
  dose_unit: string;
  timing: string;
  frequency_per_week: number;
  preferred_days: string[];
  cycle_weeks_on: number;
  cycle_weeks_off: number;
  current_cycle_week: number;
  cycle_started_at: string | null;
  is_active: boolean;
  protocol_phase: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMitochondrialProtocolInput {
  substance_name: string;
  dose_amount: number;
  dose_unit: string;
  timing: string;
  frequency_per_week: number;
  preferred_days: string[];
}

export function useMitochondrialProtocols() {
  const [protocols, setProtocols] = useState<MitochondrialProtocol[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProtocols = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from('mitochondrial_protocols')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProtocols(data || []);
    } catch (err) {
      console.error('Error fetching mito protocols:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProtocol = async (input: CreateMitochondrialProtocolInput) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht eingeloggt");

      const { data, error } = await (supabase as any)
        .from('mitochondrial_protocols')
        .insert({
          user_id: user.id,
          ...input,
          cycle_weeks_on: 8,
          cycle_weeks_off: 4,
          current_cycle_week: 1,
          cycle_started_at: new Date().toISOString(),
          protocol_phase: 2,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Protokoll erstellt", {
        description: `${input.substance_name} hinzugefügt`
      });
      
      await fetchProtocols();
      return data;
    } catch (err) {
      toast.error("Fehler", {
        description: err instanceof Error ? err.message : "Unbekannter Fehler"
      });
      return null;
    }
  };

  const advanceCycleWeek = async (protocolId: string) => {
    try {
      const protocol = protocols.find(p => p.id === protocolId);
      if (!protocol) return;

      const totalCycleWeeks = protocol.cycle_weeks_on + protocol.cycle_weeks_off;
      const nextWeek = protocol.current_cycle_week >= totalCycleWeeks
        ? 1
        : protocol.current_cycle_week + 1;

      const { error } = await (supabase as any)
        .from('mitochondrial_protocols')
        .update({
          current_cycle_week: nextWeek,
          cycle_started_at: nextWeek === 1 ? new Date().toISOString() : protocol.cycle_started_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', protocolId);

      if (error) throw error;
      await fetchProtocols();
    } catch (err) {
      console.error('Error advancing cycle:', err);
    }
  };

  const isOnCycle = (protocol: MitochondrialProtocol): boolean => {
    return protocol.current_cycle_week <= protocol.cycle_weeks_on;
  };

  const getNextDoseDate = (protocol: MitochondrialProtocol): Date | null => {
    if (!isOnCycle(protocol)) return null;

    const today = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[today.getDay()];

    // Find next preferred day
    const todayIndex = dayNames.indexOf(todayName);
    for (let i = 0; i < 7; i++) {
      const checkIndex = (todayIndex + i) % 7;
      const checkDay = dayNames[checkIndex];
      if (protocol.preferred_days.includes(checkDay)) {
        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + i);
        return nextDate;
      }
    }

    return null;
  };

  const deleteProtocol = async (protocolId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('mitochondrial_protocols')
        .delete()
        .eq('id', protocolId);

      if (error) throw error;
      
      toast.success("Protokoll gelöscht");
      await fetchProtocols();
    } catch (err) {
      toast.error("Fehler beim Löschen");
    }
  };

  useEffect(() => {
    fetchProtocols();
  }, [fetchProtocols]);

  return {
    protocols,
    loading,
    createProtocol,
    advanceCycleWeek,
    isOnCycle,
    getNextDoseDate,
    deleteProtocol,
    refetch: fetchProtocols,
  };
}
