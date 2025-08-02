import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handleCreatePlanDraft(conv: any[], userId: string, args: any) {
  const { plan_name, goal, days_per_wk, notes } = args;
  
  try {
    console.log('Creating workout plan draft:', { plan_name, goal, days_per_wk, notes });
    
    // Generate a basic structure based on input
    const structure_json = {
      goal,
      days_per_week: days_per_wk || 3,
      estimated_duration: 45,
      target_level: 'intermediate',
      equipment_needed: ['Hanteln', 'Langhantel'],
      weekly_structure: generateWeeklyStructure(days_per_wk || 3, goal)
    };

    // Insert draft into database
    const { data: draft, error } = await supabase
      .from('workout_plan_drafts')
      .insert({
        user_id: userId,
        name: plan_name,
        goal,
        days_per_wk: days_per_wk || 3,
        notes: notes || '',
        structure_json
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating workout plan draft:', error);
      return {
        role: 'assistant',
        content: 'Fehler beim Erstellen des Trainingsplan-Entwurfs. Bitte versuche es erneut.',
      };
    }
    
    return {
      role: 'assistant',
      type: 'card',
      card: 'workout_plan_draft',
      payload: { 
        id: draft.id,
        name: draft.name,
        goal: draft.goal,
        days_per_wk: draft.days_per_wk,
        structure: draft.structure_json,
        html: `<div class="p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
          <h3 class="text-lg font-semibold text-primary mb-2">📋 Trainingsplan-Entwurf</h3>
          <p class="font-medium text-foreground mb-1">${draft.name}</p>
          <p class="text-sm text-muted-foreground mb-2">Ziel: ${draft.goal}</p>
          <p class="text-xs text-muted-foreground">${draft.days_per_wk} Tage pro Woche</p>
          <div class="mt-3 flex gap-2">
            <button class="px-3 py-1 bg-primary text-primary-foreground rounded text-xs">Bearbeiten</button>
            <button class="px-3 py-1 bg-success text-success-foreground rounded text-xs">Speichern</button>
          </div>
        </div>`,
        ts: Date.now()
      },
      meta: { clearTool: true }
    };
  } catch (error) {
    console.error('Error in createPlanDraft handler:', error);
    return {
      role: 'assistant',
      content: 'Ein Fehler ist aufgetreten beim Erstellen des Trainingsplan-Entwurfs.',
    };
  }
}

function generateWeeklyStructure(daysPerWeek: number, goal: string) {
  const structures: any = {
    2: [
      { day: 'Tag 1', focus: 'Ganzkörper A', exercises: ['Kniebeugen', 'Bankdrücken', 'Rudern'] },
      { day: 'Tag 2', focus: 'Ganzkörper B', exercises: ['Kreuzheben', 'Schulterdrücken', 'Klimmzüge'] }
    ],
    3: [
      { day: 'Tag 1', focus: 'Push (Brust, Schultern, Trizeps)', exercises: ['Bankdrücken', 'Schulterdrücken', 'Dips'] },
      { day: 'Tag 2', focus: 'Pull (Rücken, Bizeps)', exercises: ['Klimmzüge', 'Rudern', 'Bizeps Curls'] },
      { day: 'Tag 3', focus: 'Beine (Quadrizeps, Hamstrings, Glutes)', exercises: ['Kniebeugen', 'Kreuzheben', 'Ausfallschritte'] }
    ],
    4: [
      { day: 'Tag 1', focus: 'Push (Brust, Schultern, Trizeps)', exercises: ['Bankdrücken', 'Schulterdrücken', 'Dips'] },
      { day: 'Tag 2', focus: 'Pull (Rücken, Bizeps)', exercises: ['Klimmzüge', 'Rudern', 'Bizeps Curls'] },
      { day: 'Tag 3', focus: 'Beine (Quadrizeps, Hamstrings)', exercises: ['Kniebeugen', 'Kreuzheben', 'Beinpresse'] },
      { day: 'Tag 4', focus: 'Push 2 (Schultern, Trizeps)', exercises: ['Schulterdrücken', 'Seitheben', 'Trizeps Extensions'] }
    ]
  };
  
  return structures[daysPerWeek] || structures[3];
}