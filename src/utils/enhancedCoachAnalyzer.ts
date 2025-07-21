import { supabase } from "@/integrations/supabase/client";

export interface TransformationData {
  workouts: any[];
  sleepData: any[];
  measurements: any[];
  meals: any[];
  weight: any[];
  goals: any;
  profile: any;
}

export interface CoachInsight {
  type: 'success' | 'warning' | 'info' | 'motivation';
  title: string;
  message: string;
  icon: string;
  data?: any;
}

export class EnhancedCoachAnalyzer {
  private data: TransformationData;

  constructor(data: TransformationData) {
    this.data = data;
  }

  async generateInsights(): Promise<CoachInsight[]> {
    const insights: CoachInsight[] = [];

    // Check plateau vs real progress
    const plateauInsight = this.analyzePlateauVsProgress();
    if (plateauInsight) insights.push(plateauInsight);

    // Check water retention factors
    const waterInsight = this.analyzeWaterRetention();
    if (waterInsight) insights.push(waterInsight);

    // Check workout consistency
    const workoutInsight = this.analyzeWorkoutConsistency();
    if (workoutInsight) insights.push(workoutInsight);

    // Check sleep impact
    const sleepInsight = this.analyzeSleepImpact();
    if (sleepInsight) insights.push(sleepInsight);

    // Check measurement progress
    const measurementInsight = this.analyzeMeasurementProgress();
    if (measurementInsight) insights.push(measurementInsight);

    // Motivational insight
    const motivationInsight = this.generateMotivation();
    if (motivationInsight) insights.push(motivationInsight);

    return insights;
  }

  private analyzePlateauVsProgress(): CoachInsight | null {
    const recentWeight = this.getRecentWeightTrend(7);
    const recentMeasurements = this.getRecentMeasurements(14);

    if (recentWeight.length < 2 || recentMeasurements.length < 2) return null;

    const weightStagnant = Math.abs(recentWeight[0] - recentWeight[recentWeight.length - 1]) < 0.5;
    const bellyDecreasing = this.isMeasurementDecreasing(recentMeasurements, 'belly');

    if (weightStagnant && bellyDecreasing) {
      return {
        type: 'success',
        title: 'Echter Fortschritt! 🎉',
        message: 'Die Waage stagniert, aber dein Bauchumfang sinkt. Das ist Fettabbau bei Muskelerhalt - genau so soll es sein!',
        icon: '📏',
        data: { weightChange: 0, bellyChange: this.getMeasurementChange(recentMeasurements, 'belly') }
      };
    }

    if (weightStagnant && !bellyDecreasing) {
      return {
        type: 'info',
        title: 'Plateau-Phase',
        message: 'Sowohl Gewicht als auch Maße stagnieren. Zeit für eine kleine Anpassung - vielleicht mehr Bewegung oder Defizit prüfen?',
        icon: '🔄',
        data: { suggestion: 'adjustment_needed' }
      };
    }

    return null;
  }

  private analyzeWaterRetention(): CoachInsight | null {
    const recentSleep = this.data.sleepData.slice(-3);
    const recentWorkouts = this.data.workouts.slice(-3);
    const recentWeight = this.getRecentWeightTrend(3);

    if (recentWeight.length < 2) return null;

    const weightIncrease = recentWeight[0] - recentWeight[recentWeight.length - 1] > 0.5;
    const poorSleep = recentSleep.some(s => s.sleep_quality < 3);
    const intensiveWorkouts = recentWorkouts.some(w => w.did_workout && w.intensity >= 4);
    const noWorkouts = recentWorkouts.every(w => !w.did_workout);

    if (weightIncrease && (poorSleep || intensiveWorkouts || noWorkouts)) {
      let reason = '';
      if (poorSleep) reason = 'schlechter Schlaf';
      else if (intensiveWorkouts) reason = 'intensives Training';
      else if (noWorkouts) reason = 'fehlende Bewegung';

      return {
        type: 'warning',
        title: 'Wasser-Retention erklärt 💧',
        message: `Gewichtszunahme durch ${reason}? Das ist normal! Wasser-Schwankungen sind temporär - focus auf die Maße.`,
        icon: '💧',
        data: { reason, weightChange: recentWeight[0] - recentWeight[recentWeight.length - 1] }
      };
    }

    return null;
  }

  private analyzeWorkoutConsistency(): CoachInsight | null {
    const weeklyWorkouts = this.data.workouts.slice(-7);
    const workoutCount = weeklyWorkouts.filter(w => w.did_workout).length;

    if (workoutCount >= 3) {
      return {
        type: 'success',
        title: 'Workout-Konsistenz Top! 💪',
        message: `${workoutCount} Trainings diese Woche - perfekt für Muskelerhalt und Stoffwechsel!`,
        icon: '💪',
        data: { workoutCount }
      };
    }

    if (workoutCount === 0) {
      return {
        type: 'warning',
        title: 'Training fehlt',
        message: 'Diese Woche kein Training? 1-2x Krafttraining hilft beim Muskelerhalt und macht das Defizit effektiver.',
        icon: '⚠️',
        data: { workoutCount }
      };
    }

    return null;
  }

  private analyzeSleepImpact(): CoachInsight | null {
    const recentSleep = this.data.sleepData.slice(-7);
    if (recentSleep.length < 3) return null;

    const avgQuality = recentSleep.reduce((sum, s) => sum + (s.sleep_quality || 3), 0) / recentSleep.length;
    const avgHours = recentSleep
      .filter(s => s.sleep_hours)
      .reduce((sum, s) => sum + s.sleep_hours, 0) / recentSleep.filter(s => s.sleep_hours).length;

    if (avgQuality >= 4 && avgHours >= 7) {
      return {
        type: 'success',
        title: 'Schlaf-Champion! 😴',
        message: 'Perfekter Schlaf unterstützt deine Transformation. Weiter so!',
        icon: '😴',
        data: { avgQuality, avgHours }
      };
    }

    if (avgQuality < 3 || avgHours < 6) {
      return {
        type: 'warning',
        title: 'Schlaf optimieren',
        message: 'Schlechter Schlaf kann Fortschritte bremsen. 7+ Stunden guter Schlaf = bessere Ergebnisse!',
        icon: '🌙',
        data: { avgQuality, avgHours }
      };
    }

    return null;
  }

  private analyzeMeasurementProgress(): CoachInsight | null {
    const measurements = this.data.measurements.slice(-4); // Last 4 measurements
    if (measurements.length < 2) return null;

    const bellyProgress = this.getMeasurementChange(measurements, 'belly');
    const waistProgress = this.getMeasurementChange(measurements, 'waist');

    if (bellyProgress < -2 || waistProgress < -2) {
      return {
        type: 'success',
        title: 'Transformation sichtbar! 📏✨',
        message: `${Math.abs(bellyProgress).toFixed(1)}cm weniger Bauchumfang - das ist echter Fortschritt!`,
        icon: '📏',
        data: { bellyProgress, waistProgress }
      };
    }

    return null;
  }

  private generateMotivation(): CoachInsight | null {
    const motivationalMessages = [
      {
        title: 'Transformation läuft! 🔥',
        message: 'Jede Messung, jedes Training, jede bewusste Mahlzeit bringt dich näher zum Ziel. Weiter so!',
        icon: '🔥'
      },
      {
        title: 'Sixpack-Formel aktiv! 💪',
        message: 'Defizit + Training + Schlaf + Geduld = Sichtbare Ergebnisse. Du machst alles richtig!',
        icon: '💪'
      },
      {
        title: 'Progress über Perfektion! 📈',
        message: 'Nicht jeden Tag perfekt? Egal! Konsistenz schlägt Perfektion - und du bist konsistent!',
        icon: '📈'
      }
    ];

    const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
    
    return {
      type: 'motivation',
      ...randomMessage
    };
  }

  // Helper methods
  private getRecentWeightTrend(days: number): number[] {
    return this.data.weight
      .slice(-days)
      .map(w => w.weight)
      .filter(w => w !== null);
  }

  private getRecentMeasurements(days: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return this.data.measurements
      .filter(m => new Date(m.date) >= cutoff)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  private isMeasurementDecreasing(measurements: any[], field: string): boolean {
    if (measurements.length < 2) return false;
    
    const values = measurements
      .map(m => m[field])
      .filter(v => v !== null && v !== undefined);
    
    if (values.length < 2) return false;
    
    return values[0] < values[values.length - 1];
  }

  private getMeasurementChange(measurements: any[], field: string): number {
    if (measurements.length < 2) return 0;
    
    const values = measurements
      .map(m => m[field])
      .filter(v => v !== null && v !== undefined);
    
    if (values.length < 2) return 0;
    
    return values[0] - values[values.length - 1];
  }
}

export async function loadTransformationData(userId: string): Promise<TransformationData> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [workouts, sleepData, measurements, meals, weight, goals, profile] = await Promise.all([
    supabase.from('workouts').select('*').eq('user_id', userId).gte('date', thirtyDaysAgo.toISOString().split('T')[0]).order('date', { ascending: false }),
    supabase.from('sleep_tracking').select('*').eq('user_id', userId).gte('date', thirtyDaysAgo.toISOString().split('T')[0]).order('date', { ascending: false }),
    supabase.from('body_measurements').select('*').eq('user_id', userId).gte('date', thirtyDaysAgo.toISOString().split('T')[0]).order('date', { ascending: false }),
    supabase.from('meals').select('*').eq('user_id', userId).gte('created_at', thirtyDaysAgo.toISOString()).order('created_at', { ascending: false }),
    supabase.from('weight_history').select('*').eq('user_id', userId).gte('date', thirtyDaysAgo.toISOString().split('T')[0]).order('date', { ascending: false }),
    supabase.from('daily_goals').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle()
  ]);

  return {
    workouts: workouts.data || [],
    sleepData: sleepData.data || [],
    measurements: measurements.data || [],
    meals: meals.data || [],
    weight: weight.data || [],
    goals: goals.data,
    profile: profile.data
  };
}