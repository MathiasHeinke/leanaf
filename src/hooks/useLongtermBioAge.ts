import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { differenceInMonths, differenceInYears, subMonths } from "date-fns";

export interface LongtermBioAgeMeasurement {
  id: string;
  user_id: string;
  measured_at: string;
  test_type: 'truage' | 'glycanage' | 'dunedinpace' | 'proxy' | 'other';
  test_provider: string | null;
  test_report_url: string | null;
  chronological_age_years: number;
  chronological_age_months: number | null;
  dunedin_pace: number | null;
  horvath_clock_age: number | null;
  hannum_clock_age: number | null;
  phenoage: number | null;
  grimage: number | null;
  telomere_length_kb: number | null;
  telomere_percentile: number | null;
  proxy_calculated_age: number | null;
  proxy_inputs: {
    hba1c?: number;
    hscrp?: number;
    ldl?: number;
    hdl?: number;
    triglycerides?: number;
  } | null;
  biological_age: number;
  age_difference: number;
  aging_rate: number | null;
  change_from_previous: number | null;
  improvement_percent: number | null;
  protocol_phase_at_test: number | null;
  notable_interventions: string[] | null;
  notes: string | null;
  previous_measurement_id: string | null;
  created_at: string;
}

export interface AddMeasurementInput {
  test_type: LongtermBioAgeMeasurement['test_type'];
  test_provider?: string;
  test_report_url?: string;
  chronological_age_years: number;
  dunedin_pace?: number;
  horvath_clock_age?: number;
  phenoage?: number;
  grimage?: number;
  telomere_length_kb?: number;
  proxy_inputs?: LongtermBioAgeMeasurement['proxy_inputs'];
  biological_age: number;
  protocol_phase_at_test?: number;
  notable_interventions?: string[];
  notes?: string;
}

export function useLongtermBioAge() {
  const [measurements, setMeasurements] = useState<LongtermBioAgeMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMeasurements = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('longterm_bioage_tracking')
        .select('*')
        .eq('user_id', user.id)
        .order('measured_at', { ascending: false });

      if (error) throw error;

      const mapped: LongtermBioAgeMeasurement[] = (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        user_id: row.user_id as string,
        measured_at: row.measured_at as string,
        test_type: (row.test_type as LongtermBioAgeMeasurement['test_type']) || 'proxy',
        test_provider: row.test_provider as string | null,
        test_report_url: row.test_report_url as string | null,
        chronological_age_years: (row.chronological_age_years as number) || 0,
        chronological_age_months: row.chronological_age_months as number | null,
        dunedin_pace: row.dunedin_pace as number | null,
        horvath_clock_age: row.horvath_clock_age as number | null,
        hannum_clock_age: row.hannum_clock_age as number | null,
        phenoage: row.phenoage as number | null,
        grimage: row.grimage as number | null,
        telomere_length_kb: row.telomere_length_kb as number | null,
        telomere_percentile: row.telomere_percentile as number | null,
        proxy_calculated_age: row.proxy_calculated_age as number | null,
        proxy_inputs: row.proxy_inputs as LongtermBioAgeMeasurement['proxy_inputs'],
        biological_age: (row.biological_age as number) || 0,
        age_difference: (row.age_difference as number) || 0,
        aging_rate: row.aging_rate as number | null,
        change_from_previous: row.change_from_previous as number | null,
        improvement_percent: row.improvement_percent as number | null,
        protocol_phase_at_test: row.protocol_phase_at_test as number | null,
        notable_interventions: row.notable_interventions as string[] | null,
        notes: row.notes as string | null,
        previous_measurement_id: row.previous_measurement_id as string | null,
        created_at: row.created_at as string,
      }));

      setMeasurements(mapped);
    } catch (err) {
      console.error('Error fetching longterm bio-age:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addMeasurement = async (input: AddMeasurementInput): Promise<LongtermBioAgeMeasurement | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht eingeloggt");

      const previousMeasurement = measurements[0];
      
      // Calculate age difference
      const ageDifference = input.chronological_age_years - input.biological_age;
      
      // Calculate change from previous
      let changeFromPrevious: number | null = null;
      let improvementPercent: number | null = null;
      let agingRate: number | null = null;

      if (previousMeasurement) {
        changeFromPrevious = input.biological_age - previousMeasurement.biological_age;
        
        // Calculate improvement as percentage
        if (previousMeasurement.biological_age > 0) {
          improvementPercent = ((previousMeasurement.biological_age - input.biological_age) / previousMeasurement.biological_age) * 100;
        }

        // Calculate aging rate (bio-age change / chrono-age change)
        const monthsBetween = differenceInMonths(new Date(), new Date(previousMeasurement.measured_at));
        if (monthsBetween >= 6) {
          const chronoAgeChange = input.chronological_age_years - previousMeasurement.chronological_age_years;
          if (chronoAgeChange > 0) {
            agingRate = changeFromPrevious / chronoAgeChange;
          }
        }
      }

      const { data, error } = await supabase
        .from('longterm_bioage_tracking')
        .insert({
          user_id: user.id,
          measured_at: new Date().toISOString(),
          test_type: input.test_type,
          test_provider: input.test_provider,
          test_report_url: input.test_report_url,
          chronological_age_years: input.chronological_age_years,
          dunedin_pace: input.dunedin_pace,
          horvath_clock_age: input.horvath_clock_age,
          phenoage: input.phenoage,
          grimage: input.grimage,
          telomere_length_kb: input.telomere_length_kb,
          proxy_inputs: input.proxy_inputs,
          proxy_calculated_age: input.proxy_inputs ? input.biological_age : null,
          biological_age: input.biological_age,
          age_difference: ageDifference,
          aging_rate: agingRate,
          change_from_previous: changeFromPrevious,
          improvement_percent: improvementPercent,
          protocol_phase_at_test: input.protocol_phase_at_test,
          notable_interventions: input.notable_interventions,
          notes: input.notes,
          previous_measurement_id: previousMeasurement?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Messung gespeichert! 📊",
        description: `Bio-Age: ${input.biological_age} Jahre (${ageDifference >= 0 ? '+' : ''}${ageDifference.toFixed(1)} vs. Chrono)`,
      });

      await fetchMeasurements();
      return data as unknown as LongtermBioAgeMeasurement;
    } catch (err) {
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Messung konnte nicht gespeichert werden",
        variant: "destructive",
      });
      return null;
    }
  };

  const latestMeasurement = useMemo(() => measurements[0] || null, [measurements]);

  const get12MonthTrend = useCallback(() => {
    const twelveMonthsAgo = subMonths(new Date(), 12);
    return measurements.filter(m => new Date(m.measured_at) >= twelveMonthsAgo);
  }, [measurements]);

  const calculateAgingRate = useCallback((): number | null => {
    const trend = get12MonthTrend();
    if (trend.length < 2) return null;

    const oldest = trend[trend.length - 1];
    const newest = trend[0];

    const bioAgeChange = newest.biological_age - oldest.biological_age;
    const chronoAgeChange = newest.chronological_age_years - oldest.chronological_age_years;

    if (chronoAgeChange <= 0) return null;
    return bioAgeChange / chronoAgeChange;
  }, [get12MonthTrend]);

  const getAverageAgeDifference = useCallback((): number => {
    if (measurements.length === 0) return 0;
    const sum = measurements.reduce((acc, m) => acc + m.age_difference, 0);
    return sum / measurements.length;
  }, [measurements]);

  const getBestMeasurement = useCallback((): LongtermBioAgeMeasurement | null => {
    if (measurements.length === 0) return null;
    return measurements.reduce((best, current) => 
      current.age_difference > best.age_difference ? current : best
    );
  }, [measurements]);

  useEffect(() => {
    fetchMeasurements();
  }, [fetchMeasurements]);

  return {
    measurements,
    latestMeasurement,
    loading,
    addMeasurement,
    get12MonthTrend,
    calculateAgingRate,
    getAverageAgeDifference,
    getBestMeasurement,
    refetch: fetchMeasurements,
  };
}
