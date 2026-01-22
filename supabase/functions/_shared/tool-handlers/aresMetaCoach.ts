// ARES Meta-Coach - Ultimate Cross-Domain Coaching Intelligence
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

export default async function handleAresMetaCoach(conv: any[], userId: string) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  
  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });
  
  // Fetch real user data from multiple domains
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // Parallel fetch of all domain data
  const [
    { data: recentMeals },
    { data: recentWorkouts },
    { data: userProfile },
    { data: supplementStack },
    { data: sleepData },
    { data: dailySummaries }
  ] = await Promise.all([
    supabase.from('meals')
      .select('calories, protein, carbs, fat, date')
      .eq('user_id', userId)
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: false })
      .limit(14),
    supabase.from('workouts')
      .select('workout_type, duration_minutes, notes, date')
      .eq('user_id', userId)
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: false })
      .limit(7),
    supabase.from('profiles')
      .select('weight, target_weight, tdee, goals, preferences')
      .eq('user_id', userId)
      .single(),
    supabase.from('user_supplements')
      .select('name, dose, schedule, is_active')
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase.from('sleep_logs')
      .select('hours, quality_score, date')
      .eq('user_id', userId)
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: false })
      .limit(7),
    supabase.from('daily_summaries')
      .select('mood_score, energy_score, stress_level, date')
      .eq('user_id', userId)
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: false })
      .limit(7)
  ]);
  
  // Calculate real domain scores
  const nutritionScore = calculateNutritionScore(recentMeals || [], userProfile);
  const trainingScore = calculateTrainingScore(recentWorkouts || []);
  const recoveryScore = calculateRecoveryScore(sleepData || [], dailySummaries || []);
  const mindsetScore = calculateMindsetScore(dailySummaries || []);
  const hormoneScore = calculateHormoneScore(sleepData || [], recentWorkouts || [], recentMeals || []);
  
  // Overall performance weighted average
  const overallPerformance = Math.round(
    (nutritionScore * 0.25 + trainingScore * 0.30 + recoveryScore * 0.20 + 
     mindsetScore * 0.15 + hormoneScore * 0.10)
  );
  
  // Generate dynamic insights based on real data
  const synergyFactors = generateSynergyInsights(
    nutritionScore, trainingScore, recoveryScore, recentMeals || [], recentWorkouts || []
  );
  
  const limitingFactors = identifyLimitingFactors(
    nutritionScore, trainingScore, recoveryScore, mindsetScore,
    recentMeals || [], recentWorkouts || [], userProfile
  );
  
  const aresRecommendations = generateAresRecommendations(
    nutritionScore, trainingScore, recoveryScore, limitingFactors, userProfile
  );
  
  const metaAnalysis = {
    nutrition_score: nutritionScore,
    training_score: trainingScore,
    recovery_score: recoveryScore,
    mindset_score: mindsetScore,
    hormone_score: hormoneScore,
    overall_performance: overallPerformance,
    
    // Data-backed insights
    data_summary: {
      meals_tracked: recentMeals?.length || 0,
      workouts_completed: recentWorkouts?.length || 0,
      avg_sleep_hours: sleepData?.length ? 
        Math.round(sleepData.reduce((sum, s) => sum + (s.hours || 0), 0) / sleepData.length * 10) / 10 : null,
      active_supplements: supplementStack?.length || 0
    },
    
    synergy_factors: synergyFactors,
    ares_recommendations: aresRecommendations,
    limiting_factors: limitingFactors
  };
  
  return {
    role: 'assistant',
    type: 'card',
    card: 'aresMetaCoach',
    payload: {
      analysis: metaAnalysis,
      query: lastUserMsg,
      timestamp: Date.now(),
      ares_signature: '⚡ ANALYZED BY ARES ULTIMATE INTELLIGENCE ⚡'
    },
    meta: { clearTool: true }
  };
}

// Helper functions for real score calculations
function calculateNutritionScore(meals: any[], profile: any): number {
  if (!meals.length) return 50; // No data baseline
  
  const avgCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0) / meals.length;
  const avgProtein = meals.reduce((sum, m) => sum + (m.protein || 0), 0) / meals.length;
  
  let score = 70; // Base score for tracking
  
  // Protein adequacy (target: 1.6-2.2g per kg)
  const targetProtein = (profile?.weight || 80) * 1.8;
  const proteinRatio = avgProtein / targetProtein;
  score += proteinRatio >= 0.9 && proteinRatio <= 1.2 ? 15 : proteinRatio >= 0.7 ? 8 : 0;
  
  // Calorie consistency with TDEE
  if (profile?.tdee) {
    const calorieDeviation = Math.abs(avgCalories - profile.tdee) / profile.tdee;
    score += calorieDeviation < 0.1 ? 15 : calorieDeviation < 0.2 ? 8 : 0;
  }
  
  return Math.min(100, Math.max(0, score));
}

function calculateTrainingScore(workouts: any[]): number {
  if (!workouts.length) return 40; // No training penalty
  
  let score = 50; // Base score
  
  // Frequency score (3-6 workouts per week optimal)
  const workoutsPerWeek = workouts.length;
  score += workoutsPerWeek >= 3 && workoutsPerWeek <= 6 ? 25 : workoutsPerWeek >= 2 ? 15 : 5;
  
  // Duration score (45-90 min optimal)
  const avgDuration = workouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0) / workouts.length;
  score += avgDuration >= 45 && avgDuration <= 90 ? 15 : avgDuration >= 30 ? 8 : 0;
  
  // Variety bonus
  const uniqueTypes = new Set(workouts.map(w => w.workout_type)).size;
  score += uniqueTypes >= 2 ? 10 : 5;
  
  return Math.min(100, Math.max(0, score));
}

function calculateRecoveryScore(sleepData: any[], summaries: any[]): number {
  let score = 60; // Base score
  
  if (sleepData.length) {
    const avgSleep = sleepData.reduce((sum, s) => sum + (s.hours || 0), 0) / sleepData.length;
    const avgQuality = sleepData.reduce((sum, s) => sum + (s.quality_score || 5), 0) / sleepData.length;
    
    score += avgSleep >= 7 && avgSleep <= 9 ? 20 : avgSleep >= 6 ? 10 : 0;
    score += avgQuality >= 7 ? 10 : avgQuality >= 5 ? 5 : 0;
  }
  
  if (summaries.length) {
    const avgEnergy = summaries.reduce((sum, s) => sum + (s.energy_score || 5), 0) / summaries.length;
    score += avgEnergy >= 7 ? 10 : avgEnergy >= 5 ? 5 : 0;
  }
  
  return Math.min(100, Math.max(0, score));
}

function calculateMindsetScore(summaries: any[]): number {
  if (!summaries.length) return 60;
  
  const avgMood = summaries.reduce((sum, s) => sum + (s.mood_score || 5), 0) / summaries.length;
  const avgStress = summaries.reduce((sum, s) => sum + (s.stress_level || 5), 0) / summaries.length;
  
  let score = 50;
  score += avgMood >= 7 ? 25 : avgMood >= 5 ? 15 : 5;
  score += avgStress <= 4 ? 25 : avgStress <= 6 ? 15 : 5;
  
  return Math.min(100, Math.max(0, score));
}

function calculateHormoneScore(sleepData: any[], workouts: any[], meals: any[]): number {
  // Proxy calculation based on lifestyle factors affecting hormones
  let score = 60;
  
  // Sleep consistency (important for hormone regulation)
  if (sleepData.length >= 5) {
    const sleepHours = sleepData.map(s => s.hours || 7);
    const variance = calculateVariance(sleepHours);
    score += variance < 1 ? 15 : variance < 2 ? 8 : 0;
  }
  
  // Training intensity balance
  if (workouts.length >= 3 && workouts.length <= 6) {
    score += 15;
  }
  
  // Nutrition timing (protein distribution)
  if (meals.length >= 3) {
    score += 10;
  }
  
  return Math.min(100, Math.max(0, score));
}

function calculateVariance(values: number[]): number {
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length);
}

function generateSynergyInsights(nutrition: number, training: number, recovery: number, meals: any[], workouts: any[]): string[] {
  const insights: string[] = [];
  
  if (nutrition >= 70 && training >= 70) {
    insights.push('💪 Training + Nutrition Alignment: Starke Synergie erkannt');
  }
  if (recovery >= 75 && training >= 70) {
    insights.push('🔄 Recovery optimiert Training-Adaptationen');
  }
  if (meals.length >= 10 && workouts.length >= 4) {
    insights.push('📊 Konsistentes Tracking treibt Fortschritt');
  }
  if (insights.length === 0) {
    insights.push('🎯 Fokus: Mehr Konsistenz in allen Bereichen aufbauen');
  }
  
  return insights;
}

function identifyLimitingFactors(nutrition: number, training: number, recovery: number, mindset: number, meals: any[], workouts: any[], profile: any): string[] {
  const factors: string[] = [];
  
  if (nutrition < 60) factors.push('⚠️ Nutrition-Tracking unvollständig - limitiert Optimierung');
  if (training < 60) factors.push('⚠️ Training-Frequenz zu niedrig für maximale Gains');
  if (recovery < 60) factors.push('⚠️ Recovery-Defizit erkannt - bremst Fortschritt');
  if (mindset < 60) factors.push('⚠️ Mental-State benötigt Aufmerksamkeit');
  
  if (meals.length < 7) factors.push('📝 Mehr Meal-Tracking für präzise Analyse nötig');
  if (workouts.length < 3) factors.push('📝 Workout-Logging aktivieren für Progression');
  
  return factors.length ? factors : ['✅ Keine kritischen Limitierungen erkannt'];
}

function generateAresRecommendations(nutrition: number, training: number, recovery: number, limitingFactors: string[], profile: any): string[] {
  const recommendations: string[] = [];
  
  const lowestScore = Math.min(nutrition, training, recovery);
  
  if (lowestScore === training) {
    recommendations.push('⚡ PRIORITY: Training-Frequenz auf 4-5x/Woche erhöhen');
  }
  if (lowestScore === nutrition) {
    recommendations.push('🎯 NUTRITION FOCUS: Protein auf 2g/kg Körpergewicht pushen');
  }
  if (lowestScore === recovery) {
    recommendations.push('💤 RECOVERY PROTOCOL: 7-8h Schlaf + Deload-Woche einplanen');
  }
  
  recommendations.push('🔥 ARES STANDARD: Keine Ausreden. Jeden Tag besser als gestern.');
  
  return recommendations;
}
