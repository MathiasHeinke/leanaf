import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { dataLogger } from '@/utils/dataLogger';

interface DailySummaryData {
  date: string;
  displayDate: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  workoutVolume: number;
  workoutMuscleGroups: string[];
  sleepScore: number;
  hydrationScore: number;
  topFoods: any[];
  macroDistribution: {
    protein: number;
    carbs: number;
    fats: number;
  };
  recoveryMetrics: any;
  rawData?: any;
}

export interface DailySummaryHookReturn {
  data: DailySummaryData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useDailySummaryData = (timeRange: 7 | 14 | 30 = 14): DailySummaryHookReturn => {
  const { user } = useAuth();
  const [data, setData] = useState<DailySummaryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const parseStructuredData = (summary: any): DailySummaryData => {
    const structJson = summary.summary_struct_json || {};
    
    // Handle multiple JSON structure formats with improved fallbacks
    const kpis = structJson.kpis || structJson;
    const nutrition = kpis.nutrition || structJson.nutrition || {};
    const training = kpis.training || structJson.training || {};
    const recovery = kpis.recovery || structJson.recovery || {};
    const hydration = kpis.hydration || structJson.hydration || {};

    console.log('🔍 Daily Summary Data for', summary.date, {
      summary,
      structJson,
      nutrition,
      training,
      recovery,
      hydration
    });

    // Format date for display
    const date = new Date(summary.date);
    const displayDate = date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit'
    });

    const result = {
      date: summary.date,
      displayDate,
      // Multi-layer fallbacks for nutrition data
      totalCalories: nutrition.totals?.kcal || nutrition.totals?.calories || nutrition.kcal || summary.total_calories || 0,
      totalProtein: nutrition.totals?.protein_g || nutrition.totals?.protein || nutrition.protein || summary.total_protein || 0,
      totalCarbs: nutrition.totals?.carbs_g || nutrition.totals?.carbs || nutrition.carbs || summary.total_carbs || 0,
      totalFats: nutrition.totals?.fat_g || nutrition.totals?.fats || nutrition.fats || summary.total_fats || 0,
      // Improved workout volume with NULL safety
      workoutVolume: training.volume_kg !== null ? training.volume_kg : (training.volume || summary.workout_volume || 0),
      workoutMuscleGroups: training.muscle_groups || summary.workout_muscle_groups || [],
      // Improved sleep and hydration score extraction
      sleepScore: recovery.sleep_score || recovery.quality_score || summary.sleep_score || 0,
      hydrationScore: hydration.hydration_score || hydration.score || hydration.quality_score || summary.hydration_score || 0,
      topFoods: nutrition.top_foods || summary.top_foods || [],
      macroDistribution: {
        protein: nutrition.macro_pct?.protein_percent || nutrition.distribution?.protein || nutrition.protein_percent || 0,
        carbs: nutrition.macro_pct?.carbs_percent || nutrition.distribution?.carbs || nutrition.carbs_percent || 0,
        fats: nutrition.macro_pct?.fats_percent || nutrition.distribution?.fats || nutrition.fats_percent || 0
      },
      recoveryMetrics: summary.recovery_metrics || {},
      rawData: structJson
    };

    console.log('📊 Parsed result:', result);
    return result;
  };

  const fetchData = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    const operationId = dataLogger.startOperation('FETCH_DAILY_SUMMARIES', 'daily_summaries', {
      user_id: user.id,
      time_range: timeRange
    });

    try {
      // Get daily summaries for the specified time range
      const { data: summaries, error: fetchError } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (fetchError) {
        dataLogger.errorOperation(operationId, fetchError);
        throw fetchError;
      }

      if (!summaries || summaries.length === 0) {
        dataLogger.completeOperation(operationId, { count: 0 });
        setData([]);
        return;
      }

      // Parse structured data from summaries
      const parsedData = summaries
        .filter(summary => summary.summary_struct_json || summary.total_calories > 0) // Only include summaries with data
        .map(parseStructuredData)
        .reverse(); // Show chronologically (oldest first for charts)

      dataLogger.completeOperation(operationId, { count: parsedData.length });
      setData(parsedData);
    } catch (err) {
      console.error('Error fetching daily summary data:', err);
      dataLogger.errorOperation(operationId, err);
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id, timeRange]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
};
