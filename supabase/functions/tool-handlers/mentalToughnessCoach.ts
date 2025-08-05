import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

export default async function handleMentalToughnessCoach(conv: any[], userId: string, args: any) {
  try {
    const { 
      challenge_type, 
      motivation_level, 
      specific_problem,
      training_phase,
      recent_setback
    } = args;

    // Markus Rühl's Mental Toughness Coaching
    const coachingResponse = provideMentalCoaching({
      challengeType: challenge_type || 'lack_motivation',
      motivationLevel: motivation_level || 3,
      specificProblem: specific_problem || '',
      trainingPhase: training_phase || 'mass_building',
      recentSetback: recent_setback || false
    });

    // Log the coaching session for tracking
    const { error: logError } = await supabase
      .from('coach_recommendations')
      .upsert({
        user_id: userId,
        coach_id: 'markus',
        last_recommendation_sent: new Date().toISOString(),
        recommendation_count: 1
      });

    if (logError) console.error('Coaching log error:', logError);

    return {
      role: 'assistant',
      content: coachingResponse.content,
      preview_card: coachingResponse.preview_card
    };

  } catch (error) {
    console.error('Error in mentalToughnessCoach:', error);
    return {
      role: 'assistant',
      content: "Fehler beim Mental Coaching. Aber Markus würde sagen: 'Rückschläge sind temporär - steh auf und mach weiter!' 💪"
    };
  }
}

function provideMentalCoaching(params: any) {
  const { challengeType, motivationLevel, specificProblem, trainingPhase, recentSetback } = params;

  // Markus Rühl's Mental Toughness Strategies
  const coachingStrategies = {
    lack_motivation: {
      title: "Null Bock aufs Training?",
      markus_quote: "Wer jammert, hat schon verloren!",
      content: `**Markus Rühl's Anti-Jammern-Programm 🔥**

"Muskelkater, Müdigkeit, mal keinen Bock – egal was, Ausreden zählen nicht!"

**🎯 Sofort-Strategie:**
• **Kopf aus, Hantel greifen:** Nicht denken, einfach ins Gym fahren
• **Erste 10 Minuten:** Nur Aufwärmen, danach entscheidest du neu
• **Konkurrenzdruck:** "Während du auf der Couch liegst, schuftet ein anderer!"

**🔥 Motivations-Tricks nach Rühl:**
• **Alte Erfolge anschauen:** Fotos deiner Bestform oder Videos vom letzten PR
• **Musik aufdrehen:** Hardstyle oder Metal - Markus' Geheimwaffe
• **Ziel visualisieren:** Denk an deine Wettkampfform oder Traumfigur

**💪 Rühls Mentalität:**
"Entweder du willst es, oder du willst es nicht. Dein Körper jammert, aber dein Kopf weiß: Aufgeben ist keine Option!"

*Der Schmerz vergeht, Stolz bleibt.*`,
      actions: [
        { label: "Workout jetzt starten", action: "start_emergency_workout" },
        { label: "Motivations-Playlist", action: "open_playlist" }
      ]
    },

    plateau_breakthrough: {
      title: "Plateau durchbrechen",
      markus_quote: "Jammern bringt nix. Hantel greifen, Kopf aus – und drücken!",
      content: `**Plateau? Markus Rühl's Durchbruch-Strategien 💥**

"Stillstand ist der Feind des Fortschritts!"

**🚀 Plateau-Killer:**
• **Gewicht steigern:** +2.5kg bei Grundübungen, auch wenn's wehtut
• **Zusätzliche Sätze:** Einen mehr als geplant - "Viel hilft viel"
• **Neue Übungsvariationen:** Schrägbank statt flach, Sumo statt normale Kniebeugen

**🔄 Reset-Strategie:**
• **Deload-Woche:** 80% des Gewichts, Technik perfektionieren
• **Instinktives Training:** Auf den Körper hören, was er heute braucht
• **Form-Check:** Video machen, Technik analysieren

**💡 Rühls Weisheit:**
"Plateau bedeutet: Du machst seit Wochen das Gleiche. Zeit für Veränderung!"

**Nächste Schritte:**
1. **Heute:** Ein schwerer Satz mehr als geplant
2. **Diese Woche:** Neue Übung in den Plan einbauen  
3. **Nächste Woche:** Trainingsgewichte um 2.5kg steigern`,
      actions: [
        { label: "Plateau-Plan erstellen", action: "create_plateau_plan" },
        { label: "Technik-Video aufnehmen", action: "record_form_check" }
      ]
    },

    injury_comeback: {
      title: "Comeback nach Verletzung",
      markus_quote: "Rückschläge sind temporär, solange man den Biss behält!",
      content: `**Markus Rühl's Comeback-Mentalität 🔥**

"2001 warfen mich Verletzungen zurück. 2002 gewann ich die Night of Champions!"

**🎯 Comeback-Strategie:**
• **Geduld mit System:** Langsam aufbauen, aber konstant vorwärts
• **Ego in die Ecke:** Weniger Gewicht, perfekte Technik
• **Neue Übungen nutzen:** Was geht, wird trainiert - keine Ausreden

**🧠 Mental-Reset:**
• **Rückschlag = Antrieb:** Nutze die Frustration als Brennstoff
• **Kleine Ziele:** Jede Woche 1% besser werden
• **Erfolge feiern:** Jeden kleinen Fortschritt wertschätzen

**💪 Rühls Comeback-Formel:**
1. **Woche 1-4:** Bewegung und Mobilität (50% vom alten Gewicht)
2. **Woche 5-8:** Kraftaufbau (70% vom alten Gewicht)
3. **Woche 9-12:** Vollgas zurück (90%+ vom alten Gewicht)

"Durchhalten lohnt sich. Jeder Rückschlag ist temporär!"

**Heute beginnst du dein Comeback. Nicht morgen, nicht nächste Woche - HEUTE!**`,
      actions: [
        { label: "Comeback-Plan erstellen", action: "create_comeback_plan" },
        { label: "Physio-Übungen planen", action: "plan_rehab_exercises" }
      ]
    },

    competition_prep: {
      title: "Wettkampf-Mentalität",
      markus_quote: "Cool bleiben unter Druck - Routine schafft Gelassenheit!",
      content: `**Markus Rühl's Wettkampf-Mindset 🏆**

"Auf der Bühne selbst wirke ich entspannt - aber die Vorbereitung ist gnadenlos!"

**🎯 Mental-Prep Strategien:**
• **Visualisierung:** Jeden Ablauf, jede Pose im Kopf durchgehen
• **Routine entwickeln:** Gleiches Aufwärmen, gleiche Musik, gleicher Ablauf
• **Druck umwandeln:** Nervosität ist Energie - nutze sie!

**🔥 Wettkampf-Routine:**
• **Backstage:** Lockerer Spruch, Anspannung lösen
• **Aufwärmen:** Leichte Gewichte, Muskeln prall machen
• **Show-Time:** "Die Arbeit ist getan - jetzt gehört die Bühne dir!"

**💡 Rühls Wettkampf-Weisheiten:**
• "In den Gänsehaut-Momenten vergisst du alle Qualen der Vorbereitung"
• "Routine schafft Gelassenheit - durch viele Auftritte wird Lampenfieber besiegt"
• "Mental stark sein heißt nicht verbissen sein - fokussiert, aber fähig zu lachen"

**🏅 Erfolgs-Mindset:**
"Ruuuühl!" - Wenn die Halle deinen Namen ruft, weißt du: Es war alles wert!`,
      actions: [
        { label: "Wettkampf-Routine planen", action: "plan_competition_routine" },
        { label: "Visualisierung starten", action: "start_visualization" }
      ]
    },

    diet_discipline: {
      title: "Diät-Disziplin",
      markus_quote: "Hölle auf Erden - aber das Resultat ist es wert!",
      content: `**Markus Rühl's Diät-Durchhaltevermögen 😤**

"16 Wochen Mr. Olympia Prep - ohne eine einzige Ausnahme!"

**🔥 Diät-Mental-Tricks:**
• **Ziel vor Augen:** Bühnenform visualisieren, Fotos anschauen
• **Tag für Tag:** Nicht an 16 Wochen denken, nur an heute
• **Belohnung planen:** Nach dem Wettkampf wartet das Cheat-Meal

**😤 Durch die härtesten Phasen:**
• **Knurrender Magen:** "Das ist der Preis für Perfektion"
• **Heißhunger:** "Jede Versuchung überwunden macht dich stärker"
• **Energie im Keller:** "Die Definition steigt, während die Energie sinkt"

**💪 Rühls Diät-Mantras:**
• "Jeden Tag mit knurrendem Magen aufstehen und ins Bett gehen"
• "Die Energie ist im Keller, aber die Form wird legendär"
• "Nach dem Wettkampf ist vor dem Cheat-Meal"

**🎯 Sofort-Hilfe bei Heißhunger:**
1. **Wasser trinken:** Erst mal 0.5L, dann warten
2. **Ablenkung:** Raus aus der Küche, Aktivität starten
3. **Ziel-Foto anschauen:** Erinnerung, warum du das machst`,
      actions: [
        { label: "Cheat-Meal planen", action: "plan_cheat_meal" },
        { label: "Diät-Fortschritt tracken", action: "track_diet_progress" }
      ]
    }
  };

  const selectedStrategy = coachingStrategies[challengeType] || coachingStrategies.lack_motivation;

  // Add recent setback handling
  if (recentSetback) {
    selectedStrategy.content += `\n\n**🔥 Wegen deinem Rückschlag:**
"Auch ich hatte 2001 schwere Phasen. 2002 kam ich stärker zurück! 
Rückschläge sind Sprungbretter - nutze die Wut und mach sie zu deinem Antrieb!"`;
  }

  // Adjust based on motivation level
  if (motivationLevel <= 2) {
    selectedStrategy.content += `\n\n**⚡ Erste-Hilfe-Motivation:**
"STOPP! Keine Diskussion. Trainingskleidung an, ins Auto, ab ins Gym. 
Du denkst zu viel - handeln ist angesagt! Die ersten 5 Minuten entscheiden!"`;
  }

  return {
    content: `${selectedStrategy.content}`,
    preview_card: {
      title: selectedStrategy.title,
      description: selectedStrategy.markus_quote,
      content: `Mental Toughness Level: ${motivationLevel}/10 | Challenge: ${challengeType}`,
      actions: selectedStrategy.actions || []
    }
  };
}