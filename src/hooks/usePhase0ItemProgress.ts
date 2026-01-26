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
    consecutiveDown?: number;
  };
  explanation: string;
  actionLabel?: string;
  actionHref?: string;
}

// ARES Protocol required markers - expanded for TRT/Reta readiness
const REQUIRED_MARKERS = [
  // Basis-Paket (Gesamtprofil XL)
  { key: 'hematocrit', label: 'Hämatokrit', category: 'basis' },
  { key: 'alt', label: 'ALT (GPT)', category: 'basis' },
  { key: 'ast', label: 'AST (GOT)', category: 'basis' },
  { key: 'ggt', label: 'GGT', category: 'basis' },
  { key: 'creatinine', label: 'Kreatinin', category: 'basis' },
  { key: 'hba1c', label: 'HbA1c', category: 'basis' },
  { key: 'crp', label: 'hsCRP', category: 'basis' },
  { key: 'hdl', label: 'HDL', category: 'basis' },
  { key: 'ldl', label: 'LDL', category: 'basis' },
  // TRT Türöffner (Pick & Mix)
  { key: 'total_testosterone', label: 'Testosteron', category: 'trt' },
  { key: 'lh', label: 'LH', category: 'trt' },
  { key: 'fsh', label: 'FSH', category: 'trt' },
  { key: 'estradiol', label: 'Estradiol', category: 'trt' },
  { key: 'psa', label: 'PSA', category: 'trt' },
  { key: 'lipase', label: 'Lipase', category: 'trt' },
];

const MIN_MARKERS_FOR_COMPLETION = 10; // Minimum markers needed for Phase 0 completion

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
      const [sleepResult, bloodworkResult, weightWithKfaResult, mealsResult, trainingResult, stepsResult, latestWeightResult] = await Promise.all([
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
        
        // Weight with KFA for trend - need more for consecutive check
        (supabase as any)
          .from('weight_history')
          .select('weight, body_fat_percentage, date')
          .eq('user_id', user.id)
          .not('body_fat_percentage', 'is', null)
          .order('date', { ascending: false })
          .limit(10),  // Increased for 5 consecutive check
        
        // Meals for protein tracking (last 14 days for 5-day window)
        (supabase as any)
          .from('food_journal_entries')
          .select('protein, created_at')
          .eq('user_id', user.id)
          .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()),
        
        // Training sessions (last 14 days for 5-day window)
        (supabase as any)
          .from('workout_sessions')
          .select('duration, workout_type, cardio_type, created_at')
          .eq('user_id', user.id)
          .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()),
        
        // Daily activities for step count
        (supabase as any)
          .from('daily_activities')
          .select('steps, date')
          .eq('user_id', user.id)
          .gte('date', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order('date', { ascending: false }),

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

      // === BLOODWORK BASELINE (ARES Shopping List) ===
      const bloodwork = bloodworkResult.data;
      const presentMarkers = bloodwork 
        ? REQUIRED_MARKERS.filter(m => {
            const value = (bloodwork as any)[m.key];
            return value !== null && value !== undefined;
          })
        : [];
      
      // Calculate progress based on minimum required markers
      const bloodworkProgress = Math.min(100, Math.round((presentMarkers.length / MIN_MARKERS_FOR_COMPLETION) * 100));
      
      // Group markers by category for display
      const basisMarkers = REQUIRED_MARKERS.filter(m => m.category === 'basis');
      const trtMarkers = REQUIRED_MARKERS.filter(m => m.category === 'trt');
      const presentBasis = presentMarkers.filter(m => m.category === 'basis');
      const presentTrt = presentMarkers.filter(m => m.category === 'trt');

      progress.bloodwork_baseline = {
        key: 'bloodwork_baseline',
        progress: bloodworkProgress,
        current: `${presentMarkers.length}/${REQUIRED_MARKERS.length} Marker`,
        target: `≥${MIN_MARKERS_FOR_COMPLETION} Marker`,
        status: presentMarkers.length >= MIN_MARKERS_FOR_COMPLETION ? 'completed' : presentMarkers.length > 0 ? 'in_progress' : 'not_started',
        stats: {
          markersPresent: presentMarkers.map(m => m.key),
          markersRequired: MIN_MARKERS_FOR_COMPLETION,
        },
        subItems: [
          // Basis package summary
          { 
            label: `Basis-Paket: ${presentBasis.length}/${basisMarkers.length}`, 
            completed: presentBasis.length >= 6,
            explanation: 'Gesamtprofil XL + Großes Blutbild'
          },
          // TRT package summary  
          { 
            label: `TRT-Türöffner: ${presentTrt.length}/${trtMarkers.length}`, 
            completed: presentTrt.length >= 4,
            explanation: 'Testo, LH, FSH, E2, PSA, Lipase'
          },
          // Critical markers
          { 
            label: 'Hämatokrit', 
            completed: presentMarkers.some(m => m.key === 'hematocrit'),
            explanation: '⚠️ TRT-Sicherheit Nr. 1'
          },
          { 
            label: 'PSA', 
            completed: presentMarkers.some(m => m.key === 'psa'),
            explanation: '⚠️ Prostata-Pflicht vor TRT'
          },
          { 
            label: 'Lipase', 
            completed: presentMarkers.some(m => m.key === 'lipase'),
            explanation: 'Reta-Sicherheit (Pankreas)'
          },
        ],
        explanation: 'Die ARES Einkaufsliste: Bestelle Gesamtprofil XL + Großes Blutbild + TRT-Türöffner (Testo, LH, FSH, E2, PSA, Lipase). Mindestens 10 Marker für Phase 1.',
        actionLabel: 'Blutwerte hochladen',
        actionHref: '/bloodwork',
      };

      // === KFA TREND (5 consecutive measurements with falling trend) ===
      const kfaData = weightWithKfaResult.data || [];
      const kfaMeasurements = kfaData.length;

      // Check for consecutive falling measurements
      let consecutiveDown = 0;
      if (kfaMeasurements >= 2) {
        for (let i = 0; i < kfaMeasurements - 1; i++) {
          const current = kfaData[i]?.body_fat_percentage;
          const previous = kfaData[i + 1]?.body_fat_percentage;
          if (current && previous && current < previous) {
            consecutiveDown++;
          } else {
            break; // Trend interrupted
          }
        }
      }

      const latestKfa = kfaData[0]?.body_fat_percentage;
      const kfaTrendComplete = consecutiveDown >= 4; // 5 measurements = 4 comparisons
      const kfaProgress = kfaMeasurements === 0 
        ? 0 
        : kfaTrendComplete 
          ? 100 
          : Math.min(90, (consecutiveDown / 4) * 80 + (Math.min(kfaMeasurements, 5) / 5) * 10);

      progress.kfa_trend = {
        key: 'kfa_trend',
        progress: Math.round(kfaProgress),
        current: kfaMeasurements > 0 
          ? `${latestKfa?.toFixed(1)}% KFA` 
          : '⚠️ KFA fehlt',
        target: '5× fallend',
        status: kfaTrendComplete ? 'completed' : kfaMeasurements > 0 ? 'in_progress' : 'not_started',
        stats: {
          measurements: kfaMeasurements,
          measurementsRequired: 5,
          consecutiveDown: consecutiveDown,
          trend: consecutiveDown > 0 ? 'down' : 'stable',
        },
        explanation: kfaMeasurements === 0 
          ? 'Trage deinen Körperfettanteil (KFA) ein. Ziel: 5 aufeinanderfolgende Messungen mit fallendem Trend.'
          : `${consecutiveDown + 1}/5 Messungen zeigen fallenden Trend. Weiter so!`,
        actionLabel: kfaMeasurements === 0 ? 'KFA eintragen' : 'Messung hinzufügen',
        actionHref: '/body',
      };

      // === PROTEIN & TRAINING (Consistency focus: 5 days each) ===
      const mealData = mealsResult.data || [];
      const trainingData = trainingResult.data || [];
      const stepsData = stepsResult.data || [];

      // --- PROTEIN: 5 days with >= 1.2g/kg ---
      const proteinTarget = userWeight ? Math.round(userWeight * 1.2) : null;
      const mealsByDay = new Map<string, number>();

      mealData.forEach((m: any) => {
        const day = new Date(m.created_at).toDateString();
        mealsByDay.set(day, (mealsByDay.get(day) || 0) + (m.protein || 0));
      });

      // Count days where protein target was met
      let proteinDaysHit = 0;
      if (proteinTarget) {
        mealsByDay.forEach((protein) => {
          if (protein >= proteinTarget) proteinDaysHit++;
        });
      }
      const proteinComplete = proteinDaysHit >= 5;

      // --- TRAINING: 5x training sessions (any type, no rest days) ---
      const trainingDays = new Set(
        trainingData
          .filter((t: any) => t.workout_type && t.workout_type !== 'rest')
          .map((t: any) => new Date(t.created_at).toDateString())
      ).size;
      const trainingComplete = trainingDays >= 5;

      // --- STEPS: Alternative - 5 days with 6000+ steps ---
      const stepDaysCount = stepsData.filter((s: any) => (s.steps || 0) >= 6000).length;
      const stepsComplete = stepDaysCount >= 5;

      // Combined progress (either training OR steps satisfies the requirement)
      const trainingOrStepsComplete = trainingComplete || stepsComplete;
      const trainingProgress = Math.max(
        Math.min(100, (trainingDays / 5) * 100),
        Math.min(100, (stepDaysCount / 5) * 100)
      );
      
      const proteinProgress = proteinTarget 
        ? Math.min(100, (proteinDaysHit / 5) * 100) 
        : 0;
      const combinedProgress = !userWeight 
        ? 0 
        : Math.round((proteinProgress * 0.5) + (trainingProgress * 0.5));

      progress.protein_training = {
        key: 'protein_training',
        progress: combinedProgress,
        current: userWeight 
          ? `${proteinDaysHit}d Protein / ${Math.max(trainingDays, stepDaysCount)}d aktiv` 
          : '⚠️ Gewicht fehlt',
        target: '5d / 5d',
        status: (proteinComplete && trainingOrStepsComplete) ? 'completed' : combinedProgress > 0 ? 'in_progress' : 'not_started',
        subItems: userWeight ? [
          { 
            label: `Protein: ${proteinDaysHit}/5 Tage erreicht`, 
            completed: proteinComplete, 
            explanation: `Tage mit ≥${proteinTarget}g (1.2g × ${userWeight}kg)` 
          },
          { 
            label: `Training: ${trainingDays}/5 Sessions`, 
            completed: trainingComplete, 
            explanation: 'Kraft, Cardio, VO2max – alles zählt!' 
          },
          { 
            label: `Alternativ: ${stepDaysCount}/5 Tage 6000+ Schritte`, 
            completed: stepsComplete, 
            explanation: 'Bewegung zählt auch!' 
          },
        ] : undefined,
        explanation: userWeight 
          ? `Konsistenz aufbauen: 5 Tage mit ≥${proteinTarget}g Protein UND 5× Training (oder 5× 6000+ Schritte).`
          : 'Zuerst Gewicht eintragen für Proteinziel.',
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
