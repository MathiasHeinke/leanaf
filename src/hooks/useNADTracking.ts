import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export interface NADProtocol {
  id: string;
  user_id: string;
  supplement_type: string;
  brand: string | null;
  dose_mg: number;
  formulation: string;
  timing: string;
  with_resveratrol: boolean;
  resveratrol_dose_mg: number | null;
  is_active: boolean;
  started_at: string;
  created_at: string;
  updated_at: string;
}

export interface NADBloodLevel {
  id: string;
  user_id: string;
  measured_at: string;
  nad_level: number | null;
  nad_unit: string;
  lactate: number | null;
  pyruvate: number | null;
  lactate_pyruvate_ratio: number | null;
  test_provider: string | null;
  notes: string | null;
}

export function useNADTracking() {
  const [protocol, setProtocol] = useState<NADProtocol | null>(null);
  const [bloodLevels, setBloodLevels] = useState<NADBloodLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch active protocol
      const { data: protocolData, error: protocolError } = await (supabase as any)
        .from('nad_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (protocolError && protocolError.code !== 'PGRST116') {
        throw protocolError;
      }
      setProtocol(protocolData || null);

      // Fetch blood levels
      const { data: bloodData, error: bloodError } = await (supabase as any)
        .from('nad_blood_levels')
        .select('*')
        .eq('user_id', user.id)
        .order('measured_at', { ascending: false })
        .limit(10);

      if (bloodError) throw bloodError;
      setBloodLevels(bloodData || []);
    } catch (err) {
      console.error('Error fetching NAD data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProtocol = async (input: {
    supplement_type: string;
    dose_mg: number;
    formulation: string;
    timing: string;
    with_resveratrol: boolean;
    resveratrol_dose_mg?: number;
    brand?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht eingeloggt");

      // Deactivate any existing protocol
      await (supabase as any)
        .from('nad_tracking')
        .update({ is_active: false })
        .eq('user_id', user.id);

      const { data, error } = await (supabase as any)
        .from('nad_tracking')
        .insert({
          user_id: user.id,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "NAD+ Protokoll erstellt",
        description: `${input.dose_mg}mg ${input.supplement_type.toUpperCase()} täglich`,
      });

      await fetchData();
      return data;
    } catch (err) {
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
        variant: "destructive",
      });
      return null;
    }
  };

  const logIntake = async (notes?: string) => {
    if (!protocol) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('peptide_intake_log')
        .insert({
          user_id: user.id,
          protocol_id: protocol.id,
          peptide_name: protocol.supplement_type,
          dose_mcg: protocol.dose_mg,
          dose_unit: 'mg',
          timing: protocol.timing,
          taken_at: new Date().toISOString(),
          notes: notes || null,
        });

      if (error) throw error;

      toast({
        title: "NAD+ geloggt ✓",
        description: `${protocol.dose_mg}mg ${protocol.supplement_type.toUpperCase()}`,
      });

      return true;
    } catch (err) {
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Log fehlgeschlagen",
        variant: "destructive",
      });
      return false;
    }
  };

  const addBloodLevel = async (input: {
    nad_level?: number;
    lactate?: number;
    pyruvate?: number;
    test_provider?: string;
    notes?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht eingeloggt");

      const lactate_pyruvate_ratio = input.lactate && input.pyruvate
        ? input.lactate / input.pyruvate
        : null;

      const { error } = await (supabase as any)
        .from('nad_blood_levels')
        .insert({
          user_id: user.id,
          ...input,
          lactate_pyruvate_ratio,
        });

      if (error) throw error;

      toast({
        title: "Blutwert gespeichert",
        description: "NAD+ Messung hinzugefügt",
      });

      await fetchData();
    } catch (err) {
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Speichern fehlgeschlagen",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    protocol,
    bloodLevels,
    loading,
    createProtocol,
    logIntake,
    addBloodLevel,
    refetch: fetchData,
  };
}
