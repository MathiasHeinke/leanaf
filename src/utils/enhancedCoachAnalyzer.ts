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

    // Only simple, proven insights with higher thresholds
    const weightInsight = this.analyzeWeightTrend();
    if (weightInsight) insights.push(weightInsight);

    const trainingInsight = this.analyzeTrainingConsistency();
    if (trainingInsight) insights.push(trainingInsight);

    const sleepInsight = this.analyzeSleepQuality();
    if (sleepInsight) insights.push(sleepInsight);

    const measurementInsight = this.analyzeMeasurementProgress();
    if (measurementInsight) insights.push(measurementInsight);

    // If no meaningful insights, provide helpful basic tips
    if (insights.length === 0) {
      insights.push(this.generateHelpfulTip());
    }

    // Return max 2-3 most relevant insights
    return insights.slice(0, 3);
  }

  private analyzeWeightTrend(): CoachInsight | null {
    const recentWeight = this.getRecentWeightTrend(14); // Require 2 weeks of data
    if (recentWeight.length < 7) return null; // Higher threshold

    const weightChange = recentWeight[recentWeight.length - 1] - recentWeight[0];
    const significantChange = Math.abs(weightChange) >= 1; // Only significant changes

    if (!significantChange) return null;

    if (weightChange < -1) {
      return {
        type: 'success',
        title: 'Gewichtstrend positiv! 📉',
        message: `${Math.abs(weightChange).toFixed(1)}kg weniger in 2 Wochen - das ist ein guter, nachhaltiger Fortschritt!`,
        icon: '📉',
        data: { weightChange }
      };
    }

    if (weightChange > 1) {
      return {
        type: 'warning',
        title: 'Gewichtstrend beobachten 📈',
        message: `${weightChange.toFixed(1)}kg mehr in 2 Wochen. Prüfe dein Kaloriendefizit und bleib konsequent.`,
        icon: '📈',
        data: { weightChange }
      };
    }

    return null;
  }

  private analyzeTrainingConsistency(): CoachInsight | null {
    const recentWorkouts = this.data.workouts.slice(-14); // 2 weeks
    if (recentWorkouts.length < 7) return null; // Need at least a week of data

    const workoutCount = recentWorkouts.filter(w => w.did_workout).length;
    const workoutRate = workoutCount / 14 * 7; // Weekly rate

    if (workoutRate >= 3) {
      return {
        type: 'success',
        title: 'Training-Konsistenz top! 💪',
        message: `${workoutCount} Trainings in 2 Wochen - perfekt für Muskelerhalt und Stoffwechsel!`,
        icon: '💪',
        data: { workoutCount, weeklyRate: workoutRate }
      };
    }

    if (workoutRate < 1) {
      return {
        type: 'warning',
        title: 'Mehr Training empfohlen',
        message: 'Zu wenig Training in den letzten 2 Wochen. 2-3x pro Woche hilft beim Muskelerhalt.',
        icon: '⚠️',
        data: { workoutCount, weeklyRate: workoutRate }
      };
    }

    return null;
  }

  private analyzeSleepQuality(): CoachInsight | null {
    const recentSleep = this.data.sleepData.slice(-7); // 1 week
    if (recentSleep.length < 5) return null; // Need at least 5 days

    const validSleep = recentSleep.filter(s => s.sleep_quality && s.sleep_hours);
    if (validSleep.length < 5) return null;

    const avgQuality = validSleep.reduce((sum, s) => sum + s.sleep_quality, 0) / validSleep.length;
    const avgHours = validSleep.reduce((sum, s) => sum + s.sleep_hours, 0) / validSleep.length;

    if (avgQuality >= 4 && avgHours >= 7) {
      return {
        type: 'success',
        title: 'Schlaf-Champion! 😴',
        message: `${avgHours.toFixed(1)}h und Qualität ${avgQuality.toFixed(1)}/5 - perfekt für deine Ziele!`,
        icon: '😴',
        data: { avgQuality, avgHours }
      };
    }

    if (avgQuality < 2.5 || avgHours < 6) {
      return {
        type: 'warning',
        title: 'Schlaf optimieren',
        message: `Schlaf-Qualität oder -Dauer zu niedrig. 7+ Stunden guter Schlaf sind wichtig für deine Erfolge.`,
        icon: '🌙',
        data: { avgQuality, avgHours }
      };
    }

    return null;
  }

  private analyzeMeasurementProgress(): CoachInsight | null {
    const measurements = this.data.measurements.slice(-8); // Last 8 measurements
    if (measurements.length < 4) return null; // Need at least 4 measurements

    // Only compare first and last to avoid noise
    const firstMeasurement = measurements[0];
    const lastMeasurement = measurements[measurements.length - 1];

    if (!firstMeasurement || !lastMeasurement) return null;

    const bellyChange = (lastMeasurement.belly || 0) - (firstMeasurement.belly || 0);
    const waistChange = (lastMeasurement.waist || 0) - (firstMeasurement.waist || 0);

    // Only report significant changes (>= 2cm)
    if (bellyChange <= -2 || waistChange <= -2) {
      const biggestChange = Math.min(bellyChange, waistChange);
      return {
        type: 'success',
        title: 'Messfortschritt sichtbar! 📏',
        message: `${Math.abs(biggestChange).toFixed(1)}cm weniger - das ist echter, messbarer Fortschritt!`,
        icon: '📏',
        data: { bellyChange, waistChange }
      };
    }

    return null;
  }

  private generateHelpfulTip(): CoachInsight {
    const tips = [
      {
        title: 'Grundlagen beachten 💡',
        message: 'Kaloriendefizit + Krafttraining + guter Schlaf = die bewährte Formel für nachhaltigen Erfolg.',
        icon: '💡'
      },
      {
        title: 'Konsistenz ist key 🔑',
        message: 'Kleine, tägliche Schritte sind wichtiger als perfekte Einzeltage. Bleib dran!',
        icon: '🔑'
      },
      {
        title: 'Geduld zahlt sich aus ⏰',
        message: 'Echte Transformation braucht Zeit. Miss dich wöchentlich und tracke deine Fortschritte.',
        icon: '⏰'
      }
    ];

    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    return {
      type: 'motivation',
      title: randomTip.title,
      message: randomTip.message,
      icon: randomTip.icon,
      data: { type: 'basic_tip' }
    };
  }

  // Helper methods
  private getRecentWeightTrend(days: number): number[] {
    if (!this.data.weight) return [];
    return this.data.weight
      .slice(-days)
      .filter(w => w.weight)
      .map(w => w.weight);
  }

  private getRecentMeasurements(days: number): any[] {
    if (!this.data.measurements) return [];
    return this.data.measurements
      .slice(-Math.floor(days / 7)) // Measurements are usually weekly
      .filter(m => m.belly || m.waist);
  }
}

// Note: loadTransformationData function removed to avoid type issues
// The component using this analyzer should provide data directly