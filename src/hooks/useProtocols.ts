import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";

// Database schema types (matching actual Supabase table)
export interface PeptideEntry {
  name: string;
  dose: number;
  unit: string;
}

export interface CyclePatternData {
  type: string; // 'continuous' | '5on_2off' | '6weeks_on_pause'
  days_on?: number;
  days_off?: number;
}

export interface TitrationScheduleData {
  week_1_4?: string;
  week_5_8?: string;
  week_9_12?: string;
}

// Protocol as stored in database
export interface ProtocolDB {
  id: string;
  user_id: string;
  coach_id: string;
  name: string;
  peptides: Json; // PeptideEntry[]
  goal: string | null;
  cycle_weeks: number;
  current_week: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  phase: number | null;
  cycle_pattern: Json; // CyclePatternData
  current_cycle_day: number;
  cycle_started_at: string;
  titration_schedule: Json | null; // TitrationScheduleData
  timing: string | null;
  injection_sites: Json | null;
  current_injection_site: number;
}

// Parsed protocol with typed fields
export interface Protocol {
  id: string;
  user_id: string;
  name: string;
  peptides: PeptideEntry[];
  goal: string | null;
  cycle_weeks: number;
  current_week: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  phase: number;
  cycle_pattern: CyclePatternData;
  current_cycle_day: number;
  cycle_started_at: string;
  titration_schedule: TitrationScheduleData | null;
  timing: string;
}

// Input for creating new protocol
export interface CreateProtocolInput {
  substance_name: string;
  dose_amount: number;
  dose_unit: string;
  timing: string;
  cycle_pattern: string;
  titration_schedule?: TitrationScheduleData | null;
}

// Convert DB row to typed Protocol
function parseProtocol(row: ProtocolDB): Protocol {
  // Parse peptides safely
  let peptides: PeptideEntry[] = [];
  if (Array.isArray(row.peptides)) {
    peptides = row.peptides as unknown as PeptideEntry[];
  }

  // Parse cycle pattern safely
  let cyclePattern: CyclePatternData = { type: 'continuous' };
  if (row.cycle_pattern && typeof row.cycle_pattern === 'object' && !Array.isArray(row.cycle_pattern)) {
    const cp = row.cycle_pattern as Record<string, unknown>;
    cyclePattern = {
      type: (cp.type as string) || 'continuous',
      days_on: cp.days_on as number | undefined,
      days_off: cp.days_off as number | undefined,
    };
  }

  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    peptides,
    goal: row.goal,
    cycle_weeks: row.cycle_weeks,
    current_week: row.current_week,
    notes: row.notes,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    phase: row.phase || 1,
    cycle_pattern: cyclePattern,
    current_cycle_day: row.current_cycle_day,
    cycle_started_at: row.cycle_started_at,
    titration_schedule: row.titration_schedule as unknown as TitrationScheduleData | null,
    timing: row.timing || 'evening_fasted',
  };
}

export function useProtocols() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch all active protocols for current user
  const fetchProtocols = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht eingeloggt");

      const { data, error: fetchError } = await supabase
        .from('peptide_protocols')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const parsed = (data || []).map(row => parseProtocol(row as ProtocolDB));
      setProtocols(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  };

  // Create new protocol
  const createProtocol = async (input: CreateProtocolInput): Promise<Protocol | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht eingeloggt");

      // Build peptides array from input
      const peptideEntry: PeptideEntry = {
        name: input.substance_name,
        dose: input.dose_amount,
        unit: input.dose_unit,
      };

      // Build cycle pattern object
      const cyclePatternData: CyclePatternData = {
        type: input.cycle_pattern,
        ...(input.cycle_pattern === '5on_2off' && { days_on: 5, days_off: 2 }),
        ...(input.cycle_pattern === '6weeks_on_pause' && { days_on: 42 }),
      };

      const insertData = {
        user_id: user.id,
        coach_id: 'user',
        name: `${input.substance_name} Protokoll`,
        peptides: [peptideEntry] as unknown as Json,
        goal: 'Phase 1 - Rekomposition',
        cycle_weeks: 12,
        current_week: 1,
        is_active: true,
        phase: 1,
        cycle_pattern: cyclePatternData as unknown as Json,
        current_cycle_day: 1,
        cycle_started_at: new Date().toISOString(),
        titration_schedule: (input.titration_schedule || null) as unknown as Json,
        timing: input.timing,
      };

      const { data, error: insertError } = await supabase
        .from('peptide_protocols')
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      // Refresh list
      await fetchProtocols();

      return parseProtocol(data as ProtocolDB);
    } catch (err) {
      toast({
        title: "Fehler beim Erstellen",
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
        variant: "destructive",
      });
      return null;
    }
  };

  // Pause/Resume protocol
  const toggleProtocolActive = async (protocolId: string, isActive: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('peptide_protocols')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', protocolId);

      if (updateError) throw updateError;

      await fetchProtocols();
    } catch (err) {
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    }
  };

  // Delete protocol
  const deleteProtocol = async (protocolId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('peptide_protocols')
        .delete()
        .eq('id', protocolId);

      if (deleteError) throw deleteError;

      await fetchProtocols();
    } catch (err) {
      toast({
        title: "Fehler beim Löschen",
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchProtocols();
  }, []);

  return {
    protocols,
    loading,
    error,
    createProtocol,
    toggleProtocolActive,
    deleteProtocol,
    refetch: fetchProtocols,
  };
}
