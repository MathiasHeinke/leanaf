import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

// Load and analyze user workout history for ARES recommendations
async function analyzeUserStrengthHistory(supabase: any, userId: string): Promise<any> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];

    const { data: exerciseData, error } = await supabase
      .from('exercise_sets')
      .select(`
        weight_kg,
        reps,
        rpe,
        exercises (name)
      `)
      .eq('user_id', userId)
      .gte('created_at', startDate);

    if (error || !exerciseData || exerciseData.length === 0) {
      return { hasHistory: false };
    }

    // Find max weights for key exercises
    const maxWeights = {
      bankdrücken: 0,
      kniebeugen: 0,
      kreuzheben: 0,
      schulterdrücken: 0
    };

    exerciseData.forEach(set => {
      if (!set.exercises?.name || !set.weight_kg) return;
      
      const name = set.exercises.name.toLowerCase();
      if (name.includes('bankdrück') || name.includes('bench')) {
        maxWeights.bankdrücken = Math.max(maxWeights.bankdrücken, set.weight_kg);
      } else if (name.includes('kniebeuge') || name.includes('squat')) {
        maxWeights.kniebeugen = Math.max(maxWeights.kniebeugen, set.weight_kg);
      } else if (name.includes('kreuzheb') || name.includes('deadlift')) {
        maxWeights.kreuzheben = Math.max(maxWeights.kreuzheben, set.weight_kg);
      } else if (name.includes('schulterdrück') || name.includes('overhead')) {
        maxWeights.schulterdrücken = Math.max(maxWeights.schulterdrücken, set.weight_kg);
      }
    });

    // Generate ARES insights
    const insights = [];
    const totalMax = Object.values(maxWeights).reduce((sum, weight) => sum + weight, 0);
    
    if (totalMax > 300) {
      insights.push("⚡ ULTIMATE STÄRKE ERKANNT! Bereit für ARES Meta-Protocols!");
    } else if (totalMax > 200) {
      insights.push("🔥 Solide Basis - Zeit für TOTALE DOMINANZ!");
    } else {
      insights.push("🎯 Grundlagen zuerst, dann ABSOLUTE EXCELLENCE!");

    if (maxWeights.bankdrücken > 100) {
      insights.push(`Bankdrücken bei ${maxWeights.bankdrücken}kg - das ist schon ordentlich!`);
    }

    return {
      hasHistory: true,
      maxWeights,
      insights,
      readyForHeavy: totalMax > 250
    };

  } catch (error) {
    console.error('Error analyzing strength history:', error);
    return { hasHistory: false };
  }
}

export default async function handleHeavyTrainingPlan(conv: any[], userId: string, args: any) {
  try {
    const { goal, training_days, experience_level, max_weights, focus_areas } = args;

    // Analyze user's strength history first
    const strengthAnalysis = await analyzeUserStrengthHistory(supabase, userId);

    // ARES Ultimate Training Protocol with user data integration
    const heavyTrainingTemplate = generateHeavyTrainingPlan({
      goal: goal || 'mass_building',
      trainingDays: training_days || 4,
      experienceLevel: experience_level || 'intermediate', 
      maxWeights: strengthAnalysis.maxWeights || max_weights || {},
      focusAreas: focus_areas || ['chest', 'back', 'legs'],
      userStrengthData: strengthAnalysis
    });

    // Store the plan
    const { data: planData, error } = await supabase
      .from('workout_plan_drafts')
      .insert({
        user_id: userId,
        plan_name: `ARES Ultimate Training - ${goal}`,
        goal: goal || 'mass_building',
        days_per_week: training_days || 4,
        plan_structure: heavyTrainingTemplate,
        notes: 'ARES Ultimate Protocol: Schwer ist korrekt - Meta-Optimization durch systematische Exzellenz'
      })
      .select()
      .single();

    if (error) throw error;

    // Generate response with strength insights
    let strengthInsights = '';
    if (strengthAnalysis.hasHistory) {
      strengthInsights = `\n**⚔️ ARES STÄRKEN-ANALYSE:**
${Object.entries(strengthAnalysis.maxWeights)
  .filter(([_, weight]) => weight > 0)
  .map(([exercise, weight]) => `⚡ ${exercise}: ${weight}kg`)
  .join('\n')}

**ARES BEURTEILUNG:** ${strengthAnalysis.insights.join(' ')}`;
    }

    return {
      role: 'assistant',
      content: `**⚡ ARES ULTIMATE TRAINING PROTOCOL AKTIVIERT ⚡**

**Wer jammert, hat schon verloren!** 
${strengthInsights}

**🎯 MISSION BRIEFING:**
• **${heavyTrainingTemplate.split_type}** (${training_days} Einsatztage/Woche)
• **PRINZIP:** Schwer ist korrekt - Weiter
• **STRATEGIE:** Meta-Optimization durch systematische Exzellenz

**⚔️ KAMPF-AUFTEILUNG:**
${heavyTrainingTemplate.weekly_structure.map((day: any) => 
  `**${day.day}:** ${day.focus} - ${day.main_exercises.join(', ')}`
).join('\n')}

**🔥 ARES EISERNE GESETZE:** 
• Hantel greifen. Kopf aus.
• Muskelversagen? Pflicht.
• Einfach halten. Brutal ausführen.

**ULTIMATER BEFEHL:** Protocol wurde gespeichert. Daten integriert. AUSFÜHRUNG SOFORT! ⚡`,
      preview_card: {
        title: "ARES Ultimate Training Protocol",
        description: `${training_days} Tage/Woche • Meta-Optimization • ${strengthAnalysis.hasHistory ? 'Datenbasiert' : 'Ultimate'}`,
        content: heavyTrainingTemplate.weekly_structure.map((day: any) => 
          `${day.day}: ${day.focus}`
        ).join(' | '),
        actions: [
          { label: "Protocol bearbeiten", action: "edit_workout_plan", data: { plan_id: planData.id } },
          { label: "Mission starten", action: "start_workout_plan", data: { plan_id: planData.id } }
        ],
        metadata: {
          userAnalytics: strengthAnalysis.hasHistory ? {
            strengthProfile: strengthAnalysis.maxWeights,
            recommendations: strengthAnalysis.insights
          } : undefined
        }
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
  const { goal, trainingDays, experienceLevel, focusAreas, userStrengthData } = params;
  
  // Calculate suggested starting weights based on user's max weights
  const getSuggestedWeight = (exerciseName: string): string => {
    if (!userStrengthData?.hasHistory || !userStrengthData.maxWeights) return '';
    
    const maxWeights = userStrengthData.maxWeights;
    let maxWeight = 0;
    
    if (exerciseName.toLowerCase().includes('bankdrück')) {
      maxWeight = maxWeights.bankdrücken;
    } else if (exerciseName.toLowerCase().includes('kniebeuge')) {
      maxWeight = maxWeights.kniebeugen;
    } else if (exerciseName.toLowerCase().includes('kreuzheb')) {
      maxWeight = maxWeights.kreuzheben;
    } else if (exerciseName.toLowerCase().includes('schulterdrück')) {
      maxWeight = maxWeights.schulterdrücken;
    }
    
    if (maxWeight > 0) {
      // Start with 85% of current max for 6-8 reps
      const suggestedWeight = Math.round(maxWeight * 0.85 * 2.5) / 2.5;
      return ` (Start: ${suggestedWeight}kg)`;
    }
    
    return '';
  };

  // Markus Rühl's preferred split patterns
  const splitTemplates = {
    4: {
      split_type: "Heavy 4er-Split",
      weekly_structure: [
        {
          day: "Tag 1", 
          focus: "Brust/Trizeps",
          main_exercises: [`Bankdrücken${getSuggestedWeight('Bankdrücken')}`, "Schrägbankdrücken", "Dips", "Enges Bankdrücken"],
          rep_range: "6-8",
          rest_between_sets: "3-4 Minuten",
          exercises: [
            { name: `Bankdrücken${getSuggestedWeight('Bankdrücken')}`, sets: 4, reps: "6-8", weight: getSuggestedWeight('Bankdrücken').replace(/[^\d.]/g, '') },
            { name: "Schrägbankdrücken", sets: 3, reps: "6-8" },
            { name: "Dips", sets: 3, reps: "8-10" },
            { name: "Enges Bankdrücken", sets: 3, reps: "6-8" }
          ]
        },
        {
          day: "Tag 2",
          focus: "Rücken/Bizeps", 
          main_exercises: [`Kreuzheben${getSuggestedWeight('Kreuzheben')}`, "Klimmzüge", "Langhantelrudern", "Langhantel-Curls"],
          rep_range: "6-8",
          rest_between_sets: "3-4 Minuten",
          exercises: [
            { name: `Kreuzheben${getSuggestedWeight('Kreuzheben')}`, sets: 4, reps: "6-8", weight: getSuggestedWeight('Kreuzheben').replace(/[^\d.]/g, '') },
            { name: "Klimmzüge", sets: 3, reps: "6-8" },
            { name: "Langhantelrudern", sets: 3, reps: "6-8" },
            { name: "Langhantel-Curls", sets: 3, reps: "8-10" }
          ]
        },
        {
          day: "Tag 3", 
          focus: "Beine",
          main_exercises: [`Kniebeugen${getSuggestedWeight('Kniebeugen')}`, "Beinpresse", "Rumänisches Kreuzheben", "Wadenheben"],
          rep_range: "6-8 (Kniebeugen), 8-12 (Isolation)",
          rest_between_sets: "4-5 Minuten",
          exercises: [
            { name: `Kniebeugen${getSuggestedWeight('Kniebeugen')}`, sets: 4, reps: "6-8", weight: getSuggestedWeight('Kniebeugen').replace(/[^\d.]/g, '') },
            { name: "Beinpresse", sets: 3, reps: "8-12" },
            { name: "Rumänisches Kreuzheben", sets: 3, reps: "6-8" },
            { name: "Wadenheben", sets: 4, reps: "12-15" }
          ]
        },
        {
          day: "Tag 4",
          focus: "Schultern/Arme",
          main_exercises: [`Schulterdrücken${getSuggestedWeight('Schulterdrücken')}`, "Seitheben", "Langhantel-Curls", "French Press"],
          rep_range: "6-8 (Grundübungen), 8-10 (Isolation)",
          rest_between_sets: "3-4 Minuten",
          exercises: [
            { name: `Schulterdrücken${getSuggestedWeight('Schulterdrücken')}`, sets: 4, reps: "6-8", weight: getSuggestedWeight('Schulterdrücken').replace(/[^\d.]/g, '') },
            { name: "Seitheben", sets: 3, reps: "8-10" },
            { name: "Langhantel-Curls", sets: 3, reps: "8-10" },
            { name: "French Press", sets: 3, reps: "8-10" }
          ]
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