import { z } from 'zod';

// Training Plan Validation Schemas
export const TrainingExerciseSchema = z.object({
  name: z.string(),
  sets: z.string(),
  reps: z.string().optional(),
  weight: z.string().optional(),
  rpe: z.string().optional(),
  rest: z.string().optional(),
  notes: z.string().optional()
});

export const TrainingDaySchema = z.object({
  day: z.string(),
  focus: z.string(),
  exercises: z.array(TrainingExerciseSchema).optional()
});

export const TrainingPlanResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  goals: z.array(z.string()).min(1),
  plan: z.array(TrainingDaySchema).optional(),
  html: z.string().optional(),
  ts: z.number()
});

export const ToolResponseSchema = z.object({
  role: z.literal('assistant'),
  type: z.literal('card'),
  card: z.enum(['workout_plan', 'trainingsplan', 'plan']),
  payload: TrainingPlanResponseSchema,
  meta: z.object({
    clearTool: z.boolean().optional()
  }).optional()
});

export type TrainingExercise = z.infer<typeof TrainingExerciseSchema>;
export type TrainingDay = z.infer<typeof TrainingDaySchema>;
export type TrainingPlanResponse = z.infer<typeof TrainingPlanResponseSchema>;
export type ToolResponse = z.infer<typeof ToolResponseSchema>;

// HTML Sanitization utility
export function sanitizeHtml(html: string): string {
  // Basic HTML sanitization - in production, use a proper library like DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+="[^"]*"/gi, '');
}

// Training Plan HTML Generator
export function generateTrainingPlanHtml(planData: any, goals: string[]): string {
  const sanitizedName = planData.name?.replace(/[<>]/g, '') || 'Unbenannter Plan';
  const sanitizedDescription = planData.description?.replace(/[<>]/g, '') || '';
  
  return `<div class="p-4 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-lg border border-primary/20 dark:border-primary/30">
    <h3 class="text-lg font-semibold text-primary dark:text-primary mb-2">✅ Trainingsplan erstellt</h3>
    <p class="text-foreground dark:text-foreground mb-2"><strong>${sanitizedName}</strong></p>
    <p class="text-sm text-muted-foreground">${sanitizedDescription}</p>
    <div class="mt-3 text-xs text-muted-foreground">
      Ziele: ${Array.isArray(goals) ? goals.join(', ') : 'Allgemeine Fitness'}
    </div>
  </div>`;
}