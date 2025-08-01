import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handleTrainingsplan(conv: any[], userId: string) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  
  try {
    // Extrahiere Trainingsplan-Informationen aus der Nachricht
    const planName = extractPlanName(lastUserMsg);
    const goals = extractGoals(lastUserMsg);
    
    // Erstelle Trainingsplan-Entry in der DB
    const { data: planData, error } = await supabase.from('workout_plans').insert({
      user_id: userId,
      name: planName,
      description: `Automatisch erstellt: ${lastUserMsg}`,
      goals: goals,
      created_at: new Date().toISOString(),
      is_active: true
    }).select().single();
    
    if (error) {
      console.error('Error saving workout plan:', error);
      return {
        role: 'assistant',
        content: 'Fehler beim Speichern des Trainingsplans. Bitte versuche es erneut.',
      };
    }
    
    return {
      role: 'assistant',
      type: 'card',
      card: 'workout_plan',
      payload: { 
        id: planData.id,
        name: planData.name,
        description: planData.description,
        goals: planData.goals,
        html: `<div class="p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 class="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">✅ Trainingsplan erstellt</h3>
          <p class="text-blue-700 dark:text-blue-300 mb-2"><strong>${planData.name}</strong></p>
          <p class="text-sm text-blue-600 dark:text-blue-400">${planData.description}</p>
          <div class="mt-3 text-xs text-blue-500 dark:text-blue-500">
            Ziele: ${Array.isArray(planData.goals) ? planData.goals.join(', ') : 'Allgemeine Fitness'}
          </div>
        </div>`,
        ts: Date.now()
      },
      meta: { clearTool: true }
    };
  } catch (error) {
    console.error('Error in trainingsplan handler:', error);
    return {
      role: 'assistant',
      content: 'Ein Fehler ist aufgetreten beim Erstellen des Trainingsplans.',
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