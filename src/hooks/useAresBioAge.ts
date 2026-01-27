/**
 * useAresBioAge - ARES Bio-Age Proxy Calculation Engine
 * Calculates biological age based on 5 domains: Body, Fitness, Sleep, Nutrition, Hormones
 * Uses 28 days of tracking data for accurate assessment
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays } from 'date-fns';

// Domain weights as per ARES Bio-Age Algorithm
const DOMAIN_WEIGHTS = {
  body: 0.25,
  fitness: 0.25,
  sleep: 0.20,
  nutrition: 0.15,
  hormone: 0.15
} as const;

export interface DomainScores {
  body: number;
  fitness: number;
  sleep: number;
  nutrition: number;
  hormone: number;
}

export interface AresBioAgeResult {
  proxyBioAge: number;
  agingPace: number;
  chronoAge: number;
  totalScore: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  domainScores: DomainScores;
  dataCompleteness: number;
  hasBloodwork: boolean;
  recommendations: string[];
  loading: boolean;
  error: string | null;
}

// Helper: Calculate average
const avg = (arr: number[]): number => {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
};

// Helper: Calculate standard deviation
const stdDev = (arr: number[]): number => {
  if (arr.length < 2) return 0;
  const mean = avg(arr);
  const squareDiffs = arr.map(value => Math.pow(value - mean, 2));
  return Math.sqrt(avg(squareDiffs));
};

// Helper: Calculate linear trend (slope)
const calcTrend = (values: number[]): number => {
  if (values.length < 2) return 0;
  const n = values.length;
  const indices = values.map((_, i) => i);
  const sumX = indices.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = indices.reduce((acc, x, i) => acc + x * values[i], 0);
  const sumXX = indices.reduce((acc, x) => acc + x * x, 0);
  return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
};

// Body Composition Score (25%)
function calcBodyScore(
  weight: number | null,
  height: number | null,
  gender: string | null,
  weights: { weight: number; body_fat_percentage: number | null }[],
  measurements: { waist: number | null; hips: number | null } | null
): number {
  if (!weight || !height) return 50;

  // BMI Score (20-25 optimal)
  const bmi = weight / Math.pow(height / 100, 2);
  const bmiScore = bmi >= 20 && bmi <= 25
    ? 100
    : Math.max(0, 100 - Math.abs(bmi - 22.5) * 8);

  // Body Fat Score (gender-specific)
  let kfaScore = 50;
  const latestKfa = weights[0]?.body_fat_percentage;
  if (latestKfa) {
    const optimal = gender === 'male' ? [12, 18] : [20, 28];
    const mid = (optimal[0] + optimal[1]) / 2;
    kfaScore = latestKfa >= optimal[0] && latestKfa <= optimal[1]
      ? 100
      : Math.max(0, 100 - Math.abs(latestKfa - mid) * 5);
  }

  // WHR Score (if measurements available)
  let whrScore = 50;
  if (measurements?.waist && measurements?.hips) {
    const whr = measurements.waist / measurements.hips;
    const optimalWhr = gender === 'male' ? 0.9 : 0.85;
    whrScore = Math.max(0, 100 - Math.abs(whr - optimalWhr) * 200);
  }

  // Trend Bonus (if KFA decreasing over 28 days)
  const kfaValues = weights.filter(w => w.body_fat_percentage).map(w => w.body_fat_percentage!);
  const trendBonus = calcTrend(kfaValues) < 0 ? 10 : 0;

  return Math.min(100, bmiScore * 0.30 + kfaScore * 0.35 + whrScore * 0.25 + trendBonus);
}

// Fitness Score (25%)
function calcFitnessScore(
  trainingSessions: { training_type: string | null; total_duration_minutes: number | null }[]
): number {
  const workoutsPerWeek = trainingSessions.length / 4; // 28 days = 4 weeks

  // Consistency: 4+/week = 100
  const consistencyScore = Math.min(100, workoutsPerWeek * 25);

  // Zone 2 Cardio (cardio_zone2, cardio_liss types)
  const zone2Sessions = trainingSessions.filter(s =>
    s.training_type === 'cardio_zone2' || 
    s.training_type === 'cardio_liss' ||
    s.training_type === 'cardio'
  );
  const zone2MinutesTotal = zone2Sessions.reduce((sum, s) => sum + (s.total_duration_minutes || 0), 0);
  const zone2MinutesPerWeek = zone2MinutesTotal / 4;
  const cardioScore = Math.min(100, zone2MinutesPerWeek / 1.5); // 150min = 100

  // Strength Sessions
  const strengthTypes = ['gym', 'push', 'pull', 'legs', 'upper', 'lower', 'fullbody', 'strength'];
  const strengthSessions = trainingSessions.filter(s => strengthTypes.includes(s.training_type || ''));
  const strengthPerWeek = strengthSessions.length / 4;
  const strengthScore = Math.min(100, strengthPerWeek * 33); // 3x/week = 100

  return consistencyScore * 0.30 + cardioScore * 0.35 + strengthScore * 0.35;
}

// Sleep Score (20%)
function calcSleepScore(
  sleepEntries: { sleep_hours: number | null; sleep_quality: number | null }[]
): number {
  if (sleepEntries.length === 0) return 50; // Neutral default

  const hours = sleepEntries.filter(s => s.sleep_hours).map(s => s.sleep_hours!);
  if (hours.length === 0) return 50;

  const avgHours = avg(hours);

  // Duration Score: 7-9h = 100
  const durationScore = avgHours >= 7 && avgHours <= 9
    ? 100
    : Math.max(0, 100 - Math.abs(avgHours - 8) * 25);

  // Consistency Score: Std.Dev < 1h is good
  const sleepStdDev = stdDev(hours);
  const consistencyScore = Math.max(0, 100 - sleepStdDev * 50);

  // Quality Score: Avg of 1-5 scale → 0-100
  const qualities = sleepEntries.filter(s => s.sleep_quality).map(s => s.sleep_quality!);
  const avgQuality = qualities.length > 0 ? avg(qualities) : 3;
  const qualityScore = avgQuality * 20;

  return durationScore * 0.35 + consistencyScore * 0.25 + qualityScore * 0.40;
}

// Nutrition Score (15%)
function calcNutritionScore(
  meals: { calories: number | null; protein: number | null; date: string }[],
  weight: number | null
): number {
  if (meals.length === 0 || !weight) return 50;

  // Group meals by day
  const mealsByDay = new Map<string, typeof meals>();
  meals.forEach(meal => {
    const dateKey = meal.date;
    if (!mealsByDay.has(dateKey)) mealsByDay.set(dateKey, []);
    mealsByDay.get(dateKey)!.push(meal);
  });

  // Protein per day
  const proteinPerDay = Array.from(mealsByDay.values()).map(dayMeals =>
    dayMeals.reduce((sum, m) => sum + (m.protein || 0), 0)
  );
  const avgProtein = avg(proteinPerDay);

  // Protein Score: 1.6g/kg = 100
  const targetProtein = weight * 1.6;
  const proteinScore = avgProtein >= targetProtein
    ? 100
    : (avgProtein / targetProtein) * 100;

  // Calorie Consistency (low CV is good)
  const caloriesPerDay = Array.from(mealsByDay.values()).map(dayMeals =>
    dayMeals.reduce((sum, m) => sum + (m.calories || 0), 0)
  );
  const avgCalories = avg(caloriesPerDay);
  const calStdDev = stdDev(caloriesPerDay);
  const calCV = avgCalories > 0 ? calStdDev / avgCalories : 1;
  const consistencyScore = Math.max(0, 100 - calCV * 200); // CV 0.5 = 0

  return Math.min(100, proteinScore * 0.50 + consistencyScore * 0.50);
}

// Hormone/Energy Score (15%)
function calcHormoneScore(
  hormoneEntries: { energy_level: number | null; stress_level: number | null; libido_level: number | null }[]
): number {
  if (hormoneEntries.length === 0) return 50; // Neutral default

  const avgEnergy = avg(hormoneEntries.filter(h => h.energy_level).map(h => h.energy_level!));
  const avgStress = avg(hormoneEntries.filter(h => h.stress_level).map(h => h.stress_level!));
  const avgLibido = avg(hormoneEntries.filter(h => h.libido_level).map(h => h.libido_level!));

  // Energy: 1-10 → 0-100
  const energyScore = avgEnergy > 0 ? avgEnergy * 10 : 50;

  // Stress: Inverted (10 = 0, 1 = 100)
  const stressScore = avgStress > 0 ? (10 - avgStress) * 10 : 50;

  // Libido: 1-10 → 0-100
  const libidoScore = avgLibido > 0 ? avgLibido * 10 : 50;

  return energyScore * 0.40 + stressScore * 0.30 + libidoScore * 0.30;
}

// PhenoAge Proxy (from bloodwork)
function calcPhenoAgeScore(
  bloodwork: {
    albumin?: number | null;
    creatinine?: number | null;
    hs_crp?: number | null;
    fasting_glucose?: number | null;
    wbc?: number | null;
  } | null
): number | null {
  if (!bloodwork) return null;

  // Count available markers
  const markers = [
    bloodwork.albumin,
    bloodwork.creatinine,
    bloodwork.hs_crp,
    bloodwork.fasting_glucose,
    bloodwork.wbc
  ].filter(m => m !== null && m !== undefined);

  if (markers.length < 3) return null;

  // Simplified PhenoAge scoring (higher is better)
  let score = 50;

  // Albumin (optimal: 4.0-5.0 g/dL)
  if (bloodwork.albumin) {
    score += bloodwork.albumin >= 4.0 && bloodwork.albumin <= 5.0 ? 10 : -5;
  }

  // Creatinine (optimal: 0.7-1.3 mg/dL)
  if (bloodwork.creatinine) {
    score += bloodwork.creatinine >= 0.7 && bloodwork.creatinine <= 1.3 ? 10 : -5;
  }

  // hsCRP (optimal: <1.0 mg/L)
  if (bloodwork.hs_crp) {
    score += bloodwork.hs_crp < 1.0 ? 15 : bloodwork.hs_crp < 3.0 ? 5 : -10;
  }

  // Fasting Glucose (optimal: 70-100 mg/dL)
  if (bloodwork.fasting_glucose) {
    score += bloodwork.fasting_glucose >= 70 && bloodwork.fasting_glucose <= 100 ? 10 : -5;
  }

  // WBC (optimal: 4.5-11.0 k/µL)
  if (bloodwork.wbc) {
    score += bloodwork.wbc >= 4.5 && bloodwork.wbc <= 11.0 ? 5 : -5;
  }

  return Math.max(0, Math.min(100, score));
}

// Recommendation Generator
function generateRecommendations(domainScores: DomainScores): string[] {
  const recommendations: string[] = [];
  const sorted = Object.entries(domainScores).sort(([, a], [, b]) => a - b);

  // Get weakest 2 domains
  sorted.slice(0, 2).forEach(([domain, score]) => {
    if (score >= 80) return; // Already good

    switch (domain) {
      case 'sleep':
        if (score < 70) recommendations.push('Schlafzeit auf 7-9h optimieren');
        else recommendations.push('Schlafkonsistenz verbessern');
        break;
      case 'fitness':
        if (score < 60) recommendations.push('Trainingsfrequenz auf 4x/Woche erhöhen');
        else recommendations.push('Zone 2 Cardio auf 150min/Woche steigern');
        break;
      case 'body':
        if (score < 60) recommendations.push('Körperfettanteil reduzieren');
        else recommendations.push('Körperkomposition weiter optimieren');
        break;
      case 'nutrition':
        if (score < 60) recommendations.push('Proteinzufuhr auf 1.6g/kg erhöhen');
        else recommendations.push('Kalorienbalance stabilisieren');
        break;
      case 'hormone':
        if (score < 60) recommendations.push('Stress-Management priorisieren');
        else recommendations.push('Hormon-Tracking regelmäßiger nutzen');
        break;
    }
  });

  return recommendations.slice(0, 3);
}

// Calculate Confidence Level
function calcConfidence(
  dataCompleteness: number,
  hasBloodwork: boolean
): 'low' | 'medium' | 'high' {
  if (hasBloodwork && dataCompleteness > 0.7) return 'high';
  if (dataCompleteness > 0.5) return 'medium';
  return 'low';
}

export function useAresBioAge(): AresBioAgeResult {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    profile: { age: number; gender: string | null; weight: number; height: number } | null;
    weights: { weight: number; body_fat_percentage: number | null }[];
    measurements: { waist: number | null; hips: number | null } | null;
    training: { training_type: string | null; total_duration_minutes: number | null }[];
    sleep: { sleep_hours: number | null; sleep_quality: number | null }[];
    meals: { calories: number | null; protein: number | null; date: string }[];
    hormones: { energy_level: number | null; stress_level: number | null; libido_level: number | null }[];
    bloodwork: any | null;
  } | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const today = new Date();
      const past28Days = format(subDays(today, 28), 'yyyy-MM-dd');

      // Parallel data fetching
      const [
        profileResult,
        weightsResult,
        measurementsResult,
        trainingResult,
        sleepResult,
        mealsResult,
        hormonesResult,
        bloodworkResult
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('age, gender, weight, height')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('weight_history')
          .select('weight, body_fat_percentage')
          .eq('user_id', user.id)
          .gte('date', past28Days)
          .order('date', { ascending: false }),
        supabase
          .from('body_measurements')
          .select('waist, hips')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('training_sessions')
          .select('training_type, total_duration_minutes')
          .eq('user_id', user.id)
          .gte('session_date', past28Days),
        supabase
          .from('sleep_tracking')
          .select('sleep_hours, sleep_quality')
          .eq('user_id', user.id)
          .gte('date', past28Days),
        supabase
          .from('meals')
          .select('calories, protein, date')
          .eq('user_id', user.id)
          .gte('date', past28Days),
        supabase
          .from('hormone_tracking')
          .select('energy_level, stress_level, libido_level')
          .eq('user_id', user.id)
          .gte('date', past28Days),
        supabase
          .from('user_bloodwork')
          .select('albumin, creatinine, hs_crp, fasting_glucose, wbc')
          .eq('user_id', user.id)
          .order('test_date', { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      setData({
        profile: profileResult.data as any,
        weights: (weightsResult.data || []) as any[],
        measurements: measurementsResult.data as any,
        training: (trainingResult.data || []) as any[],
        sleep: (sleepResult.data || []) as any[],
        meals: (mealsResult.data || []) as any[],
        hormones: (hormonesResult.data || []) as any[],
        bloodwork: bloodworkResult.data
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate all scores
  const result = useMemo((): AresBioAgeResult => {
    if (!data || !data.profile) {
      return {
        proxyBioAge: 0,
        agingPace: 1.0,
        chronoAge: 0,
        totalScore: 50,
        confidenceLevel: 'low',
        domainScores: { body: 50, fitness: 50, sleep: 50, nutrition: 50, hormone: 50 },
        dataCompleteness: 0,
        hasBloodwork: false,
        recommendations: [],
        loading,
        error
      };
    }

    const { profile, weights, measurements, training, sleep, meals, hormones, bloodwork } = data;
    const chronoAge = profile.age || 30;

    // Calculate domain scores
    const domainScores: DomainScores = {
      body: calcBodyScore(profile.weight, profile.height, profile.gender, weights, measurements),
      fitness: calcFitnessScore(training),
      sleep: calcSleepScore(sleep),
      nutrition: calcNutritionScore(meals, profile.weight),
      hormone: calcHormoneScore(hormones)
    };

    // Calculate total weighted score
    let totalScore = Object.entries(domainScores).reduce(
      (sum, [domain, score]) => sum + score * DOMAIN_WEIGHTS[domain as keyof typeof DOMAIN_WEIGHTS],
      0
    );

    // PhenoAge integration (if bloodwork available)
    const phenoScore = calcPhenoAgeScore(bloodwork);
    const hasBloodwork = phenoScore !== null;
    
    if (phenoScore !== null) {
      // Blend: 60% Behavior + 40% Blood
      totalScore = totalScore * 0.60 + phenoScore * 0.40;
    }

    // Calculate Bio-Age: Score 100 = 10 years younger
    const proxyBioAge = Math.round((chronoAge - ((totalScore - 50) / 5)) * 10) / 10;

    // Calculate Aging Pace: Score 100 = 0.75, Score 0 = 1.25
    const agingPace = Math.round((1.0 - ((totalScore - 50) / 200)) * 100) / 100;

    // Data completeness (0-1)
    const completenessFactors = [
      weights.length > 0 ? 1 : 0,
      training.length > 0 ? 1 : 0,
      sleep.length > 0 ? 1 : 0,
      meals.length > 0 ? 1 : 0,
      hormones.length > 0 ? 1 : 0
    ];
    const dataCompleteness = avg(completenessFactors);

    const confidenceLevel = calcConfidence(dataCompleteness, hasBloodwork);
    const recommendations = generateRecommendations(domainScores);

    return {
      proxyBioAge,
      agingPace,
      chronoAge,
      totalScore: Math.round(totalScore),
      confidenceLevel,
      domainScores,
      dataCompleteness,
      hasBloodwork,
      recommendations,
      loading,
      error
    };
  }, [data, loading, error]);

  return result;
}
