export interface TrainingPrognosisData {
  workoutData: any[];
  timeRange: 'week' | 'month' | 'year';
  profileData: any | null;
}

export interface StrengthInsight {
  type: 'strength' | 'volume' | 'rpe' | 'progression' | 'discrepancy';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  value?: number;
  trend?: 'up' | 'down' | 'stable';
  color?: string;
}

export interface TrainingPrognosis {
  weeklyWorkouts: number;
  averageRPE: number;
  totalVolume: number;
  volumeTrend: 'up' | 'down' | 'stable';
  insights: StrengthInsight[];
  topProgressions: { exercise: string; improvement: string; trend: string }[];
  discrepancies: { date: string; quickIntensity: number; actualRPE: number; difference: number }[];
}

export const calculateTrainingPrognosis = ({ 
  workoutData, 
  timeRange,
  profileData 
}: TrainingPrognosisData): TrainingPrognosis | null => {
  if (!workoutData || workoutData.length === 0) {
    return null;
  }

  // Calculate weekly workouts - fix calculation
  const actualWorkoutDays = workoutData.filter(day => {
    const hasActiveQuickWorkout = day.quickWorkouts.some((w: any) => w.did_workout);
    const hasAdvancedSession = day.advancedSessions.length > 0;
    return hasActiveQuickWorkout || hasAdvancedSession;
  }).length;
  
  const daysInData = workoutData.length > 0 ? workoutData.length : 
    (timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365);
  const weeksInData = daysInData / 7;
  const weeklyWorkouts = actualWorkoutDays / weeksInData;

  // Calculate average RPE from advanced sessions - fix data structure
  const allSets = workoutData.flatMap((day) => 
    day.advancedSessions.flatMap((session: any) => 
      session.exercise_sets || []
    )
  );
  const rpeValues = allSets.filter((set: any) => set.rpe).map((set: any) => set.rpe);
  const averageRPE = rpeValues.length > 0 ? rpeValues.reduce((sum, rpe) => sum + rpe, 0) / rpeValues.length : 0;

  // Calculate total volume
  const totalVolume = allSets.reduce((sum, set: any) => {
    const weight = set.weight_kg || 0;
    const reps = set.reps || 0;
    return sum + (weight * reps);
  }, 0);

  // Calculate volume trend - fix data structure
  const recentVolume = workoutData.slice(0, Math.floor(workoutData.length / 2))
    .flatMap((day) => day.advancedSessions.flatMap((session: any) => 
      session.exercise_sets || []
    ))
    .reduce((sum, set: any) => sum + ((set.weight_kg || 0) * (set.reps || 0)), 0);
  
  const olderVolume = workoutData.slice(Math.floor(workoutData.length / 2))
    .flatMap((day) => day.advancedSessions.flatMap((session: any) => 
      session.exercise_sets || []
    ))
    .reduce((sum, set: any) => sum + ((set.weight_kg || 0) * (set.reps || 0)), 0);

  const volumeTrend: 'up' | 'down' | 'stable' = 
    recentVolume > olderVolume * 1.1 ? 'up' : 
    recentVolume < olderVolume * 0.9 ? 'down' : 'stable';

  // Find discrepancies between quick input and actual RPE
  const discrepancies = workoutData
    .filter((day) => day.quickWorkouts.length > 0 && day.advancedSessions.length > 0)
    .map((day) => {
      const quickWorkout = day.quickWorkouts.find((w: any) => w.did_workout);
      if (!quickWorkout) return null;
      
      const sessionRPEs = day.advancedSessions.flatMap((session: any) => 
        (session.exercise_sets || [])
          .filter((set: any) => set.rpe)
          .map((set: any) => set.rpe)
      );
      
      if (sessionRPEs.length === 0) return null;
      
      const avgRPE = sessionRPEs.reduce((sum, rpe) => sum + rpe, 0) / sessionRPEs.length;
      const quickIntensity = quickWorkout.intensity || 0;
      const difference = Math.abs(quickIntensity - avgRPE);
      
      return difference > 1.5 ? {
        date: day.date,
        quickIntensity,
        actualRPE: Math.round(avgRPE * 10) / 10,
        difference: Math.round(difference * 10) / 10
      } : null;
    })
    .filter(Boolean) as any[];

  // Generate insights
  const insights: StrengthInsight[] = [];

  // Volume insight
  if (totalVolume > 0) {
    insights.push({
      type: 'volume',
      priority: 'medium',
      title: 'Trainingsvolumen',
      description: `Du hast ${Math.round(totalVolume)}kg Gesamtvolumen bewegt`,
      value: totalVolume,
      trend: volumeTrend,
      color: volumeTrend === 'up' ? 'text-green-600' : volumeTrend === 'down' ? 'text-red-600' : 'text-blue-600'
    });
  }

  // RPE insight
  if (averageRPE > 0) {
    const rpeLevel = averageRPE >= 8 ? 'sehr hoch' : averageRPE >= 6.5 ? 'hoch' : averageRPE >= 5 ? 'moderat' : 'niedrig';
    insights.push({
      type: 'rpe',
      priority: averageRPE >= 8.5 ? 'high' : 'medium',
      title: 'Durchschnittliche Intensität',
      description: `Deine RPE liegt bei ${averageRPE.toFixed(1)} (${rpeLevel})`,
      value: averageRPE,
      color: averageRPE >= 8 ? 'text-red-600' : averageRPE >= 6.5 ? 'text-orange-600' : 'text-green-600'
    });
  }

  // Workout frequency insight
  if (weeklyWorkouts > 0) {
    const frequency = weeklyWorkouts >= 4 ? 'sehr aktiv' : weeklyWorkouts >= 2 ? 'aktiv' : 'wenig aktiv';
    insights.push({
      type: 'strength',
      priority: weeklyWorkouts < 2 ? 'high' : 'medium',
      title: 'Trainingsfrequenz',
      description: `${weeklyWorkouts.toFixed(1)} Workouts pro Woche (${frequency})`,
      value: weeklyWorkouts,
      color: weeklyWorkouts >= 3 ? 'text-green-600' : weeklyWorkouts >= 2 ? 'text-orange-600' : 'text-red-600'
    });
  }

  // Discrepancy insight
  if (discrepancies.length > 0) {
    insights.push({
      type: 'discrepancy',
      priority: 'high',
      title: 'Wahrnehmungs-Diskrepanz',
      description: `${discrepancies.length} Tage mit großer Abweichung zwischen gefühlter und tatsächlicher Intensität`,
      value: discrepancies.length,
      color: 'text-orange-600'
    });
  }

  // Calculate real progressions from exercise data
  const exerciseProgressions = new Map<string, { weights: number[], dates: string[] }>();
  
  // Collect exercise data by name
  workoutData.forEach(day => {
    day.advancedSessions.forEach((session: any) => {
      (session.exercise_sets || []).forEach((set: any) => {
        if (set.exercises?.name && set.weight_kg) {
          const exerciseName = set.exercises.name;
          if (!exerciseProgressions.has(exerciseName)) {
            exerciseProgressions.set(exerciseName, { weights: [], dates: [] });
          }
          const progression = exerciseProgressions.get(exerciseName)!;
          progression.weights.push(set.weight_kg);
          progression.dates.push(day.date);
        }
      });
    });
  });

  // Calculate top progressions based on real data
  const topProgressions = Array.from(exerciseProgressions.entries())
    .map(([exercise, data]) => {
      if (data.weights.length < 2) return null;
      const firstWeight = data.weights[data.weights.length - 1]; // oldest
      const lastWeight = data.weights[0]; // newest
      const improvement = lastWeight - firstWeight;
      
      if (improvement <= 0) return null;
      
      return {
        exercise,
        improvement: `+${improvement.toFixed(1)}kg`,
        trend: 'up'
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => parseFloat(b.improvement.replace('+', '').replace('kg', '')) - parseFloat(a.improvement.replace('+', '').replace('kg', '')))
    .slice(0, 3) as any[];

  return {
    weeklyWorkouts,
    averageRPE,
    totalVolume,
    volumeTrend,
    insights,
    topProgressions,
    discrepancies
  };
};