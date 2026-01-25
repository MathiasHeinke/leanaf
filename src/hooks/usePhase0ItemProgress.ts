import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Phase0Checklist } from '@/hooks/useProtocolStatus';

export interface SubItem {
  label: string;
  completed: boolean;
  explanation?: string;
}

export interface ItemProgress {
  key: keyof Phase0Checklist;
  progress: number; // 0-100
  current: string;
  target: string;
  status: 'not_started' | 'in_progress' | 'completed';
  subItems?: SubItem[];
  stats?: {
    daysTracked?: number;
    daysRequired?: number;
    average?: number;
    targetValue?: number;
    trend?: 'up' | 'down' | 'stable';
    markersPresent?: string[];
    markersRequired?: number;
    measurements?: number;
    measurementsRequired?: number;
  };
  explanation: string;
  actionLabel?: string;
  actionHref?: string;
}

const REQUIRED_MARKERS = [
  { key: 'total_testosterone', label: 'Testosteron' },
  { key: 'estradiol', label: 'Estradiol (E2)' },
  { key: 'hba1c', label: 'HbA1c' },
  { key: 'hscrp', label: 'hsCRP' },
  { key: 'ast', label: 'AST' },
  { key: 'alt', label: 'ALT' },
  { key: 'ggt', label: 'GGT' },
  { key: 'creatinine', label: 'Kreatinin' },
  { key: 'hematocrit', label: 'Hämatokrit' },
];

export function usePhase0ItemProgress(checklist: Phase0Checklist | null) {
  const { user } = useAuth();
  const [itemProgress, setItemProgress] = useState<Record<keyof Phase0Checklist, ItemProgress | null>>({
    toxin_free: null,
    sleep_score: null,
    bio_sanierung: null,
    psycho_hygiene: null,
    digital_hygiene: null,
    protein_training: null,
    kfa_trend: null,
    bloodwork_baseline: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!user?.id || !checklist) return;

    setLoading(true);

    try {
      // Fetch all data in parallel
      const [sleepResult, bloodworkResult, weightResult, mealsResult, trainingResult] = await Promise.all([
        // Sleep data (last 14 days)
        (supabase as any)
          .from('sleep_tracking')
          .select('date, sleep_hours')
          .eq('user_id', user.id)
          .gte('date', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order('date', { ascending: false }),
        
        // Bloodwork (last 90 days)
        supabase
          .from('user_bloodwork')
          .select('*')
          .eq('user_id', user.id)
          .gte('test_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order('test_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        
        // Weight/KFA data
        (supabase as any)
          .from('weight_history')
          .select('date, weight, body_fat_percentage')
          .eq('user_id', user.id)
          .not('body_fat_percentage', 'is', null)
          .order('date', { ascending: false })
          .limit(10),
        
        // Meals for protein (last 7 days avg)
        (supabase as any)
          .from('meals')
          .select('protein')
          .eq('user_id', user.id)
          .gte('eaten_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        
        // Training sessions (last 7 days)
        (supabase as any)
          .from('training_sessions')
          .select('training_type, duration_minutes')
          .eq('user_id', user.id)
          .gte('session_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
      ]);

      const sleepData = sleepResult.data || [];
      const bloodwork = bloodworkResult.data;
      const weightData = weightResult.data || [];
      const mealsData = mealsResult.data || [];
      const trainingData = trainingResult.data || [];

      // === SLEEP SCORE ===
      const sleepDaysTracked = sleepData.length;
      const sleepAvg = sleepDaysTracked > 0 
        ? sleepData.reduce((acc: number, d: any) => acc + (d.sleep_hours || 0), 0) / sleepDaysTracked 
        : 0;
      const sleepProgress = Math.min(100, Math.round((sleepDaysTracked / 7) * 50 + (sleepAvg >= 7.5 ? 50 : (sleepAvg / 7.5) * 50)));
      
      const sleepItem: ItemProgress = {
        key: 'sleep_score',
        progress: checklist.sleep_score.completed ? 100 : sleepProgress,
        current: sleepAvg > 0 ? `Ø ${sleepAvg.toFixed(1)}h` : 'Keine Daten',
        target: '≥7.5h',
        status: checklist.sleep_score.completed ? 'completed' : sleepDaysTracked > 0 ? 'in_progress' : 'not_started',
        stats: {
          daysTracked: sleepDaysTracked,
          daysRequired: 7,
          average: Math.round(sleepAvg * 10) / 10,
          targetValue: 7.5,
        },
        explanation: 'Tracke mindestens 7 Nächte in den letzten 14 Tagen. Dein Durchschnitt muss ≥7.5h sein.',
        actionLabel: 'Schlaf eintragen',
        actionHref: '/tracking',
      };

      // === BLOODWORK BASELINE ===
      const presentMarkers = bloodwork 
        ? REQUIRED_MARKERS.filter(m => (bloodwork as any)[m.key] !== null && (bloodwork as any)[m.key] !== undefined)
        : [];
      const bloodworkProgress = Math.min(100, Math.round((presentMarkers.length / 6) * 100));
      
      const bloodworkItem: ItemProgress = {
        key: 'bloodwork_baseline',
        progress: checklist.bloodwork_baseline.completed ? 100 : bloodworkProgress,
        current: `${presentMarkers.length}/9 Marker`,
        target: '≥6 Marker',
        status: checklist.bloodwork_baseline.completed ? 'completed' : presentMarkers.length > 0 ? 'in_progress' : 'not_started',
        stats: {
          markersPresent: presentMarkers.map(m => m.key),
          markersRequired: 6,
        },
        subItems: REQUIRED_MARKERS.map(m => ({
          label: m.label,
          completed: presentMarkers.some(p => p.key === m.key),
        })),
        explanation: 'Erfasse mindestens 6 der 9 wichtigen Marker aus einem Bluttest der letzten 90 Tage.',
        actionLabel: 'Blutwerte eintragen',
        actionHref: '/bloodwork',
      };

      // === KFA TREND ===
      const kfaMeasurements = weightData.length;
      const latestKfa = weightData[0]?.body_fat_percentage;
      const oldestKfa = weightData[kfaMeasurements - 1]?.body_fat_percentage;
      const kfaTrend = kfaMeasurements >= 2 && latestKfa && oldestKfa 
        ? (latestKfa < oldestKfa ? 'down' : latestKfa > oldestKfa ? 'up' : 'stable')
        : undefined;
      const kfaProgress = Math.min(100, 
        (kfaMeasurements >= 2 ? 50 : (kfaMeasurements / 2) * 50) + 
        (kfaTrend === 'down' ? 50 : 0)
      );

      const kfaItem: ItemProgress = {
        key: 'kfa_trend',
        progress: checklist.kfa_trend.completed ? 100 : kfaProgress,
        current: latestKfa ? `${latestKfa.toFixed(1)}%` : 'Keine Daten',
        target: '<20% & fallend',
        status: checklist.kfa_trend.completed ? 'completed' : kfaMeasurements > 0 ? 'in_progress' : 'not_started',
        stats: {
          measurements: kfaMeasurements,
          measurementsRequired: 2,
          trend: kfaTrend,
        },
        explanation: 'Trage mindestens 2 Körperfett-Messungen ein. Der Trend muss fallend sein.',
        actionLabel: 'Gewicht eintragen',
        actionHref: '/body',
      };

      // === PROTEIN & TRAINING ===
      const totalProtein = mealsData.reduce((acc: number, m: any) => acc + (m.protein || 0), 0);
      const avgDailyProtein = mealsData.length > 0 ? totalProtein / 7 : 0; // Rough daily avg
      const zone2Minutes = trainingData
        .filter((t: any) => t.training_type === 'zone2')
        .reduce((acc: number, t: any) => acc + (t.duration_minutes || 0), 0);
      
      const proteinTarget = 150; // Assuming ~80kg, 1.8g/kg
      const zone2Target = 180;
      const proteinProgress = Math.min(100, Math.round((avgDailyProtein / proteinTarget) * 50));
      const zone2Progress = Math.min(100, Math.round((zone2Minutes / zone2Target) * 50));
      const combinedProgress = proteinProgress + zone2Progress;

      const proteinTrainingItem: ItemProgress = {
        key: 'protein_training',
        progress: checklist.protein_training.completed ? 100 : combinedProgress,
        current: `${Math.round(avgDailyProtein)}g / ${zone2Minutes}min`,
        target: '150g+ / 180min+',
        status: checklist.protein_training.completed ? 'completed' : (avgDailyProtein > 0 || zone2Minutes > 0) ? 'in_progress' : 'not_started',
        stats: {
          average: Math.round(avgDailyProtein),
          targetValue: proteinTarget,
        },
        subItems: [
          { label: `Protein: Ø ${Math.round(avgDailyProtein)}g/Tag`, completed: avgDailyProtein >= proteinTarget, explanation: `Ziel: ≥${proteinTarget}g` },
          { label: `Zone 2: ${zone2Minutes} Min/Woche`, completed: zone2Minutes >= zone2Target, explanation: `Ziel: ≥${zone2Target} Min` },
        ],
        explanation: 'Erreiche ≥1.8g Protein pro kg Körpergewicht UND ≥180 Min Zone 2 Cardio pro Woche.',
        actionLabel: 'Tracking öffnen',
        actionHref: '/nutrition',
      };

      // === MANUAL ITEMS ===
      const createManualItem = (
        key: keyof Phase0Checklist,
        subChecks: { label: string; explanation?: string }[],
        explanation: string
      ): ItemProgress => {
        const isCompleted = checklist[key].completed;
        return {
          key,
          progress: isCompleted ? 100 : 0,
          current: isCompleted ? 'Bestätigt' : 'Offen',
          target: 'Alle Punkte',
          status: isCompleted ? 'completed' : 'not_started',
          subItems: subChecks.map(s => ({ ...s, completed: isCompleted })),
          explanation,
        };
      };

      const toxinFreeItem = createManualItem('toxin_free', [
        { label: 'Nicht rauchen (auch kein Vaping)', explanation: 'Kein Nikotin in jeglicher Form' },
        { label: 'Max 1-2 Drinks/Woche', explanation: 'Alkohol minimieren, idealerweise null' },
        { label: 'Kein Teflon/Plastik beim Kochen', explanation: 'Edelstahl, Gusseisen, Glas nutzen' },
      ], 'Eliminiere alle bekannten Toxine aus deinem Alltag. Diese Punkte sind wissenschaftlich belegt und nicht verhandelbar.');

      const bioSanierungItem = createManualItem('bio_sanierung', [
        { label: 'Zähne saniert', explanation: 'Kein Karies, keine versteckten Entzündungen' },
        { label: 'Kein Amalgam', explanation: 'Alte Füllungen durch moderne ersetzen' },
        { label: 'Clean Beauty Produkte', explanation: 'Ohne Parabene, Phthalate, Duftstoffe' },
      ], 'Körperliche Altlasten beseitigen. Chronische Entzündungen im Mundraum blockieren Regeneration.');

      const psychoHygieneItem = createManualItem('psycho_hygiene', [
        { label: 'Stabiles Umfeld (Safe Haven)', explanation: 'Rückzugsort ohne Stress' },
        { label: 'Keine toxischen Beziehungen', explanation: 'Energievampire eliminieren' },
        { label: 'Täglicher Stress-Ausgleich', explanation: 'Meditation, Natur, Sport' },
      ], 'Chronischer psychischer Stress zerstört Testosteron und Regeneration. Umfeld optimieren.');

      const digitalHygieneItem = createManualItem('digital_hygiene', [
        { label: 'Handy nicht im Schlafzimmer', explanation: 'Kein Blaulicht vor dem Schlafen' },
        { label: 'Max 30 Min Social Media/Tag', explanation: 'Dopamin-Detox für Fokus' },
        { label: 'Blaufilter abends aktiv', explanation: 'Night Shift / f.lux nach 20 Uhr' },
      ], 'Digitale Stimulation zerstört Schlafqualität und Aufmerksamkeit. Strikte Grenzen setzen.');

      setItemProgress({
        toxin_free: toxinFreeItem,
        sleep_score: sleepItem,
        bio_sanierung: bioSanierungItem,
        psycho_hygiene: psychoHygieneItem,
        digital_hygiene: digitalHygieneItem,
        protein_training: proteinTrainingItem,
        kfa_trend: kfaItem,
        bloodwork_baseline: bloodworkItem,
      });

    } catch (err) {
      console.error('Error fetching phase 0 progress:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, checklist]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return { itemProgress, loading, refetch: fetchProgress };
}
