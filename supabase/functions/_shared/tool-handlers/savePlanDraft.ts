import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export default async function handleSavePlanDraft(conv: any[], userId: string, args: any) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { draft_id } = args;

    if (!draft_id) {
      throw new Error('Draft ID is required');
    }

    // Fetch the draft plan
    const { data: draftData, error: draftError } = await supabase
      .from('workout_plan_drafts')
      .select('*')
      .eq('id', draft_id)
      .eq('user_id', userId)
      .single();

    if (draftError || !draftData) {
      throw new Error('Draft plan not found or access denied');
    }

    // Convert draft to active workout plan
    const { data: planData, error: planError } = await supabase
      .from('workout_plans')
      .insert({
        created_by: userId,
        name: draftData.plan_name,
        category: draftData.goal || 'custom',
        description: draftData.notes || `Trainingsplan erstellt am ${new Date().toLocaleDateString('de-DE')}`,
        exercises: draftData.plan_structure?.weekly_structure?.flatMap((day: any) => 
          day.exercises?.map((ex: any) => ({
            name: ex.name || ex.exercise_name || 'Unbenannte Übung',
            sets: ex.sets || 3,
            reps: ex.reps || '8-12',
            weight: ex.weight || '',
            rpe: ex.rpe || null,
            rest_seconds: ex.rest_seconds || 120,
            day: day.day,
            focus: day.focus
          })) || []
        ) || [],
        estimated_duration: 60,
        difficulty_level: 'intermediate',
        tags: [draftData.goal || 'custom', 'coach-generated'],
        metadata: {
          source: 'coach_draft',
          original_structure: draftData.plan_structure,
          days_per_week: draftData.days_per_week || draftData.plan_structure?.weekly_structure?.length || 0
        }
      })
      .select()
      .single();

    if (planError) {
      console.error('Error creating workout plan:', planError);
      throw planError;
    }

    return {
      role: 'assistant',
      content: `**Trainingsplan erfolgreich gespeichert! ✅**

"${draftData.plan_name}" ist jetzt als aktiver Trainingsplan verfügbar.

**Was passiert jetzt:**
• Der Plan steht unter "Meine Trainingspläne" zur Verfügung
• Du kannst ihn jederzeit starten und Trainings protokollieren
• Alle Übungen und Gewichte sind bereits eingestellt

**Tipp:** Nutze die Trainingsprotokollierung, um deine Fortschritte zu verfolgen! 📈`
    };

  } catch (error) {
    console.error('Error in savePlanDraft:', error);
    return {
      role: 'assistant',
      content: `**Fehler beim Speichern** ❌

Der Trainingsplan konnte nicht gespeichert werden. Versuche es in ein paar Minuten erneut.`
    };
  }
}