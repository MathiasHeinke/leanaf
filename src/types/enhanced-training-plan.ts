import { z } from 'zod';

// ============================================
// Enhanced Training Plan Schema v1
// ============================================

// Set Plan Schema - einzelner Satz mit allen Progression-Details
export const SetPlanSchema = z.object({
  setNumber: z.number().min(1),
  targetReps: z.number().optional(),
  targetRepsRange: z.string().optional(), // "8-12", "6-8"
  targetLoadKg: z.number().optional(),
  targetPct1RM: z.number().min(0).max(100).optional(),
  targetRPE: z.number().min(1).max(10).optional(),
  targetRIR: z.number().min(0).max(5).optional(),
  tempo: z.string().optional(), // "3-1-2-1"
  restSeconds: z.number().default(120),
  isWarmup: z.boolean().default(false),
  progressionRule: z.object({
    type: z.enum(['linear', 'wave', 'autoregulation']).default('linear'),
    increment: z.number().optional(), // kg per week
    rpeProgression: z.boolean().default(false)
  }).default({ type: 'linear', rpeProgression: false })
});

// Exercise Schema - erweitert mit wissenschaftlichen Details
export const TrainingExerciseSchema = z.object({
  id: z.string().uuid().optional(),
  exerciseName: z.string().min(1),
  exerciseType: z.enum(['strength', 'cardio', 'mobility']).default('strength'),
  muscleGroups: z.array(z.string()).default([]),
  equipment: z.array(z.string()).default([]),
  position: z.number().default(1),
  isSuperset: z.boolean().default(false),
  supersetGroup: z.string().optional(),
  progressionType: z.enum(['linear', 'wave', 'autoregulation']).default('linear'),
  sets: z.array(SetPlanSchema).min(1),
  notes: z.string().optional()
});

// Training Day Schema - einzelner Trainingstag
export const TrainingDaySchema = z.object({
  id: z.string().uuid().optional(),
  dayId: z.string(), // 'mon', 'tue', etc.
  dayName: z.string(),
  focus: z.string().optional(), // 'Push', 'Pull', 'Legs'
  position: z.number().default(1),
  isRestDay: z.boolean().default(false),
  exercises: z.array(TrainingExerciseSchema).default([])
});

// Complete Training Plan Schema
export const EnhancedTrainingPlanSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  planType: z.enum(['strength', 'hypertrophy', 'endurance', 'powerlifting', 'bodybuilding', 'custom']).default('custom'),
  durationWeeks: z.number().min(1).max(52).default(4),
  targetFrequency: z.number().min(1).max(7).default(3),
  goals: z.array(z.string()).min(1),
  days: z.array(TrainingDaySchema),
  scientificBasis: z.object({
    methodology: z.string().optional(), // "Nippard Evidence-Based", "Mentzer HIT"
    researchCitations: z.array(z.string()).default([]),
    appliedPrinciples: z.array(z.string()).default([])
  }).default({ researchCitations: [], appliedPrinciples: [] }),
  progressionScheme: z.object({
    type: z.enum(['linear', 'block', 'undulating', 'autoregulation']).default('linear'),
    volumeProgression: z.boolean().default(true),
    intensityProgression: z.boolean().default(true),
    frequencyAdjustment: z.boolean().default(false)
  }).default({ 
    type: 'linear', 
    volumeProgression: true, 
    intensityProgression: true, 
    frequencyAdjustment: false 
  }),
  status: z.enum(['draft', 'active', 'completed', 'archived']).default('draft'),
  ts: z.number(),
  html: z.string().optional(),
  actions: z.array(z.object({
    label: z.string(),
    variant: z.enum(['confirm', 'reject', 'edit']),
    action: z.enum(['accept', 'decline', 'customize']).optional()
  })).optional()
});

// User Strength Profile Schema
export const UserStrengthProfileSchema = z.object({
  userId: z.string().uuid(),
  exerciseName: z.string(),
  totalSessions: z.number(),
  avgEstimated1RM: z.number().optional(),
  maxEstimated1RM: z.number().optional(),
  avgRPE: z.number().optional(),
  avgVolumeLoad: z.number().optional(),
  avgRPEStrength: z.number().optional(), // 1-5 reps
  avgRPEHypertrophy: z.number().optional(), // 6-12 reps
  avgRPEEndurance: z.number().optional(), // 12+ reps
  lastTrainingWeek: z.string().optional(),
  strengthLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional()
});

// Tool Response Schema for Coach Integration
export const EnhancedToolResponseSchema = z.object({
  role: z.literal('assistant'),
  type: z.literal('card'),
  card: z.enum(['training_plan', 'workout_plan', 'trainingsplan']),
  payload: EnhancedTrainingPlanSchema,
  meta: z.object({
    clearTool: z.boolean().optional(),
    coachId: z.string().optional(),
    generationMethod: z.enum(['ai', 'template', 'hybrid']).default('hybrid')
  }).optional()
});

// Exercise Template Schema
export const ExerciseTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: z.enum(['compound', 'isolation', 'cardio']),
  primaryMuscles: z.array(z.string()),
  secondaryMuscles: z.array(z.string()).default([]),
  equipment: z.array(z.string()).default([]),
  difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
  biomechanics: z.record(z.string(), z.any()).default({}),
  researchCitations: z.array(z.string()).default([]),
  loadProgression: z.record(z.string(), z.any()).default({}),
  volumeGuidelines: z.record(z.string(), z.any()).default({}),
  frequencyGuidelines: z.record(z.string(), z.any()).default({}),
  genderModifications: z.record(z.string(), z.any()).default({})
});

// Training History Schema
export const TrainingHistorySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  exerciseName: z.string(),
  date: z.string(), // ISO date
  setsPerformed: z.number(),
  repsPerformed: z.number(),
  loadKg: z.number(),
  rpeActual: z.number().min(1).max(10).optional(),
  rirActual: z.number().min(0).max(5).optional(),
  estimated1RM: z.number().optional(),
  volumeLoad: z.number(),
  sessionId: z.string().uuid().optional()
});

// Export Types
export type SetPlan = z.infer<typeof SetPlanSchema>;
export type TrainingExercise = z.infer<typeof TrainingExerciseSchema>;
export type TrainingDay = z.infer<typeof TrainingDaySchema>;
export type EnhancedTrainingPlan = z.infer<typeof EnhancedTrainingPlanSchema>;
export type UserStrengthProfile = z.infer<typeof UserStrengthProfileSchema>;
export type EnhancedToolResponse = z.infer<typeof EnhancedToolResponseSchema>;
export type ExerciseTemplate = z.infer<typeof ExerciseTemplateSchema>;
export type TrainingHistory = z.infer<typeof TrainingHistorySchema>;

// Utility Functions
export function calculateEstimated1RM(weight: number, reps: number, rpe?: number): number {
  // Brzycki formula with RPE adjustment
  if (reps === 1) return weight;
  
  let baseEstimate = weight * (36 / (37 - reps));
  
  // RPE adjustment (simplified)
  if (rpe) {
    const rirEstimate = 10 - rpe;
    const adjustmentFactor = 1 + (rirEstimate * 0.025); // ~2.5% per RIR
    baseEstimate *= adjustmentFactor;
  }
  
  return Math.round(baseEstimate * 10) / 10;
}

export function generateSetProgression(
  baseReps: number, 
  baseLoad: number, 
  sets: number, 
  progressionType: 'pyramid' | 'straight' | 'reverse_pyramid' = 'pyramid'
): SetPlan[] {
  const setPlans: SetPlan[] = [];
  
  for (let i = 0; i < sets; i++) {
    let reps = baseReps;
    let load = baseLoad;
    
    switch (progressionType) {
      case 'pyramid':
        // Increase weight, decrease reps
        reps = Math.max(baseReps - i, 1);
        load = baseLoad + (i * 2.5);
        break;
      case 'reverse_pyramid':
        // Start heavy, then lighter
        if (i === 0) {
          reps = Math.max(baseReps - 2, 1);
          load = baseLoad + 5;
        } else {
          reps = baseReps + i;
          load = Math.max(baseLoad - (i * 2.5), baseLoad * 0.7);
        }
        break;
      case 'straight':
      default:
        // Same reps and weight
        reps = baseReps;
        load = baseLoad;
        break;
    }
    
    setPlans.push({
      setNumber: i + 1,
      targetReps: reps,
      targetLoadKg: load,
      targetRPE: 7 + i, // Progressive RPE
      targetRIR: Math.max(3 - i, 1),
      restSeconds: i === 0 ? 90 : 120,
      isWarmup: false,
      progressionRule: {
        type: 'linear',
        increment: 2.5,
        rpeProgression: false
      }
    });
  }
  
  return setPlans;
}