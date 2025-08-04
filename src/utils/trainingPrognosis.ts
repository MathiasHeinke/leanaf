export interface TrainingPrognosisData {
  workoutData: any[];
  timeRange: 'week' | 'month' | 'year';
  profileData: any | null;
}

export interface StrengthInsight {
  type: 'strength' | 'volume' | 'rpe' | 'progression' | 'discrepancy' | 'correlation' | 'habit' | 'trend';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  value?: number;
  trend?: 'up' | 'down' | 'stable';
  color?: string;
  correlation?: number;
  pattern?: string;
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

  // Calculate weekly workouts - count only training days (not individual sessions)
  const trainingDays = workoutData.filter(day => {
    const hasQuickWorkout = day.quickWorkouts.some((w: any) => w.did_workout);
    const hasAdvancedSession = day.advancedSessions.length > 0;
    return hasQuickWorkout || hasAdvancedSession;
  }).length;
  
  // Calculate actual weeks from data instead of using fixed values
  const dates = workoutData.map(day => new Date(day.date)).sort((a, b) => a.getTime() - b.getTime());
  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];
  const daysDifference = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
  const actualWeeks = Math.max(1, daysDifference / 7);
  
  // Calculate realistic weekly workouts based on training days
  const weeklyWorkouts = trainingDays / actualWeeks;

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

  // Note: Removed redundant Trainingsfrequenz insight as it's already shown in overview cards

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

  // Analyze workout patterns and habits
  const habitInsights = analyzeWorkoutHabits(workoutData);
  insights.push(...habitInsights);

  // Analyze correlations and trends
  const correlationInsights = analyzeCorrelations(workoutData, allSets);
  insights.push(...correlationInsights);

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

// Analyze workout habits and patterns
const analyzeWorkoutHabits = (workoutData: any[]): StrengthInsight[] => {
  const insights: StrengthInsight[] = [];
  
  // Analyze preferred workout days
  const dayFrequency = new Map<string, number>();
  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  
  workoutData.forEach(day => {
    const hasQuickWorkout = day.quickWorkouts.some((w: any) => w.did_workout);
    const hasAdvancedSession = day.advancedSessions.length > 0;
    if (hasQuickWorkout || hasAdvancedSession) {
      const dayOfWeek = new Date(day.date).getDay();
      const dayName = dayNames[dayOfWeek];
      dayFrequency.set(dayName, (dayFrequency.get(dayName) || 0) + 1);
    }
  });
  
  if (dayFrequency.size > 0) {
    const sortedDays = Array.from(dayFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);
    
    if (sortedDays.length > 0) {
      insights.push({
        type: 'habit',
        priority: 'low',
        title: 'Lieblings-Trainingstage',
        description: `Du trainierst am liebsten ${sortedDays.map(([day, count]) => `${day} (${count}x)`).join(' und ')}`,
        pattern: sortedDays.map(([day]) => day).join(', '),
        color: 'text-blue-600'
      });
    }
  }
  
  // Analyze rest day patterns
  const consecutiveRestDays = [];
  let currentRestStreak = 0;
  
  workoutData.forEach(day => {
    const hasQuickWorkout = day.quickWorkouts.some((w: any) => w.did_workout);
    const hasAdvancedSession = day.advancedSessions.length > 0;
    if (!hasQuickWorkout && !hasAdvancedSession) {
      currentRestStreak++;
    } else {
      if (currentRestStreak > 0) {
        consecutiveRestDays.push(currentRestStreak);
      }
      currentRestStreak = 0;
    }
  });
  
  if (consecutiveRestDays.length > 0) {
    const avgRestDays = consecutiveRestDays.reduce((sum, days) => sum + days, 0) / consecutiveRestDays.length;
    const maxRestDays = Math.max(...consecutiveRestDays);
    
    insights.push({
      type: 'habit',
      priority: maxRestDays > 5 ? 'high' : 'low',
      title: 'Pausenmuster',
      description: `Durchschnittlich ${avgRestDays.toFixed(1)} Ruhetage am Stück, Maximum: ${maxRestDays} Tage`,
      value: avgRestDays,
      color: maxRestDays > 5 ? 'text-orange-600' : 'text-green-600'
    });
  }
  
  return insights;
};

// Analyze correlations between different metrics
const analyzeCorrelations = (workoutData: any[], allSets: any[]): StrengthInsight[] => {
  const insights: StrengthInsight[] = [];
  
  // Volume vs RPE correlation
  const dailyMetrics = workoutData.map(day => {
    const dayVolume = day.advancedSessions.flatMap((session: any) => 
      session.exercise_sets || []
    ).reduce((sum: number, set: any) => sum + ((set.weight_kg || 0) * (set.reps || 0)), 0);
    
    const dayRPEs = day.advancedSessions.flatMap((session: any) => 
      (session.exercise_sets || [])
        .filter((set: any) => set.rpe)
        .map((set: any) => set.rpe)
    );
    
    const avgRPE = dayRPEs.length > 0 ? dayRPEs.reduce((sum: number, rpe: number) => sum + rpe, 0) / dayRPEs.length : null;
    
    return { volume: dayVolume, rpe: avgRPE, date: day.date };
  }).filter(metric => metric.volume > 0 && metric.rpe !== null);
  
  if (dailyMetrics.length >= 3) {
    const correlation = calculateCorrelation(
      dailyMetrics.map(m => m.volume), 
      dailyMetrics.map(m => m.rpe!)
    );
    
    if (Math.abs(correlation) > 0.3) {
      insights.push({
        type: 'correlation',
        priority: Math.abs(correlation) > 0.6 ? 'high' : 'medium',
        title: 'Volumen-Intensitäts-Zusammenhang',
        description: correlation > 0 
          ? `Höheres Volumen führt zu höherer wahrgenommener Intensität (r=${correlation.toFixed(2)})`
          : `Höheres Volumen bei niedrigerer Intensität - gute Effizienz! (r=${correlation.toFixed(2)})`,
        correlation,
        color: correlation > 0.5 ? 'text-orange-600' : correlation < -0.3 ? 'text-green-600' : 'text-blue-600'
      });
    }
  }
  
  // Exercise variety analysis
  const exerciseTypes = new Set();
  allSets.forEach((set: any) => {
    if (set.exercises?.name) {
      exerciseTypes.add(set.exercises.name);
    }
  });
  
  if (exerciseTypes.size > 0) {
    const variety = exerciseTypes.size;
    insights.push({
      type: 'trend',
      priority: variety < 3 ? 'high' : 'low',
      title: 'Übungsvielfalt',
      description: variety < 3 
        ? `Nur ${variety} verschiedene Übungen - mehr Abwechslung könnte helfen!`
        : `Gute Vielfalt mit ${variety} verschiedenen Übungen`,
      value: variety,
      color: variety < 3 ? 'text-orange-600' : 'text-green-600'
    });
  }
  
  return insights;
};

// Helper function to calculate Pearson correlation coefficient
const calculateCorrelation = (x: number[], y: number[]): number => {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const n = x.length;
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
  const sumY2 = y.reduce((sum, val) => sum + val * val, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
};