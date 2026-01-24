import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export interface BioAgeMeasurement {
  id: string;
  user_id: string;
  measured_at: string | null;
  measurement_type: string | null;
  dunedin_pace: number | null;
  calculated_bio_age: number | null;
  chronological_age: number | null;
  age_difference: number | null;
  previous_measurement_id: string | null;
  proxy_inputs: Record<string, number> | null;
  test_provider: string | null;
  test_report_url: string | null;
  notes: string | null;
}

export interface ProxyInputs {
  hba1c: number;
  hscrp: number;
  ldl: number;
  hdl: number;
  triglycerides: number;
}

export function useBioAge() {
  const [measurements, setMeasurements] = useState<BioAgeMeasurement[]>([]);
  const [latestMeasurement, setLatestMeasurement] = useState<BioAgeMeasurement | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMeasurements = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await (supabase as any)
        .from('bio_age_tracking')
        .select('*')
        .eq('user_id', user.id)
        .order('measured_at', { ascending: false });

      if (error) throw error;

      const mappedData: BioAgeMeasurement[] = (data || []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        measured_at: row.measured_at || row.test_date,
        measurement_type: row.measurement_type,
        dunedin_pace: row.dunedin_pace,
        calculated_bio_age: row.calculated_bio_age,
        chronological_age: row.chronological_age,
        age_difference: row.age_difference,
        previous_measurement_id: row.previous_measurement_id,
        proxy_inputs: row.proxy_inputs,
        test_provider: row.test_provider,
        test_report_url: row.test_report_url,
        notes: row.notes,
      }));

      setMeasurements(mappedData);
      setLatestMeasurement(mappedData[0] || null);
    } catch (err) {
      console.error('Error fetching bio age data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Proxy-Berechnung für biologisches Alter (vereinfachte Levine-Formel)
  const calculateProxyBioAge = useCallback((inputs: ProxyInputs, chronologicalAge: number): number => {
    let ageAdjustment = 0;

    // HbA1c (optimal: 4.5-5.5%)
    if (inputs.hba1c > 5.7) {
      ageAdjustment += (inputs.hba1c - 5.5) * 2;
    } else if (inputs.hba1c < 4.5) {
      ageAdjustment += 1;
    }

    // hsCRP (optimal: <1 mg/L)
    if (inputs.hscrp > 1) {
      ageAdjustment += Math.min(inputs.hscrp, 5) * 1.5;
    } else if (inputs.hscrp < 0.5) {
      ageAdjustment -= 1;
    }

    // LDL (optimal: 70-100 mg/dL)
    if (inputs.ldl > 130) {
      ageAdjustment += (inputs.ldl - 100) * 0.03;
    } else if (inputs.ldl < 70) {
      ageAdjustment -= 0.5;
    }

    // HDL (optimal: >60 mg/dL)
    if (inputs.hdl < 40) {
      ageAdjustment += (50 - inputs.hdl) * 0.1;
    } else if (inputs.hdl > 60) {
      ageAdjustment -= 1;
    }

    // Triglyceride (optimal: <100 mg/dL)
    if (inputs.triglycerides > 150) {
      ageAdjustment += (inputs.triglycerides - 100) * 0.02;
    }

    return Math.round(chronologicalAge + ageAdjustment);
  }, []);

  // DunedinPACE zu Bio-Age Approximation
  const dunedinPaceToBioAge = useCallback((pace: number, chronologicalAge: number): number => {
    // DunedinPACE 1.0 = altert normal
    // DunedinPACE 0.6 = altert 40% langsamer
    const yearsDeviation = (pace - 1.0) * chronologicalAge * 0.3;
    return Math.round(chronologicalAge + yearsDeviation);
  }, []);

  const addDunedinPaceMeasurement = async (
    score: number,
    chronologicalAge: number,
    provider?: string,
    reportUrl?: string,
    notes?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht eingeloggt");

      const biologicalAge = dunedinPaceToBioAge(score, chronologicalAge);
      const previousMeasurement = measurements[0];

      const { error } = await (supabase as any)
        .from('bio_age_tracking')
        .insert({
          user_id: user.id,
          measurement_type: 'dunedin_pace',
          dunedin_pace: score,
          test_provider: provider || null,
          test_report_url: reportUrl || null,
          chronological_age: chronologicalAge,
          calculated_bio_age: biologicalAge,
          age_difference: biologicalAge - chronologicalAge,
          previous_measurement_id: previousMeasurement?.id || null,
          notes: notes || null,
          measured_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "DunedinPACE gespeichert",
        description: `Score: ${score.toFixed(2)} → Bio-Age: ${biologicalAge}`,
      });

      await fetchMeasurements();
      return true;
    } catch (err) {
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Speichern fehlgeschlagen",
        variant: "destructive",
      });
      return false;
    }
  };

  const addProxyMeasurement = async (
    inputs: ProxyInputs,
    chronologicalAge: number,
    notes?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht eingeloggt");

      const biologicalAge = calculateProxyBioAge(inputs, chronologicalAge);
      const previousMeasurement = measurements[0];
      const ageDiff = biologicalAge - chronologicalAge;

      const { error } = await (supabase as any)
        .from('bio_age_tracking')
        .insert({
          user_id: user.id,
          measurement_type: 'proxy_calculation',
          proxy_inputs: inputs,
          chronological_age: chronologicalAge,
          calculated_bio_age: biologicalAge,
          age_difference: ageDiff,
          previous_measurement_id: previousMeasurement?.id || null,
          notes: notes || null,
          measured_at: new Date().toISOString(),
          // Store individual values too
          hba1c: inputs.hba1c,
          hscrp: inputs.hscrp,
          ldl: inputs.ldl,
          hdl: inputs.hdl,
          triglycerides: inputs.triglycerides,
        });

      if (error) throw error;

      toast({
        title: "Proxy Bio-Age gespeichert",
        description: `Berechnet: ${biologicalAge} Jahre (${ageDiff > 0 ? '+' : ''}${ageDiff})`,
      });

      await fetchMeasurements();
      return true;
    } catch (err) {
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Speichern fehlgeschlagen",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchMeasurements();
  }, [fetchMeasurements]);

  return {
    measurements,
    latestMeasurement,
    loading,
    addDunedinPaceMeasurement,
    addProxyMeasurement,
    calculateProxyBioAge,
    dunedinPaceToBioAge,
    refetch: fetchMeasurements,
  };
}
