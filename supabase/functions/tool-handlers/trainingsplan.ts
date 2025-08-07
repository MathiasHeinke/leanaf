import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

// Main handler for creating general training plans
export default async function handleTrainingsplan(conv: any[], userId: string, args: any) {
  try {
    console.log('[Trainingsplan Tool] Processing request for userId:', userId);
    console.log('[Trainingsplan Tool] Arguments:', args);

    // Extract parameters with defaults
    const {
      goal = 'hypertrophy',
      experience_years = 2,
      days_per_week = 4,
      time_per_session = 60,
      equipment = ['barbell', 'dumbbells', 'machines'],
      preferences = []
    } = args;

    // Validate required parameters
    if (!userId) {
      return {
        role: 'assistant',
        content: 'Fehler: Benutzer-ID fehlt für die Trainingsplanerstellung.'
      };
    }

    // Generate training plan based on parameters
    const planData = await generateTrainingPlan({
      goal,
      experienceYears: experience_years,
      daysPerWeek: days_per_week,
      timePerSession: time_per_session,
      equipment,
      preferences,
      userId
    });

    // Save plan to database
    const { data: savedPlan, error: saveError } = await supabase
      .from('workout_plan_drafts')
      .insert({
        user_id: userId,
        name: planData.name,
        goal: planData.goal,
        days_per_wk: planData.daysPerWeek,
        structure: planData.structure,
        metadata: {
          generated_by: 'trainingsplan_tool',
          coach: 'general',
          parameters: args
        }
      })
      .select()
      .single();

    if (saveError) {
      console.error('[Trainingsplan Tool] Save error:', saveError);
      return {
        role: 'assistant',
        content: 'Fehler beim Speichern des Trainingsplans. Bitte versuche es erneut.'
      };
    }

    console.log('[Trainingsplan Tool] Plan saved successfully:', savedPlan.id);

    // Return structured response with plan data
    return {
      role: 'assistant',
      content: `Perfekt! Ich habe einen ${planData.daysPerWeek}-Tage ${planData.goal}-Plan für dich erstellt. Der Plan berücksichtigt deine ${experience_years} Jahre Trainingserfahrung und ${time_per_session} Minuten pro Session.

**${planData.name}**

${planData.structure.description || 'Dein personalisierter Trainingsplan wurde basierend auf deinen Angaben erstellt.'}

Der Plan ist als Entwurf gespeichert und kann bearbeitet werden.`,
      planData: {
        id: savedPlan.id,
        ...planData
      }
    };

  } catch (error) {
    console.error('[Trainingsplan Tool] Error:', error);
    return {
      role: 'assistant',
      content: 'Es gab einen Fehler bei der Erstellung deines Trainingsplans. Bitte versuche es erneut oder gib mir mehr Details zu deinen Wünschen.'
    };
  }
}

// Generate a general training plan
async function generateTrainingPlan(params: any) {
  const { goal, experienceYears, daysPerWeek, timePerSession, equipment, preferences, userId } = params;

  // Create plan name
  const planName = `${daysPerWeek}-Tage ${goal === 'hypertrophy' ? 'Muskelaufbau' : goal === 'strength' ? 'Kraftaufbau' : 'Fitness'} Plan`;

  // Generate basic structure based on days
  let weeklyStructure = [];
  
  if (daysPerWeek === 3) {
    weeklyStructure = [
      {
        day: 'Tag 1',
        focus: 'Ganzkörper A',
        exercises: [
          'Kniebeugen oder Beinpresse',
          'Bankdrücken oder Liegestütze',
          'Rudern oder Klimmzüge',
          'Schulterdrücken',
          'Planks'
        ]
      },
      {
        day: 'Tag 2',
        focus: 'Ganzkörper B',
        exercises: [
          'Kreuzheben oder Rumänisches Kreuzheben',
          'Schrägbankdrücken oder Dips',
          'Lat-Pulldown oder Klimmzüge',
          'Seitliche Raises',
          'Bizeps Curls',
          'Trizeps Extensions'
        ]
      },
      {
        day: 'Tag 3',
        focus: 'Ganzkörper C',
        exercises: [
          'Ausfallschritte oder Bulgarische Split Squats',
          'Fliegende oder Butterfly',
          'T-Bar Rudern oder Cable Rows',
          'Arnold Press',
          'Bauchübungen'
        ]
      }
    ];
  } else if (daysPerWeek === 4) {
    weeklyStructure = [
      {
        day: 'Tag 1',
        focus: 'Brust & Trizeps',
        exercises: [
          'Bankdrücken',
          'Schrägbankdrücken',
          'Dips oder Trizeps Drücken',
          'Fliegende',
          'Trizeps Extensions'
        ]
      },
      {
        day: 'Tag 2',
        focus: 'Rücken & Bizeps',
        exercises: [
          'Klimmzüge oder Lat-Pulldown',
          'Rudern',
          'T-Bar Rudern',
          'Bizeps Curls',
          'Hammer Curls'
        ]
      },
      {
        day: 'Tag 3',
        focus: 'Beine',
        exercises: [
          'Kniebeugen',
          'Rumänisches Kreuzheben',
          'Beinpresse',
          'Ausfallschritte',
          'Wadenheben'
        ]
      },
      {
        day: 'Tag 4',
        focus: 'Schultern & Bauch',
        exercises: [
          'Schulterdrücken',
          'Seitliche Raises',
          'Vorgebeugtes Fliegen',
          'Shrugs',
          'Planks',
          'Bauchübungen'
        ]
      }
    ];
  } else if (daysPerWeek === 5) {
    weeklyStructure = [
      { day: 'Tag 1', focus: 'Brust', exercises: ['Bankdrücken', 'Schrägbankdrücken', 'Dips', 'Fliegende', 'Cable Crossover'] },
      { day: 'Tag 2', focus: 'Rücken', exercises: ['Kreuzheben', 'Klimmzüge', 'Rudern', 'T-Bar Rudern', 'Lat-Pulldown'] },
      { day: 'Tag 3', focus: 'Beine', exercises: ['Kniebeugen', 'Beinpresse', 'Ausfallschritte', 'Beinstrecker', 'Wadenheben'] },
      { day: 'Tag 4', focus: 'Schultern', exercises: ['Schulterdrücken', 'Seitliche Raises', 'Vorgebeugtes Fliegen', 'Upright Rows', 'Shrugs'] },
      { day: 'Tag 5', focus: 'Arme & Bauch', exercises: ['Bizeps Curls', 'Hammer Curls', 'Trizeps Extensions', 'Dips', 'Planks'] }
    ];
  }

  // Add training principles based on goal and experience
  const principles = [];
  
  if (goal === 'hypertrophy') {
    principles.push('8-12 Wiederholungen für Muskelaufbau');
    principles.push('3-4 Sätze pro Übung');
    principles.push('60-90 Sekunden Pause zwischen Sätzen');
  } else if (goal === 'strength') {
    principles.push('3-6 Wiederholungen für Kraftaufbau');
    principles.push('4-5 Sätze pro Übung');
    principles.push('2-3 Minuten Pause zwischen Sätzen');
  }

  if (experienceYears < 2) {
    principles.push('Fokus auf saubere Technik');
    principles.push('Progressive Steigerung der Gewichte');
  } else {
    principles.push('Erweiterte Intensitätstechniken möglich');
    principles.push('Variation in Übungsauswahl');
  }

  return {
    name: planName,
    goal,
    daysPerWeek,
    structure: {
      weekly_structure: weeklyStructure,
      principles,
      description: `Ein ${daysPerWeek}-Tage-Plan für ${goal === 'hypertrophy' ? 'Muskelaufbau' : goal}. Angepasst an ${experienceYears} Jahre Trainingserfahrung mit ${timePerSession} Minuten pro Session.`
    },
    analysis: `Dieser Plan wurde basierend auf deinen Angaben erstellt: ${experienceYears} Jahre Erfahrung, ${daysPerWeek} Trainingstage pro Woche, ${timePerSession} Minuten pro Session. Der Fokus liegt auf ${goal === 'hypertrophy' ? 'Muskelaufbau' : goal}.`
  };
}