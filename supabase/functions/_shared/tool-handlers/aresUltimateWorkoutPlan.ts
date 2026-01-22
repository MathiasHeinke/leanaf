// ARES Ultimate Workout Plan - Cross-Domain Training Supremacy
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

export default async function handleAresUltimateWorkoutPlan(conv: any[], userId: string) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  
  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });
  
  // Fetch user's training history and profile
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const [
    { data: userProfile },
    { data: recentWorkouts },
    { data: exerciseSets },
    { data: trainingSessions }
  ] = await Promise.all([
    supabase.from('profiles')
      .select('weight, target_weight, goals, fitness_level, experience_years, available_days_per_week, equipment_access, preferences')
      .eq('user_id', userId)
      .single(),
    supabase.from('workouts')
      .select('workout_type, duration_minutes, notes, date')
      .eq('user_id', userId)
      .gte('date', thirtyDaysAgo)
      .order('date', { ascending: false })
      .limit(20),
    supabase.from('exercise_sets')
      .select('exercise_id, weight_kg, reps, rpe, date')
      .eq('user_id', userId)
      .gte('date', thirtyDaysAgo)
      .order('date', { ascending: false })
      .limit(100),
    supabase.from('training_sessions')
      .select('split_type, total_volume_kg, session_data, session_date')
      .eq('user_id', userId)
      .gte('session_date', thirtyDaysAgo)
      .order('session_date', { ascending: false })
      .limit(15)
  ]);
  
  // Analyze user's training patterns
  const trainingAnalysis = analyzeTrainingHistory(recentWorkouts || [], exerciseSets || [], trainingSessions || []);
  
  // Determine optimal plan based on user data
  const planConfig = determinePlanConfig(userProfile, trainingAnalysis, lastUserMsg);
  
  // Generate personalized workout plan
  const ultimateWorkoutPlan = generatePersonalizedPlan(planConfig, userProfile, trainingAnalysis);
  
  return {
    role: 'assistant',
    type: 'card',
    card: 'aresUltimateWorkoutPlan',
    payload: {
      plan: ultimateWorkoutPlan,
      user_input: lastUserMsg,
      created_at: new Date().toISOString(),
      analysis_summary: trainingAnalysis,
      ares_seal: '⚡ FORGED BY ARES SUPREME TRAINING INTELLIGENCE ⚡'
    },
    meta: { clearTool: true }
  };
}

interface TrainingAnalysis {
  avgWorkoutsPerWeek: number;
  preferredSplitTypes: string[];
  strongestMuscleGroups: string[];
  weakestMuscleGroups: string[];
  avgSessionDuration: number;
  totalVolumeProgression: 'increasing' | 'stable' | 'decreasing' | 'unknown';
  estimatedLevel: 'beginner' | 'intermediate' | 'advanced';
  maxLifts: Record<string, number>;
}

function analyzeTrainingHistory(workouts: any[], sets: any[], sessions: any[]): TrainingAnalysis {
  // Calculate workouts per week
  const avgWorkoutsPerWeek = workouts.length / 4; // Last 30 days
  
  // Determine preferred split types
  const splitCounts: Record<string, number> = {};
  sessions.forEach(s => {
    const type = s.split_type || 'unknown';
    splitCounts[type] = (splitCounts[type] || 0) + 1;
  });
  const preferredSplitTypes = Object.entries(splitCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => type);
  
  // Analyze muscle group performance from sets
  const muscleGroupVolume: Record<string, number> = {};
  sets.forEach(s => {
    // Simplified - in production, map exercise_id to muscle group
    const volume = (s.weight_kg || 0) * (s.reps || 0);
    muscleGroupVolume['general'] = (muscleGroupVolume['general'] || 0) + volume;
  });
  
  // Volume progression analysis
  let totalVolumeProgression: 'increasing' | 'stable' | 'decreasing' | 'unknown' = 'unknown';
  if (sessions.length >= 4) {
    const firstHalf = sessions.slice(sessions.length / 2).reduce((sum, s) => sum + (s.total_volume_kg || 0), 0);
    const secondHalf = sessions.slice(0, sessions.length / 2).reduce((sum, s) => sum + (s.total_volume_kg || 0), 0);
    if (secondHalf > firstHalf * 1.1) totalVolumeProgression = 'increasing';
    else if (secondHalf < firstHalf * 0.9) totalVolumeProgression = 'decreasing';
    else totalVolumeProgression = 'stable';
  }
  
  // Estimate training level
  let estimatedLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
  if (avgWorkoutsPerWeek >= 4 && sessions.length >= 10) estimatedLevel = 'advanced';
  else if (avgWorkoutsPerWeek >= 3 && sessions.length >= 5) estimatedLevel = 'intermediate';
  
  // Calculate max lifts
  const maxLifts: Record<string, number> = {};
  sets.forEach(s => {
    if (s.weight_kg) {
      const key = s.exercise_id || 'unknown';
      maxLifts[key] = Math.max(maxLifts[key] || 0, s.weight_kg);
    }
  });
  
  return {
    avgWorkoutsPerWeek,
    preferredSplitTypes: preferredSplitTypes.length ? preferredSplitTypes : ['push_pull_legs'],
    strongestMuscleGroups: ['chest', 'back'], // Default - would need exercise mapping
    weakestMuscleGroups: ['legs', 'shoulders'], // Default
    avgSessionDuration: workouts.length ? 
      workouts.reduce((sum, w) => sum + (w.duration_minutes || 60), 0) / workouts.length : 60,
    totalVolumeProgression,
    estimatedLevel,
    maxLifts
  };
}

interface PlanConfig {
  duration_weeks: number;
  training_days: number;
  focus: 'hypertrophy' | 'strength' | 'endurance' | 'hybrid';
  split_type: string;
  intensity_level: 'moderate' | 'high' | 'maximum';
  periodization: 'linear' | 'undulating' | 'block';
}

function determinePlanConfig(profile: any, analysis: TrainingAnalysis, userInput: string): PlanConfig {
  const input = userInput.toLowerCase();
  
  // Parse user preferences from input
  let focus: PlanConfig['focus'] = 'hypertrophy';
  if (/(kraft|strength|stärke)/.test(input)) focus = 'strength';
  if (/(ausdauer|endurance|cardio)/.test(input)) focus = 'endurance';
  if (/(hybrid|mixed|kombination)/.test(input)) focus = 'hybrid';
  if (/(masse|muscle|hypertrophie|aufbau)/.test(input)) focus = 'hypertrophy';
  
  // Determine training days based on profile or analysis
  let training_days = profile?.available_days_per_week || 
    Math.min(6, Math.max(3, Math.round(analysis.avgWorkoutsPerWeek + 1)));
  
  // Intensity based on level
  let intensity_level: PlanConfig['intensity_level'] = 'moderate';
  if (analysis.estimatedLevel === 'advanced') intensity_level = 'maximum';
  else if (analysis.estimatedLevel === 'intermediate') intensity_level = 'high';
  
  // Split type based on training days
  let split_type = 'push_pull_legs';
  if (training_days <= 3) split_type = 'full_body';
  else if (training_days === 4) split_type = 'upper_lower';
  else if (training_days >= 5) split_type = 'push_pull_legs';
  
  // Periodization based on level
  let periodization: PlanConfig['periodization'] = 'linear';
  if (analysis.estimatedLevel === 'advanced') periodization = 'block';
  else if (analysis.estimatedLevel === 'intermediate') periodization = 'undulating';
  
  return {
    duration_weeks: 12,
    training_days,
    focus,
    split_type,
    intensity_level,
    periodization
  };
}

function generatePersonalizedPlan(config: PlanConfig, profile: any, analysis: TrainingAnalysis) {
  const splitTemplates = getSplitTemplate(config.split_type, config.training_days);
  
  return {
    plan_name: `ARES ${config.focus.toUpperCase()} PROTOCOL`,
    phase: `${config.periodization.charAt(0).toUpperCase() + config.periodization.slice(1)} Periodization - ${config.focus}`,
    duration_weeks: config.duration_weeks,
    intensity_level: config.intensity_level.toUpperCase(),
    
    // Personalized philosophy based on user data
    training_philosophy: generatePhilosophy(config, analysis),
    
    // Weekly Structure
    weekly_structure: {
      training_days: config.training_days,
      recovery_days: 7 - config.training_days,
      split_type: config.split_type,
      total_weekly_volume: calculateWeeklyVolume(config, analysis)
    },
    
    // Training Split
    training_split: splitTemplates,
    
    // Nutrition integration based on profile
    nutrition_integration: {
      pre_workout: 'Carbs + Koffein 30-45min vorher',
      intra_workout: config.intensity_level === 'maximum' ? 'EAAs + Dextrose' : 'Wasser + Elektrolyte',
      post_workout: `${Math.round((profile?.weight || 80) * 0.4)}g Protein innerhalb 2h`
    },
    
    // Recovery protocols
    recovery_protocols: {
      sleep_optimization: `7-9h Schlaf, Schlafenszeit-Konsistenz`,
      stress_management: 'Aktive Recovery an Ruhetagen',
      deload_frequency: config.intensity_level === 'maximum' ? 'Alle 4 Wochen' : 'Alle 6 Wochen'
    },
    
    // Progression system
    progression_matrix: generateProgressionMatrix(config),
    
    // Success metrics
    expected_outcomes: generateExpectedOutcomes(config, analysis)
  };
}

function getSplitTemplate(splitType: string, days: number) {
  const templates: Record<string, any[]> = {
    full_body: [
      { day: 'TAG A - FULL BODY POWER', focus: 'Compound-Dominanz', muscle_groups: ['Ganzkörper'], volume_sets: '15-20', intensity: '75-85% 1RM', techniques: ['Grundübungen', 'Progressive Overload'] },
      { day: 'TAG B - FULL BODY VOLUME', focus: 'Hypertrophie', muscle_groups: ['Ganzkörper'], volume_sets: '18-22', intensity: '65-75% 1RM', techniques: ['Supersets', 'Iso-Holds'] },
      { day: 'TAG C - FULL BODY INTENSITY', focus: 'Kraftausdauer', muscle_groups: ['Ganzkörper'], volume_sets: '16-20', intensity: '70-80% 1RM', techniques: ['Rest-Pause', 'Drop Sets'] }
    ],
    upper_lower: [
      { day: 'UPPER POWER', focus: 'Oberkörper Kraft', muscle_groups: ['Brust', 'Rücken', 'Schultern', 'Arme'], volume_sets: '20-24', intensity: '80-90% 1RM', techniques: ['Cluster Sets', 'Heavy Singles'] },
      { day: 'LOWER POWER', focus: 'Unterkörper Kraft', muscle_groups: ['Quads', 'Glutes', 'Hamstrings', 'Waden'], volume_sets: '18-22', intensity: '80-90% 1RM', techniques: ['Pause Reps', 'Tempo Work'] },
      { day: 'UPPER HYPERTROPHY', focus: 'Oberkörper Volumen', muscle_groups: ['Brust', 'Rücken', 'Schultern', 'Arme'], volume_sets: '24-28', intensity: '65-75% 1RM', techniques: ['Supersets', 'Myo-Reps'] },
      { day: 'LOWER HYPERTROPHY', focus: 'Unterkörper Volumen', muscle_groups: ['Quads', 'Glutes', 'Hamstrings', 'Waden'], volume_sets: '22-26', intensity: '65-75% 1RM', techniques: ['Giant Sets', 'Blood Flow'] }
    ],
    push_pull_legs: [
      { day: 'PUSH - CHEST/SHOULDERS/TRICEPS', focus: 'Drückbewegungen', muscle_groups: ['Brust', 'Schultern', 'Trizeps'], volume_sets: '20-24', intensity: '70-85% 1RM', techniques: ['Compound First', 'Isolation Finish'] },
      { day: 'PULL - BACK/BICEPS/REAR DELTS', focus: 'Zugbewegungen', muscle_groups: ['Rücken', 'Bizeps', 'Hintere Schultern'], volume_sets: '22-26', intensity: '70-85% 1RM', techniques: ['Row Variations', 'Vertical/Horizontal Mix'] },
      { day: 'LEGS - QUADS/GLUTES/HAMS/CALVES', focus: 'Beinarbeit', muscle_groups: ['Quads', 'Glutes', 'Hamstrings', 'Waden'], volume_sets: '24-28', intensity: '70-85% 1RM', techniques: ['Squat Patterns', 'Hip Hinge', 'Isolation'] }
    ]
  };
  
  return templates[splitType] || templates.push_pull_legs;
}

function generatePhilosophy(config: PlanConfig, analysis: TrainingAnalysis): string[] {
  const philosophy: string[] = [];
  
  if (config.focus === 'hypertrophy') {
    philosophy.push('Volumen-fokussierte Progression mit TUT-Optimierung');
    philosophy.push('Mind-Muscle Connection in jeder Wiederholung');
  }
  if (config.focus === 'strength') {
    philosophy.push('Neurale Anpassung durch schwere Compound-Lifts');
    philosophy.push('Technik-Perfektion vor Gewichtssteigerung');
  }
  
  philosophy.push('Recovery als integraler Trainingsbestandteil');
  philosophy.push('Periodisierung für langfristigen Fortschritt');
  
  if (analysis.totalVolumeProgression === 'decreasing') {
    philosophy.push('Deload-Phase empfohlen - Regeneration priorisieren');
  }
  
  return philosophy;
}

function calculateWeeklyVolume(config: PlanConfig, analysis: TrainingAnalysis): string {
  const baseVolume = config.training_days * 6; // ~6 sets per muscle group per session
  const modifier = config.intensity_level === 'maximum' ? 1.2 : config.intensity_level === 'high' ? 1.0 : 0.8;
  const adjustedVolume = Math.round(baseVolume * modifier);
  return `${adjustedVolume - 4}-${adjustedVolume + 4} Sätze pro Muskelgruppe`;
}

function generateProgressionMatrix(config: PlanConfig) {
  if (config.periodization === 'linear') {
    return {
      week_1_3: 'Fundament + Technik-Aufbau',
      week_4_6: 'Progressive Volumen-Steigerung',
      week_7_9: 'Intensitäts-Eskalation',
      week_10_12: 'Peak + Deload'
    };
  }
  if (config.periodization === 'undulating') {
    return {
      pattern: 'Heavy → Volume → Power → Recovery',
      week_cycle: '4-Tage Mikrozyklus',
      progression: 'Wellenförmige Intensität für optimale Adaptation'
    };
  }
  return {
    block_1: 'Akkumulation (3 Wochen)',
    block_2: 'Transmutation (3 Wochen)',
    block_3: 'Realisierung (2 Wochen)',
    block_4: 'Repeat mit höherem Baseline'
  };
}

function generateExpectedOutcomes(config: PlanConfig, analysis: TrainingAnalysis): string[] {
  const outcomes: string[] = [];
  
  if (config.focus === 'hypertrophy') {
    outcomes.push('3-6 kg Muskelmasse-Zuwachs möglich (Anfänger/Intermediate)');
    outcomes.push('Verbesserte Muskel-Definition und Proportionen');
  }
  if (config.focus === 'strength') {
    outcomes.push('10-20% Kraftsteigerung in Hauptlifts');
    outcomes.push('Verbesserte neuromuskuläre Effizienz');
  }
  
  outcomes.push('Gesteigerte Trainingskapazität und Belastbarkeit');
  outcomes.push('Optimierte Bewegungsmuster und Verletzungsprävention');
  
  return outcomes;
}
