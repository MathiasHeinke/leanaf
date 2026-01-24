// Bloodwork Data Hook
// Handles CRUD operations and marker evaluation

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  BloodworkEntry,
  ReferenceRange,
  MarkerEvaluation,
  MarkerStatus,
  BloodworkTrend,
  MARKER_DISPLAY_NAMES,
  getAllMarkerKeys
} from '@/components/bloodwork/types';

// Markers where lower is better
const LOWER_IS_BETTER = new Set([
  'hba1c', 'fasting_glucose', 'fasting_insulin', 'homa_ir',
  'ldl', 'triglycerides', 'crp', 'homocysteine',
  'alt', 'ast', 'ggt', 'uric_acid', 'estradiol', 'prolactin'
]);

// Markers where higher is better
const HIGHER_IS_BETTER = new Set([
  'hdl', 'vitamin_d', 'vitamin_b12', 'testosterone', 'free_testosterone',
  'egfr', 'albumin'
]);

export function useBloodwork() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<BloodworkEntry[]>([]);
  const [referenceRanges, setReferenceRanges] = useState<Map<string, ReferenceRange>>(new Map());
  const [loading, setLoading] = useState(true);
  const [userGender, setUserGender] = useState<'male' | 'female'>('male');

  // Load user gender from profile
  useEffect(() => {
    async function loadGender() {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('gender')
        .eq('user_id', user.id)
        .single();
      if (data?.gender) {
        setUserGender(data.gender as 'male' | 'female');
      }
    }
    loadGender();
  }, [user?.id]);

  // Load reference ranges once
  const loadReferenceRanges = useCallback(async () => {
    const { data, error } = await supabase
      .from('bloodwork_reference_ranges')
      .select('*');

    if (error) {
      console.error('Error loading reference ranges:', error);
      return;
    }

    const rangeMap = new Map<string, ReferenceRange>();
    data?.forEach(range => {
      rangeMap.set(range.marker_name, range as ReferenceRange);
    });
    setReferenceRanges(rangeMap);
  }, []);

  // Load all entries for user
  const loadEntries = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('user_bloodwork')
      .select('*')
      .eq('user_id', user.id)
      .order('test_date', { ascending: false });

    if (error) {
      console.error('Error loading bloodwork entries:', error);
      toast.error('Fehler beim Laden der Blutwerte');
    } else {
      setEntries((data || []) as BloodworkEntry[]);
    }
    setLoading(false);
  }, [user?.id]);

  // Initial load
  useEffect(() => {
    loadReferenceRanges();
  }, [loadReferenceRanges]);

  useEffect(() => {
    if (user?.id) {
      loadEntries();
    }
  }, [user?.id, loadEntries]);

  // Create new entry
  const createEntry = async (data: Partial<BloodworkEntry>): Promise<boolean> => {
    if (!user?.id) return false;

    // Filter out empty/null values and metadata fields
    const cleanedData: Record<string, unknown> = {
      user_id: user.id,
      test_date: data.test_date || new Date().toISOString().split('T')[0],
      lab_name: data.lab_name || null,
      is_fasted: data.is_fasted || false,
      notes: data.notes || null
    };

    // Add only non-null marker values
    getAllMarkerKeys().forEach(key => {
      const value = data[key];
      if (value !== null && value !== undefined && value !== '') {
        cleanedData[key] = typeof value === 'string' ? parseFloat(value) : value;
      }
    });

    const { error } = await supabase
      .from('user_bloodwork')
      .insert(cleanedData as any);

    if (error) {
      console.error('Error creating bloodwork entry:', error);
      toast.error('Fehler beim Speichern der Blutwerte');
      return false;
    }

    toast.success('Blutwerte erfolgreich gespeichert');
    await loadEntries();
    return true;
  };

  // Update entry
  const updateEntry = async (id: string, data: Partial<BloodworkEntry>): Promise<boolean> => {
    if (!user?.id) return false;

    const { error } = await supabase
      .from('user_bloodwork')
      .update(data)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating bloodwork entry:', error);
      toast.error('Fehler beim Aktualisieren');
      return false;
    }

    toast.success('Blutwerte aktualisiert');
    await loadEntries();
    return true;
  };

  // Delete entry
  const deleteEntry = async (id: string): Promise<boolean> => {
    if (!user?.id) return false;

    const { error } = await supabase
      .from('user_bloodwork')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting bloodwork entry:', error);
      toast.error('Fehler beim Löschen');
      return false;
    }

    toast.success('Eintrag gelöscht');
    await loadEntries();
    return true;
  };

  // Evaluate single marker against reference ranges
  const evaluateMarker = useCallback((
    markerKey: string,
    value: number,
    gender: 'male' | 'female' = userGender
  ): MarkerEvaluation | null => {
    const range = referenceRanges.get(markerKey);
    if (!range) return null;

    // Get gender-specific or default ranges
    const normalMin = (gender === 'male' ? range.male_normal_min : range.female_normal_min) ?? range.normal_min;
    const normalMax = (gender === 'male' ? range.male_normal_max : range.female_normal_max) ?? range.normal_max;
    const optimalMin = (gender === 'male' ? range.male_optimal_min : range.female_optimal_min) ?? range.optimal_min;
    const optimalMax = (gender === 'male' ? range.male_optimal_max : range.female_optimal_max) ?? range.optimal_max;

    if (normalMin === null || normalMax === null) return null;

    // Determine status
    let status: MarkerStatus = 'normal';
    const hasOptimal = optimalMin !== null && optimalMax !== null;

    if (hasOptimal && value >= optimalMin! && value <= optimalMax!) {
      status = 'optimal';
    } else if (value < normalMin) {
      const borderlineThreshold = normalMin * 0.9;
      status = value >= borderlineThreshold ? 'borderline_low' : 'low';
    } else if (value > normalMax) {
      const borderlineThreshold = normalMax * 1.1;
      status = value <= borderlineThreshold ? 'borderline_high' : 'high';
    }

    // Calculate percent from optimal
    let percentFromOptimal: number | null = null;
    if (hasOptimal) {
      const optimalMid = (optimalMin! + optimalMax!) / 2;
      percentFromOptimal = ((value - optimalMid) / optimalMid) * 100;
    }

    return {
      markerName: markerKey,
      displayName: MARKER_DISPLAY_NAMES[markerKey] || markerKey,
      value,
      unit: range.unit,
      status,
      referenceRange: { min: normalMin, max: normalMax },
      optimalRange: hasOptimal ? { min: optimalMin!, max: optimalMax! } : null,
      coachingTip: range.coaching_tips,
      percentFromOptimal
    };
  }, [referenceRanges, userGender]);

  // Get all evaluations for latest entry
  const getLatestEvaluations = useCallback((): MarkerEvaluation[] => {
    if (entries.length === 0) return [];

    const latest = entries[0];
    const evaluations: MarkerEvaluation[] = [];

    getAllMarkerKeys().forEach(key => {
      const value = latest[key];
      if (typeof value === 'number' && !isNaN(value)) {
        const evaluation = evaluateMarker(key, value);
        if (evaluation) {
          evaluations.push(evaluation);
        }
      }
    });

    return evaluations;
  }, [entries, evaluateMarker]);

  // Detect trends between latest and previous entry
  const detectTrends = useCallback((): BloodworkTrend[] => {
    if (entries.length < 2) return [];

    const current = entries[0];
    const previous = entries[1];
    const trends: BloodworkTrend[] = [];

    getAllMarkerKeys().forEach(key => {
      const currentValue = current[key];
      const previousValue = previous[key];

      if (
        typeof currentValue === 'number' && !isNaN(currentValue) &&
        typeof previousValue === 'number' && !isNaN(previousValue) &&
        previousValue !== 0
      ) {
        const changePercent = ((currentValue - previousValue) / previousValue) * 100;
        
        // Only include significant changes (>5%)
        if (Math.abs(changePercent) < 5) return;

        // Determine direction based on whether higher or lower is better
        let direction: 'improving' | 'stable' | 'declining';
        if (LOWER_IS_BETTER.has(key)) {
          direction = changePercent < 0 ? 'improving' : 'declining';
        } else if (HIGHER_IS_BETTER.has(key)) {
          direction = changePercent > 0 ? 'improving' : 'declining';
        } else {
          // For neutral markers, just show direction
          direction = Math.abs(changePercent) < 5 ? 'stable' : (changePercent > 0 ? 'improving' : 'declining');
        }

        trends.push({
          markerName: key,
          displayName: MARKER_DISPLAY_NAMES[key] || key,
          direction,
          changePercent,
          previousValue,
          currentValue,
          previousDate: previous.test_date
        });
      }
    });

    // Sort by absolute change
    return trends.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  }, [entries]);

  // Count filled markers in an entry
  const countFilledMarkers = useCallback((entry: BloodworkEntry): number => {
    let count = 0;
    getAllMarkerKeys().forEach(key => {
      const value = entry[key];
      if (typeof value === 'number' && !isNaN(value)) {
        count++;
      }
    });
    return count;
  }, []);

  // Get chart data for a specific marker
  const getMarkerChartData = useCallback((markerKey: string) => {
    return entries
      .filter(entry => {
        const value = entry[markerKey];
        return typeof value === 'number' && !isNaN(value);
      })
      .map(entry => ({
        date: entry.test_date,
        value: entry[markerKey] as number,
        lab: entry.lab_name
      }))
      .reverse(); // Chronological order for charts
  }, [entries]);

  return {
    entries,
    referenceRanges,
    loading,
    userGender,
    createEntry,
    updateEntry,
    deleteEntry,
    evaluateMarker,
    getLatestEvaluations,
    detectTrends,
    countFilledMarkers,
    getMarkerChartData,
    refresh: loadEntries
  };
}
