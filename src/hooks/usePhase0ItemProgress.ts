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
  progress: number;
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
  { key: 'ast', label: 'AST (GOT)' },
  { key: 'alt', label: 'ALT (GPT)' },
  { key: 'ggt', label: 'GGT' },
  { key: 'creatinine', label: 'Kreatinin' },
  { key: 'hematocrit', label: 'Hämatokrit' },
];

export function usePhase0ItemProgress(checklist: Phase0Checklist | null) {
  const { user } = useAuth();
  const [itemProgress, setItemProgress] = useState<Record<string, ItemProgress>>({});
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Fetch all data in parallel
      const [sleepResult, bloodworkResult, weightWithKfaResult, mealsResult, trainingResult, latestWeightResult] = await Promise.all([
        // Sleep data (last 14 days)
        (supabase as any)
          .from('sleep_tracking')
          .select('sleep_hours, date')
          .eq('user_id', user.id)
          .gte('date', fourteenDaysAgo)
          .order('date', { ascending: false }),
        
        // Latest bloodwork (last 90 days)
        supabase
          .from('user_bloodwork')
          .select('*')
          .eq('user_id', user.id)
          .gte('test_date', ninetyDaysAgo)
          .order('test_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        
        // Weight with KFA for trend
        (supabase as any)
          .from('weight_history')
          .select('weight, body_fat_percentage, date')
          .eq('user_id', user.id)
          .not('body_fat_percentage', 'is', null)
          .order('date', { ascending: false })
          .limit(5),
        
        // Meals for protein tracking (last 7 days)
        (supabase as any)
          .from('food_journal_entries')
          .select('protein, created_at')
          .eq('user_id', user.id)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        
        // Training for Zone 2 (last 7 days)
        (supabase as any)
          .from('workout_sessions')
          .select('duration, workout_type, cardio_type, created_at')
          .eq('user_id', user.id)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

        // Latest weight for protein calculation
        (supabase as any)
          .from('weight_history')
          .select('weight')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const progress: Record<string, ItemProgress> = {};
      const userWeight = latestWeightResult.data?.weight as number | null;

      // === SLEEP SCORE ===
      const sleepData = sleepResult.data || [];
      const sleepDaysTracked = sleepData.length;
      const sleepAvg = sleepDaysTracked > 0 
        ? sleepData.reduce((acc: number, d: any) => acc + (d.sleep_hours || 0), 0) / sleepDaysTracked 
        : 0;
      
      const sleepTarget = 7; // 7h target
      const sleepProgress = Math.min(100, Math.round(
        (sleepDaysTracked / 7) * 50 + (sleepAvg >= sleepTarget ? 50 : (sleepAvg / sleepTarget) * 50)
      ));

      progress.sleep_score = {
        key: 'sleep_score',
        progress: sleepProgress,
        current: sleepDaysTracked > 0 ? `Ø ${sleepAvg.toFixed(1)}h` : 'Keine Daten',
        target: `≥${sleepTarget}h`,
        status: sleepProgress >= 100 ? 'completed' : sleepProgress > 0 ? 'in_progress' : 'not_started',
        stats: {
          daysTracked: sleepDaysTracked,
          daysRequired: 7,
          average: Math.round(sleepAvg * 10) / 10,
          targetValue: sleepTarget,
        },
        explanation: `Tracke mindestens 7 Tage deinen Schlaf mit einem Durchschnitt von ≥${sleepTarget}h. Guter Schlaf ist das Fundament für Regeneration, Hormonproduktion und mentale Klarheit.`,
        actionLabel: 'Schlaf eintragen',
        actionHref: '/sleep',
      };

      // === BLOODWORK BASELINE ===
      const bloodwork = bloodworkResult.data;
      const presentMarkers = bloodwork 
        ? REQUIRED_MARKERS.filter(m => {
            const value = (bloodwork as any)[m.key];
            return value !== null && value !== undefined;
          })
        : [];
      
      const bloodworkProgress = Math.min(100, Math.round((presentMarkers.length / 6) * 100));

      progress.bloodwork_baseline = {
        key: 'bloodwork_baseline',
        progress: bloodworkProgress,
        current: `${presentMarkers.length}/6 Marker`,
        target: '≥6 Marker',
        status: presentMarkers.length >= 6 ? 'completed' : presentMarkers.length > 0 ? 'in_progress' : 'not_started',
        stats: {
          markersPresent: presentMarkers.map(m => m.label),
          markersRequired: 6,
        },
        subItems: REQUIRED_MARKERS.slice(0, 6).map(m => ({
          label: m.label,
          completed: presentMarkers.some(p => p.key === m.key),
        })),
        explanation: 'Lade deine Blutwerte hoch. Mindestens 6 der wichtigsten Marker müssen vorhanden sein: Testosteron, E2, HbA1c, hsCRP, Leberwerte, Kreatinin.',
        actionLabel: 'Blutwerte hochladen',
        actionHref: '/bloodwork',
      };

      // === KFA TREND ===
      const kfaData = weightWithKfaResult.data || [];
      const kfaMeasurements = kfaData.length;
      const latestKfa = kfaData[0]?.body_fat_percentage;
      const oldestKfa = kfaData[kfaMeasurements - 1]?.body_fat_percentage;
      
      let kfaTrend: 'up' | 'down' | 'stable' = 'stable';
      if (kfaMeasurements >= 2 && latestKfa && oldestKfa) {
        kfaTrend = latestKfa < oldestKfa ? 'down' : latestKfa > oldestKfa ? 'up' : 'stable';
      }
      
      const kfaProgress = kfaMeasurements === 0 
        ? 0 
        : kfaMeasurements >= 2 && kfaTrend === 'down' 
          ? 100 
          : Math.min(80, kfaMeasurements * 40);

      progress.kfa_trend = {
        key: 'kfa_trend',
        progress: kfaProgress,
        current: kfaMeasurements > 0 
          ? `${latestKfa?.toFixed(1)}% KFA` 
          : '⚠️ KFA fehlt',
        target: 'Fallend',
        status: kfaProgress >= 100 ? 'completed' : kfaMeasurements > 0 ? 'in_progress' : 'not_started',
        stats: {
          measurements: kfaMeasurements,
          measurementsRequired: 2,
          trend: kfaTrend,
        },
        explanation: kfaMeasurements === 0 
          ? 'Bitte trage zuerst deinen Körperfettanteil (KFA) ein. Mindestens 2 Messungen werden benötigt um einen Trend zu erkennen.'
          : 'Dein Körperfettanteil muss einen fallenden Trend zeigen. Mindestens 2 Messungen sind erforderlich.',
        actionLabel: kfaMeasurements === 0 ? 'KFA eintragen' : 'Messung hinzufügen',
        actionHref: '/body',
      };

      // === PROTEIN & TRAINING ===
      const mealData = mealsResult.data || [];
      const totalProtein = mealData.reduce((acc: number, m: any) => acc + (m.protein || 0), 0);
      const mealDays = new Set(mealData.map((m: any) => new Date(m.created_at).toDateString())).size;
      const avgDailyProtein = mealDays > 0 ? totalProtein / mealDays : 0;
      
      const trainingData = trainingResult.data || [];
      const zone2Minutes = trainingData
        .filter((t: any) => t.workout_type === 'cardio' || t.cardio_type)
        .reduce((acc: number, t: any) => acc + (t.duration || 0), 0);

      // Dynamic protein target based on user weight (1.2g/kg)
      const proteinTarget = userWeight ? Math.round(userWeight * 1.2) : null;
      const zone2Target = 150;

      const proteinMet = proteinTarget ? avgDailyProtein >= proteinTarget : false;
      const zone2Met = zone2Minutes >= zone2Target;
      const proteinTrainingProgress = !userWeight 
        ? 0 
        : Math.min(100, (proteinMet ? 50 : (avgDailyProtein / proteinTarget!) * 50) + (zone2Met ? 50 : (zone2Minutes / zone2Target) * 50));

      progress.protein_training = {
        key: 'protein_training',
        progress: Math.round(proteinTrainingProgress),
        current: userWeight 
          ? `${Math.round(avgDailyProtein)}g / ${zone2Minutes}min` 
          : '⚠️ Gewicht fehlt',
        target: userWeight 
          ? `≥${proteinTarget}g / ≥${zone2Target}min` 
          : 'Gewicht eintragen',
        status: proteinTrainingProgress >= 100 ? 'completed' : proteinTrainingProgress > 0 ? 'in_progress' : 'not_started',
        subItems: userWeight ? [
          { 
            label: `Protein: Ø ${Math.round(avgDailyProtein)}g/Tag`, 
            completed: proteinMet, 
            explanation: `Ziel: ≥${proteinTarget}g pro Tag (1.2g × ${userWeight}kg)` 
          },
          { 
            label: `Zone 2: ${zone2Minutes} Min/Woche`, 
            completed: zone2Met, 
            explanation: `Lockeres Cardio bei dem du dich noch unterhalten kannst - Ziel: ≥${zone2Target} Min` 
          },
        ] : undefined,
        explanation: userWeight 
          ? `Erreiche ≥${proteinTarget}g Protein pro Tag (1.2g × ${userWeight}kg) UND ≥${zone2Target} Min Zone 2 Cardio pro Woche. Zone 2 = lockeres Ausdauertraining (60-70% max. Herzfrequenz) bei dem du dich noch unterhalten kannst - z.B. zügiges Gehen, lockeres Radfahren.`
          : 'Bitte trage zuerst dein Gewicht ein, um dein persönliches Proteinziel zu berechnen.',
        actionLabel: userWeight ? 'Mahlzeit eintragen' : 'Gewicht eintragen',
        actionHref: userWeight ? '/coach' : '/body',
      };

      // === MANUAL ITEMS (no action buttons) ===
      const createManualItem = (
        key: keyof Phase0Checklist, 
        subItems: SubItem[],
        explanation: string
      ): ItemProgress => {
        const allCompleted = checklist?.[key]?.completed ?? false;
        return {
          key,
          progress: allCompleted ? 100 : 0,
          current: allCompleted ? 'Bestätigt' : 'Offen',
          target: 'Bestätigt',
          status: allCompleted ? 'completed' : 'not_started',
          subItems,
          explanation,
          // No actionLabel or actionHref for manual items
        };
      };

      progress.toxin_free = createManualItem('toxin_free', [
        { label: 'Kein Rauchen', completed: false, explanation: 'Keine Zigaretten, keine Vapes' },
        { label: 'Alkohol 0 (max. 2×/Jahr)', completed: false, explanation: 'Nur Hochzeit/Silvester' },
        { label: 'Kein Plastik/Teflon bei Essen', completed: false, explanation: 'Glas/Edelstahl statt Plastik' },
        { label: 'Regelmäßig Sauna (≥80°C)', completed: false, explanation: '4-7×/Woche – Heat Shock Proteins, -40% Mortalität' },
      ], 'Entferne aktiv Toxine aus deinem Leben. Sauna ≥80°C aktiviert Heat Shock Proteins und senkt Mortalität um 40% (Kuopio-Studie).');

      progress.bio_sanierung = createManualItem('bio_sanierung', [
        { label: 'Zähne saniert', completed: false, explanation: 'Keine offenen Baustellen im Mund' },
        { label: 'Amalgam entfernt (falls vorhanden)', completed: false, explanation: 'Sicher durch Spezialisten' },
        { label: 'Clean Beauty', completed: false, explanation: 'Keine hormonaktiven Stoffe in Kosmetik' },
      ], 'Saniere deinen Körper von innen. Amalgam, chronische Entzündungen und EDCs (endokrine Disruptoren) belasten dein System.');

      progress.psycho_hygiene = createManualItem('psycho_hygiene', [
        { label: 'Safe Haven etabliert', completed: false, explanation: 'Ein Ort wo du dich sicher fühlst' },
        { label: 'Keine Energievampire', completed: false, explanation: 'Toxische Menschen minimiert' },
        { label: 'Stress-Routine', completed: false, explanation: 'Tägliche Praxis (Meditation, Journaling, etc.)' },
      ], 'Deine mentale Umgebung ist genauso wichtig wie deine physische. Schaffe dir einen sicheren Hafen.');

      progress.digital_hygiene = createManualItem('digital_hygiene', [
        { label: 'Handyfreies Schlafzimmer', completed: false, explanation: 'Kein Handy am Bett' },
        { label: 'Kein Doomscrolling', completed: false, explanation: 'Bewusster Social Media Konsum' },
        { label: 'Screen-Time Limits', completed: false, explanation: 'Feste Zeiten für digitale Geräte' },
      ], 'Digitale Überlastung stört Schlaf, erhöht Cortisol und fragmentiert deine Aufmerksamkeit.');

      progress.tracking_measurement = createManualItem('tracking_measurement', [
        { label: 'Wearable nutzen', completed: false, explanation: 'Apple Watch, Oura, Whoop – Schlaf, HRV, Aktivität' },
        { label: 'Gewicht/KFA regelmäßig tracken', completed: false, explanation: 'Mind. 1× pro Woche, besser täglich' },
        { label: 'Mahlzeiten erfassen', completed: false, explanation: 'Makros kennen – App oder Dashboard' },
        { label: 'Training dokumentieren', completed: false, explanation: 'Jede Session eintragen' },
        { label: 'Bluttest alle 3-6 Monate', completed: false, explanation: 'Marker verfolgen, Trends erkennen' },
      ], 'Wer nicht misst, weiß nichts. Und wer nichts weiß, kann nichts ändern. Tracking ist die Basis für Optimierung.');

      setItemProgress(progress);
    } catch (error) {
      console.error('Error fetching phase 0 progress:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, checklist]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return { itemProgress, loading, refetch: fetchProgress };
}
