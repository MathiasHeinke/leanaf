import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@latest';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Training Plan Validation Schema
const TrainingPlanResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  goals: z.array(z.string()).min(1),
  html: z.string().optional(),
  ts: z.number(),
  actions: z.array(z.object({
    label: z.string(),
    variant: z.enum(['confirm', 'reject']),
    onClick: z.function().optional()
  })).optional()
});

const ToolResponseSchema = z.object({
  role: z.literal('assistant'),
  type: z.literal('card'),
  card: z.enum(['workout_plan', 'trainingsplan', 'plan']),
  payload: TrainingPlanResponseSchema,
  meta: z.object({
    clearTool: z.boolean().optional()
  }).optional()
});

type TrainingPlanResponse = z.infer<typeof TrainingPlanResponseSchema>;
type ToolResponse = z.infer<typeof ToolResponseSchema>;

export default async function handleTrainingsplan(conv: any[], userId: string) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  
  try {
    // Extrahiere Trainingsplan-Informationen aus der Nachricht
    const planName = extractPlanName(lastUserMsg);
    const goals = extractGoals(lastUserMsg);
    
    // Erstelle Trainingsplan-Entry in der DB
    const { data: planData, error } = await supabase.from('workout_plans').insert({
      created_by: userId,               // <- Spaltenname in DB
      name: planName,
      category: goals[0] ?? 'Allgemein',  // Pflichtfeld „category"
      description: [
        `Automatisch erstellt am ${new Date().toLocaleDateString('de-DE')}`,
        goals.length ? `Ziel(e): ${goals.join(', ')}` : ''
      ].join('\n').trim(),
      exercises: [],                   // leeres JSON = Draft
      estimated_duration_minutes: null,
      is_public: false
    }).select().single();
    
    if (error) {
      console.error('[trainingsplan]', error);
      return {
        role: 'assistant',
        content: 'Uups – der Plan wurde nicht gespeichert. Ich prüfe gerade die Datenbank-Felder und versuche es gleich nochmal!',
      };
    }
    
    // Create validated payload with actions
    const payload: TrainingPlanResponse = {
      id: planData.id,
      name: planData.name,
      description: planData.description,
      goals,
      html: generatePlanHtml(planData, goals),
      ts: Date.now(),
      actions: [
        {
          label: '✏️ Plan bearbeiten',
          variant: 'confirm' as const
        },
        {
          label: '📋 Plan aktivieren', 
          variant: 'confirm' as const
        }
      ]
    };

    // Validate the entire response
    const response: ToolResponse = {
      role: 'assistant',
      type: 'card',
      card: 'workout_plan',
      payload,
      meta: { clearTool: true }
    };
    
    const validatedResponse = ToolResponseSchema.parse(response);
    return validatedResponse;
  } catch (error) {
    console.error('Error in trainingsplan handler:', error);
    
    // Return a fallback response that doesn't break the UI
    return {
      role: 'assistant',
      type: 'card' as const,
      card: 'workout_plan' as const,
      payload: {
        id: crypto.randomUUID(),
        name: 'Fehler beim Erstellen',
        description: 'Ein Fehler ist aufgetreten beim Erstellen des Trainingsplans.',
        goals: ['Allgemein'],
        html: generateErrorHtml(error),
        ts: Date.now(),
        actions: []
      },
      meta: { clearTool: true }
    };
  }
}

function extractPlanName(message: string): string {
  // Einfache Extraktion des Plan-Namens
  const matches = message.match(/plan.{0,10}(?:für|mit|zum|zur)?\s*([a-zA-ZäöüÄÖÜ\s]+)/i);
  if (matches && matches[1]) {
    return matches[1].trim().slice(0, 50);
  }
  return `Trainingsplan ${new Date().toLocaleDateString('de-DE')}`;
}

function extractGoals(message: string): string[] {
  const goals: string[] = [];
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('abnehm') || lowerMessage.includes('gewicht')) {
    goals.push('Gewichtsverlust');
  }
  if (lowerMessage.includes('muskel') || lowerMessage.includes('masse')) {
    goals.push('Muskelaufbau');
  }
  if (lowerMessage.includes('kraft')) {
    goals.push('Kraftsteigerung');
  }
  if (lowerMessage.includes('ausdauer') || lowerMessage.includes('cardio')) {
    goals.push('Ausdauer');
  }
  if (lowerMessage.includes('definition') || lowerMessage.includes('straff')) {
    goals.push('Definition');
  }
  
  return goals.length > 0 ? goals : ['Allgemeine Fitness'];
}

function generatePlanHtml(planData: any, goals: string[]): string {
  const sanitizedName = planData.name?.replace(/[<>]/g, '') || 'Unbenannter Plan';
  const sanitizedDescription = planData.description?.replace(/[<>]/g, '') || '';
  
  return `<div class="p-4 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-lg border border-primary/20 dark:border-primary/30">
    <h3 class="text-lg font-semibold text-primary dark:text-primary mb-2">✅ Trainingsplan erstellt</h3>
    <p class="text-foreground dark:text-foreground mb-2"><strong>${sanitizedName}</strong></p>
    <p class="text-sm text-muted-foreground">${sanitizedDescription}</p>
    <div class="mt-3 text-xs text-muted-foreground">
      Ziele: ${Array.isArray(goals) ? goals.join(', ') : 'Allgemeine Fitness'}
    </div>
    <div class="mt-4 p-3 bg-background/50 rounded-md">
      <p class="text-xs text-muted-foreground">Plan-ID: ${planData.id}</p>
      <p class="text-xs text-muted-foreground">Erstellt: ${new Date().toLocaleDateString('de-DE')}</p>
    </div>
  </div>`;
}

function generateErrorHtml(error: any): string {
  return `<div class="p-4 bg-gradient-to-r from-destructive/10 to-destructive/5 dark:from-destructive/20 dark:to-destructive/10 rounded-lg border border-destructive/20 dark:border-destructive/30">
    <h3 class="text-lg font-semibold text-destructive dark:text-destructive mb-2">❌ Fehler aufgetreten</h3>
    <p class="text-sm text-muted-foreground">Der Trainingsplan konnte nicht erstellt werden.</p>
    <p class="text-xs text-muted-foreground mt-2">Bitte versuchen Sie es erneut oder kontaktieren Sie den Support.</p>
  </div>`;
}