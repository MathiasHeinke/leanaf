import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

export default async function handleHeavyTrainingPlan(conv: any[], userId: string, args: any) {
  try {
    const { goal, training_days, experience_level, max_weights, focus_areas } = args;

    // Markus Rühl's Heavy Training Philosophy
    const heavyTrainingTemplate = generateHeavyTrainingPlan({
      goal: goal || 'mass_building',
      trainingDays: training_days || 4,
      experienceLevel: experience_level || 'intermediate', 
      maxWeights: max_weights || {},
      focusAreas: focus_areas || ['chest', 'back', 'legs']
    });

    // Store the plan
    const { data: planData, error } = await supabase
      .from('workout_plan_drafts')
      .insert({
        user_id: userId,
        plan_name: `Markus Rühl Heavy Training - ${goal}`,
        goal: goal || 'mass_building',
        days_per_week: training_days || 4,
        plan_structure: heavyTrainingTemplate,
        notes: 'Nach Markus Rühl Prinzipien: Schwere Grundübungen, 6-8 Wiederholungen, progressive Steigerung'
      })
      .select()
      .single();

    if (error) throw error;

    return {
      role: 'assistant',
      content: `**Markus Rühl Heavy Training Plan erstellt! 💪**

"Wenn du nach dem Satz noch lächeln kannst, war's zu leicht!" 

**Dein Plan:**
• **${heavyTrainingTemplate.split_type}** (${training_days} Tage/Woche)
• **Fokus:** Schwere Grundübungen mit 6-8 Wiederholungen
• **Prinzip:** Progressive Steigerung ohne Kompromisse

**Grundübungen stehen im Vordergrund:**
${heavyTrainingTemplate.weekly_structure.map((day: any) => 
  `**${day.day}:** ${day.focus} - ${day.main_exercises.join(', ')}`
).join('\n')}

**Markus' Regel:** Ego raus, Fokus auf Technik! Schwer trainieren heißt nicht schlampig trainieren.

Der Plan wurde als Entwurf gespeichert. Bereit für echtes Heavy Training? 🔥`,
      preview_card: {
        title: "Heavy Training Plan - Markus Rühl Style",
        description: `${training_days} Tage/Woche • Schwere Grundübungen • 6-8 Reps`,
        content: heavyTrainingTemplate.weekly_structure.map((day: any) => 
          `${day.day}: ${day.focus}`
        ).join(' | '),
        actions: [
          { label: "Plan starten", action: "start_workout_plan", data: { plan_id: planData.id } }
        ]
      }
    };

  } catch (error) {
    console.error('Error in heavyTrainingPlan:', error);
    return {
      role: 'assistant', 
      content: "Fehler beim Erstellen des Heavy Training Plans. Markus würde sagen: 'Nochmal versuchen, diesmal mit mehr Fokus!' 😤"
    };
  }
}

function generateHeavyTrainingPlan(params: any) {
  const { goal, trainingDays, experienceLevel, focusAreas } = params;

  // Markus Rühl's preferred split patterns
  const splitTemplates = {
    4: {
      split_type: "Heavy 4er-Split",
      weekly_structure: [
        {
          day: "Tag 1", 
          focus: "Brust/Trizeps",
          main_exercises: ["Bankdrücken", "Schrägbankdrücken", "Dips", "Enges Bankdrücken"],
          rep_range: "6-8",
          rest_between_sets: "3-4 Minuten"
        },
        {
          day: "Tag 2",
          focus: "Rücken/Bizeps", 
          main_exercises: ["Kreuzheben", "Klimmzüge", "Langhantelrudern", "Langhantel-Curls"],
          rep_range: "6-8",
          rest_between_sets: "3-4 Minuten"
        },
        {
          day: "Tag 3", 
          focus: "Beine",
          main_exercises: ["Kniebeugen", "Beinpresse", "Rumänisches Kreuzheben", "Wadenheben"],
          rep_range: "6-8 (Kniebeugen), 8-12 (Isolation)",
          rest_between_sets: "4-5 Minuten"
        },
        {
          day: "Tag 4",
          focus: "Schultern/Arme",
          main_exercises: ["Schulterdrücken", "Seitheben", "Langhantel-Curls", "French Press"],
          rep_range: "6-8 (Grundübungen), 8-10 (Isolation)",
          rest_between_sets: "3-4 Minuten"
        }
      ]
    },
    5: {
      split_type: "Heavy 5er-Split", 
      weekly_structure: [
        {
          day: "Tag 1",
          focus: "Brust",
          main_exercises: ["Bankdrücken", "Schrägbankdrücken", "Kurzhantel-Fliegende", "Dips"],
          rep_range: "6-8",
          rest_between_sets: "3-4 Minuten"
        },
        {
          day: "Tag 2", 
          focus: "Rücken",
          main_exercises: ["Kreuzheben", "Klimmzüge", "Langhantelrudern", "T-Bar Rudern"],
          rep_range: "6-8",
          rest_between_sets: "3-4 Minuten"
        },
        {
          day: "Tag 3",
          focus: "Beine", 
          main_exercises: ["Kniebeugen", "Beinpresse", "Rumänisches Kreuzheben", "Beinstrecker"],
          rep_range: "6-8 (Kniebeugen), 8-12 (Isolation)",
          rest_between_sets: "4-5 Minuten"
        },
        {
          day: "Tag 4",
          focus: "Schultern",
          main_exercises: ["Schulterdrücken", "Seitheben", "Vorgebeugtes Seitheben", "Upright Rows"],
          rep_range: "6-8 (Grundübungen), 8-10 (Isolation)", 
          rest_between_sets: "3-4 Minuten"
        },
        {
          day: "Tag 5",
          focus: "Arme",
          main_exercises: ["Langhantel-Curls", "French Press", "Hammer Curls", "Dips"],
          rep_range: "6-8 (Grundübungen), 8-10 (Isolation)",
          rest_between_sets: "3-4 Minuten"
        }
      ]
    },
    6: {
      split_type: "Heavy 6er-Split (Pro)",
      weekly_structure: [
        {
          day: "Tag 1",
          focus: "Brust",
          main_exercises: ["Bankdrücken", "Schrägbankdrücken", "Kurzhantel-Fliegende"],
          rep_range: "6-8",
          rest_between_sets: "3-4 Minuten"
        },
        {
          day: "Tag 2",
          focus: "Rücken", 
          main_exercises: ["Kreuzheben", "Klimmzüge", "Langhantelrudern"],
          rep_range: "6-8",
          rest_between_sets: "3-4 Minuten"
        },
        {
          day: "Tag 3",
          focus: "Schultern",
          main_exercises: ["Schulterdrücken", "Seitheben", "Vorgebeugtes Seitheben"],
          rep_range: "6-8 (Grundübungen), 8-10 (Isolation)",
          rest_between_sets: "3-4 Minuten"
        },
        {
          day: "Tag 4", 
          focus: "Beine",
          main_exercises: ["Kniebeugen", "Beinpresse", "Rumänisches Kreuzheben"],
          rep_range: "6-8 (Kniebeugen), 8-12 (Isolation)",
          rest_between_sets: "4-5 Minuten"
        },
        {
          day: "Tag 5",
          focus: "Bizeps/Trizeps",
          main_exercises: ["Langhantel-Curls", "French Press", "Hammer Curls"],
          rep_range: "6-8 (Grundübungen), 8-10 (Isolation)",
          rest_between_sets: "3-4 Minuten"
        },
        {
          day: "Tag 6",
          focus: "Waden/Bauch",
          main_exercises: ["Wadenheben stehend", "Wadenheben sitzend", "Planks"],
          rep_range: "12-15 (Waden), 15-20 (Bauch)",
          rest_between_sets: "2-3 Minuten"
        }
      ]
    }
  };

  const selectedTemplate = splitTemplates[trainingDays] || splitTemplates[4];

  return {
    ...selectedTemplate,
    principles: [
      "Grundübungen haben absolute Priorität",
      "6-8 Wiederholungen für maximale Kraft und Masse",
      "Progressive Steigerung jede Woche",
      "Saubere Technik vor schwerem Gewicht",
      "Lange Pausen zwischen schweren Sätzen",
      "Instinktives Training - auf den Körper hören"
    ],
    markus_rules: [
      "Wenn du nach dem Satz noch lächeln kannst, war's zu leicht!",
      "Ego raus, Fokus auf Technik!",
      "Jammern bringt nix - Hantel greifen und drücken!",
      "Basics statt Trends - bewährte Übungen funktionieren!"
    ],
    progression: {
      weekly_increase: "2.5-5kg bei Grundübungen",
      plateau_strategy: "Deload Woche mit 80% des Gewichts",
      form_check: "Video-Analyse bei schweren Gewichten empfohlen"
    }
  };
}