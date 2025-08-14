import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
// Prefer service role in Edge Functions to satisfy RLS, fallback to anon in dev
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabaseKey = supabaseServiceKey ?? Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handleQuickWorkout(conv: any[], userId: string) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  
  console.log(`🛠️ TOOL quickworkout executed for`, userId, { message: lastUserMsg });
  
  try {
    // Extrahiere Workout-Daten aus der Nachricht
    const workoutData = extractWorkoutData(lastUserMsg);
    
    // Speichere in quick_workouts Tabelle
    const { data: workout, error } = await supabase.from('quick_workouts').insert({
      user_id: userId,
      description: workoutData.description,
      steps: workoutData.steps,
      distance_km: workoutData.distance,
      duration_minutes: workoutData.duration,
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    }).select().single();
    
    if (error) {
      console.error('Error saving quick workout:', error);
      return {
        role: 'assistant',
        content: 'Fehler beim Speichern des Quick-Workouts. Bitte versuche es erneut.',
      };
    }
    
    return {
      role: 'assistant',
      type: 'card',
      card: 'quickworkout',
      payload: { 
        description: workout.description,
        steps: workout.steps,
        distance: workout.distance_km,
        duration: workout.duration_minutes,
        html: `<div class="p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <h3 class="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">🏃 Quick-Workout erfasst</h3>
          <p class="text-green-700 dark:text-green-300 mb-2"><strong>${workout.description}</strong></p>
          ${workout.steps ? `<p class="text-sm text-green-600 dark:text-green-400">📱 ${workout.steps} Schritte</p>` : ''}
          ${workout.distance_km ? `<p class="text-sm text-green-600 dark:text-green-400">📏 ${workout.distance_km} km</p>` : ''}
          ${workout.duration_minutes ? `<p class="text-sm text-green-600 dark:text-green-400">⏱️ ${workout.duration_minutes} Minuten</p>` : ''}
        </div>`,
        ts: Date.now(),
        actions: [
          {
            label: 'Zum Trainingstagebuch',
            action: 'navigate',
            target: '/workout/history'
          }
        ]
      },
      meta: { clearTool: true }
    };
  } catch (error) {
    console.error('Error in quickworkout handler:', error);
    return {
      role: 'assistant',
      content: 'Ein Fehler ist aufgetreten beim Erfassen des Quick-Workouts.',
    };
  }
}

function extractWorkoutData(message: string): {
  description: string;
  steps: number | null;
  distance: number | null;
  duration: number | null;
} {
  const lowerMessage = message.toLowerCase();
  
  // Extrahiere Schritte
  const stepsMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:schritte|steps)/i);
  const steps = stepsMatch ? parseInt(stepsMatch[1]) : null;
  
  // Extrahiere Distanz
  const distanceMatch = message.match(/(\d+(?:[\.,]\d+)?)\s*(?:km|kilometer|meter|m)/i);
  let distance = null;
  if (distanceMatch) {
    const value = parseFloat(distanceMatch[1].replace(',', '.'));
    distance = lowerMessage.includes('meter') && !lowerMessage.includes('kilometer') ? value / 1000 : value;
  }
  
  // Extrahiere Dauer
  const durationMatch = message.match(/(\d+(?:[\.,]\d+)?)\s*(?:min|minuten|stunden|h)/i);
  let duration = null;
  if (durationMatch) {
    const value = parseFloat(durationMatch[1].replace(',', '.'));
    duration = lowerMessage.includes('stunden') || lowerMessage.includes(' h') ? value * 60 : value;
  }
  
  // Beschreibung generieren
  let description = 'Quick-Workout';
  if (lowerMessage.includes('jogg') || lowerMessage.includes('lauf')) {
    description = 'Joggen/Laufen';
  } else if (lowerMessage.includes('walk') || lowerMessage.includes('spazier')) {
    description = 'Spaziergang/Walking';
  } else if (lowerMessage.includes('cardio')) {
    description = 'Cardio-Training';
  }
  
  return { description, steps, distance, duration };
}