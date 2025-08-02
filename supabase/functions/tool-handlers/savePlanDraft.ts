import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handleSavePlanDraft(conv: any[], userId: string, args: any) {
  const { draft_id } = args;
  
  try {
    console.log('Saving workout plan draft:', { draft_id, userId });
    
    // Get the draft
    const { data: draft, error: fetchError } = await supabase
      .from('workout_plan_drafts')
      .select('*')
      .eq('id', draft_id)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (fetchError || !draft) {
      console.error('Error fetching draft:', fetchError);
      return {
        role: 'assistant',
        content: 'Entwurf nicht gefunden oder Zugriff verweigert.',
      };
    }
    
    // Save to workout_plans table
    const { error: saveError } = await supabase
      .from('workout_plans')
      .insert({
        user_id: userId,
        name: draft.name,
        description: `${draft.goal} - ${draft.days_per_wk} Tage pro Woche`,
        category: inferCategory(draft.goal),
        exercises: draft.structure_json?.weekly_structure || [],
        estimated_duration: draft.structure_json?.estimated_duration || 45,
        is_active: true,
        created_at: new Date().toISOString()
      });
    
    if (saveError) {
      console.error('Error saving workout plan:', saveError);
      return {
        role: 'assistant',
        content: 'Fehler beim Speichern des Trainingsplans. Bitte versuche es erneut.',
      };
    }
    
    // Optional: Delete or mark draft as saved
    await supabase
      .from('workout_plan_drafts')
      .delete()
      .eq('id', draft_id)
      .eq('user_id', userId);
    
    return {
      role: 'assistant',
      content: `✅ Trainingsplan **${draft.name}** wurde erfolgreich gespeichert und ist jetzt aktiv!`,
      meta: { clearTool: true }
    };
  } catch (error) {
    console.error('Error in savePlanDraft handler:', error);
    return {
      role: 'assistant',
      content: 'Ein Fehler ist aufgetreten beim Speichern des Trainingsplans.',
    };
  }
}

function inferCategory(goal: string): string {
  const lowerGoal = goal.toLowerCase();
  
  if (lowerGoal.includes('muskel') || lowerGoal.includes('mass')) {
    return 'Muskelaufbau';
  } else if (lowerGoal.includes('kraft') || lowerGoal.includes('power')) {
    return 'Krafttraining';
  } else if (lowerGoal.includes('abnehm') || lowerGoal.includes('fett')) {
    return 'Fettabbau';
  } else if (lowerGoal.includes('ausdauer') || lowerGoal.includes('cardio')) {
    return 'Ausdauer';
  } else {
    return 'Allgemeine Fitness';
  }
}