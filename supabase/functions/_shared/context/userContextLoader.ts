/**
 * User Health Context Loader
 * Lädt alle relevanten User-Daten für intelligentes Coaching
 */

export interface UserHealthContext {
  // Basisdaten
  basics: {
    userId: string;
    firstName: string | null;
    weight: number | null;
    height: number | null;
    age: number | null;
    gender: string | null;
    bodyFatPercentage: number | null;
    musclePercentage: number | null;
    targetWeight: number | null;
    targetBodyFat: number | null;
    activityLevel: string | null;
    tdee: number | null;
  };

  // Tägliche Ziele (aus daily_goals)
  dailyTargets: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fats: number | null;
    tdee: number | null;
    goalType: string | null;
  };

  // Tracking-Daten (letzte 7 Tage)
  recentActivity: {
    avgCalories: number | null;
    avgProtein: number | null;
    avgCarbs: number | null;
    avgFat: number | null;
    mealsLogged: number;
    recentMeals: { 
      text: string; 
      title: string;
      calories: number; 
      protein: number; 
      carbs: number; 
      fats: number; 
      date: string;
      meal_type: string;
    }[];
    workoutsThisWeek: number;
    lastWorkoutDate: string | null;
    lastWorkoutType: string | null;
    avgSleepHours: number | null;
    avgSleepQuality: number | null;
    recentSleep: {
      date: string;
      hours: number;
      quality: number;
      score: number;
    }[];
  };

  // Journal Insights
  journalInsights: {
    recentChallenges: string[];
    recentHighlights: string[];
    latestKaiInsight: string | null;
    avgMoodScore: number | null;
    avgEnergyLevel: number | null;
  };

  // Medizinische Daten
  medical: {
    hasBloodwork: boolean;
    lastBloodworkDate: string | null;
    hasHormonePanel: boolean;
    lastHormonePanelDate: string | null;
    supplements: string[];
    knownConditions: string[];
  };

  // Aktive Pläne
  activePlans: {
    hasWorkoutPlan: boolean;
    hasNutritionPlan: boolean;
    hasSupplementPlan: boolean;
    hasPeptideProtocol: boolean;
  };

  // Wissenslücken - Was fehlt uns?
  knowledgeGaps: {
    field: string;
    importance: 'critical' | 'high' | 'medium' | 'low';
    question: string;
  }[];

  // Zusammenfassung für Prompt
  summaryForPrompt: string;
}

/**
 * Lädt den vollständigen User Health Context
 */
export async function loadUserHealthContext(
  userId: string,
  supabase: any
): Promise<UserHealthContext> {
  console.log(`[USER-CONTEXT] Loading comprehensive health context for user: ${userId}`);

  // 1. Profil laden (profiles.user_id = auth.users.id)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  // 2. Letzte Gewichtsmessungen (Tabelle heißt weight_history, nicht weight_logs!)
  const { data: weightLogs } = await supabase
    .from('weight_history')
    .select('weight, body_fat_percentage, muscle_percentage, date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(5);

  // 3. Mahlzeiten der letzten 7 Tage aggregieren - inkl. text und title für Details
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { data: meals } = await supabase
    .from('meals')
    .select('text, title, calories, protein, carbs, fats, date, meal_type')
    .eq('user_id', userId)
    .gte('date', sevenDaysAgo)
    .order('date', { ascending: false })
    .limit(15);

  // 4. Workouts der letzten 7 Tage
  const { data: workouts } = await supabase
    .from('workouts')
    .select('workout_type, duration_minutes, date')
    .eq('user_id', userId)
    .gte('date', sevenDaysAgo)
    .order('date', { ascending: false });

  // 5. Schlaf-Daten (Tabelle heißt sleep_tracking, Spalten: sleep_hours, sleep_quality!)
  const { data: sleepLogs } = await supabase
    .from('sleep_tracking')
    .select('sleep_hours, sleep_quality, sleep_score, date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(7);

  // 6. Blutbilder prüfen - Tabelle existiert nicht, skippen wir vorerst
  // TODO: bloodwork_results Tabelle erstellen wenn benötigt
  const bloodwork: any[] = [];

  // 7. Hormone prüfen - Tabelle existiert nicht, skippen wir vorerst
  // TODO: hormone_panels Tabelle erstellen wenn benötigt  
  const hormones: any[] = [];

  // 8. Aktive Supplements - mit direktem Join
  const { data: supplements } = await supabase
    .from('user_supplements')
    .select('supplement_database(name)')
    .eq('user_id', userId)
    .eq('is_active', true);

  // 9. Daily Goals laden (TDEE, Kalorienziel, Makroziele)
  const { data: dailyGoals } = await supabase
    .from('daily_goals')
    .select('calories, protein, carbs, fats, tdee, goal_type')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // 10. Journal Entries laden für Insights - WICHTIG: raw_text und ai_summary_md holen!
  const { data: journalEntries } = await supabase
    .from('journal_entries')
    .select('raw_text, ai_summary_md, challenge, highlight, kai_insight, mood_score, energy_level, sentiment_tag, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  // 11. Aktive Pläne prüfen
  const [workoutPlans, nutritionPlans, supplementPlans, peptidePlans] = await Promise.all([
    supabase.from('workout_plans').select('id').eq('user_id', userId).eq('status', 'active').limit(1),
    supabase.from('nutrition_plans').select('id').eq('user_id', userId).eq('status', 'active').limit(1),
    supabase.from('supplement_plans').select('id').eq('user_id', userId).eq('status', 'active').limit(1),
    supabase.from('peptide_protocols').select('id').eq('user_id', userId).limit(1),
  ]);

  // Aggregationen berechnen
  const mealCount = meals?.length || 0;
  const avgCalories = mealCount > 0 ? Math.round(meals!.reduce((sum: number, m: any) => sum + (m.calories || 0), 0) / mealCount) : null;
  const avgProtein = mealCount > 0 ? Math.round(meals!.reduce((sum: number, m: any) => sum + (m.protein || 0), 0) / mealCount) : null;
  const avgCarbs = mealCount > 0 ? Math.round(meals!.reduce((sum: number, m: any) => sum + (m.carbs || 0), 0) / mealCount) : null;
  const avgFat = mealCount > 0 ? Math.round(meals!.reduce((sum: number, m: any) => sum + (m.fats || 0), 0) / mealCount) : null;

  const sleepCount = sleepLogs?.length || 0;
  // Korrigierte Spaltennamen: sleep_hours, sleep_quality (nicht hours, quality)
  const avgSleepHours = sleepCount > 0 ? Number((sleepLogs!.reduce((sum: number, s: any) => sum + (s.sleep_hours || 0), 0) / sleepCount).toFixed(1)) : null;
  const avgSleepQuality = sleepCount > 0 ? Number((sleepLogs!.reduce((sum: number, s: any) => sum + (s.sleep_quality || 0), 0) / sleepCount).toFixed(1)) : null;

  const workoutCount = workouts?.length || 0;
  const lastWorkout = workouts?.[0];

  // Aktuelles Gewicht (bevorzugt aus Log, sonst Profil)
  const currentWeight = weightLogs?.[0]?.weight || profile?.weight || null;
  const currentBodyFat = weightLogs?.[0]?.body_fat_percentage || null;
  const currentMuscle = weightLogs?.[0]?.muscle_percentage || null;

  // Alter: ZUERST direkt aus Profil, DANN aus birth_date berechnen
  let age: number | null = profile?.age || null;
  if (!age && profile?.birth_date) {
    const birthDate = new Date(profile.birth_date);
    const today = new Date();
    age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
  }

  // Supplement-Namen extrahieren
  const supplementNames = supplements?.map((s: any) => s.supplement_database?.name).filter(Boolean) || [];

  // Kontext zusammenstellen
  const basics = {
    userId,
    firstName: profile?.first_name || null,
    weight: currentWeight,
    height: profile?.height || null,
    age,
    gender: profile?.gender || null,
    bodyFatPercentage: currentBodyFat,
    musclePercentage: currentMuscle,  // NEU
    targetWeight: profile?.target_weight || null,
    targetBodyFat: profile?.target_body_fat || null,
    activityLevel: profile?.activity_level || null,
    tdee: profile?.tdee || null,
  };

  // Build recentMeals array with detailed info
  // WICHTIG: title NICHT mit 'Mahlzeit' überschreiben - das verhindert dass text später genutzt wird!
  const recentMeals = (meals || []).slice(0, 5).map((m: any) => ({
    text: m.text || '',
    title: m.title || null,  // FIX: null statt 'Mahlzeit' - so wird text als Fallback genutzt
    calories: m.calories || 0,
    protein: m.protein || 0,
    carbs: m.carbs || 0,
    fats: m.fats || 0,
    date: m.date,
    meal_type: m.meal_type || 'unknown'
  }));

  // Build recentSleep array
  const recentSleep = (sleepLogs || []).slice(0, 5).map((s: any) => ({
    date: s.date,
    hours: s.sleep_hours || 0,
    quality: s.sleep_quality || 0,
    score: s.sleep_score || 0
  }));

  const recentActivity = {
    avgCalories,
    avgProtein,
    avgCarbs,
    avgFat,
    mealsLogged: mealCount,
    recentMeals,
    workoutsThisWeek: workoutCount,
    lastWorkoutDate: lastWorkout?.date || null,
    lastWorkoutType: lastWorkout?.workout_type || null,
    avgSleepHours,
    avgSleepQuality,
    recentSleep,
  };

  // Daily Targets from daily_goals
  const dailyTargets = {
    calories: dailyGoals?.calories || null,
    protein: dailyGoals?.protein || null,
    carbs: dailyGoals?.carbs || null,
    fats: dailyGoals?.fats || null,
    tdee: dailyGoals?.tdee || null,
    goalType: dailyGoals?.goal_type || null,
  };

  // Journal Insights - raw_text ist das wichtigste, da highlight/challenge oft leer sind
  const journalInsights = {
    recentEntries: (journalEntries || []).slice(0, 5).map((j: any) => ({
      text: j.raw_text || '',
      summary: j.ai_summary_md || null,
      mood: j.mood_score || 0,
      energy: j.energy_level || null,
      sentiment: j.sentiment_tag || 'neutral',
      date: j.created_at?.split('T')[0] || 'unknown',
    })),
    recentChallenges: (journalEntries || []).map((j: any) => j.challenge).filter(Boolean).slice(0, 3),
    recentHighlights: (journalEntries || []).map((j: any) => j.highlight).filter(Boolean).slice(0, 3),
    latestKaiInsight: journalEntries?.[0]?.kai_insight || null,
    avgMoodScore: journalEntries?.length ? 
      Number((journalEntries.reduce((sum: number, j: any) => sum + (j.mood_score || 0), 0) / journalEntries.length).toFixed(1)) : null,
    avgEnergyLevel: journalEntries?.length ?
      Number((journalEntries.reduce((sum: number, j: any) => sum + (j.energy_level || 0), 0) / journalEntries.length).toFixed(1)) : null,
  };

  const medical = {
    hasBloodwork: (bloodwork?.length || 0) > 0,
    lastBloodworkDate: bloodwork?.[0]?.date || null,
    hasHormonePanel: (hormones?.length || 0) > 0,
    lastHormonePanelDate: hormones?.[0]?.date || null,
    supplements: supplementNames,
    knownConditions: profile?.medical_conditions || [],
  };

  const activePlans = {
    hasWorkoutPlan: (workoutPlans.data?.length || 0) > 0,
    hasNutritionPlan: (nutritionPlans.data?.length || 0) > 0,
    hasSupplementPlan: (supplementPlans.data?.length || 0) > 0,
    hasPeptideProtocol: (peptidePlans.data?.length || 0) > 0,
  };

  // Wissenslücken identifizieren
  const knowledgeGaps = identifyKnowledgeGaps(basics, recentActivity, medical);

  // Zusammenfassung für Prompt generieren
  const summaryForPrompt = generatePromptSummary(basics, recentActivity, dailyTargets, journalInsights, medical, activePlans, knowledgeGaps);

  console.log(`[USER-CONTEXT] Loaded: Weight=${currentWeight}kg, Meals=${mealCount}, Workouts=${workoutCount}, Sleep=${sleepCount}, Journal=${journalEntries?.length || 0}, DailyGoals=${dailyGoals ? 'yes' : 'no'}, Gaps=${knowledgeGaps.length}`);

  return {
    basics,
    dailyTargets,
    recentActivity,
    journalInsights,
    medical,
    activePlans,
    knowledgeGaps,
    summaryForPrompt,
  };
}

/**
 * Identifiziert fehlende Daten/Wissenslücken
 */
function identifyKnowledgeGaps(
  basics: UserHealthContext['basics'],
  recentActivity: UserHealthContext['recentActivity'],
  medical: UserHealthContext['medical']
): UserHealthContext['knowledgeGaps'] {
  const gaps: UserHealthContext['knowledgeGaps'] = [];

  // Kritische Lücken
  if (!basics.weight) {
    gaps.push({
      field: 'weight',
      importance: 'critical',
      question: 'Wie viel wiegst du aktuell?',
    });
  }

  if (!basics.height) {
    gaps.push({
      field: 'height',
      importance: 'critical',
      question: 'Wie groß bist du?',
    });
  }

  // Hohe Priorität
  if (!basics.age && !basics.gender) {
    gaps.push({
      field: 'age_gender',
      importance: 'high',
      question: 'Wie alt bist du und bist du männlich oder weiblich?',
    });
  } else if (!basics.age) {
    gaps.push({
      field: 'age',
      importance: 'high',
      question: 'Wie alt bist du?',
    });
  }

  if (!basics.targetWeight && !basics.targetBodyFat) {
    gaps.push({
      field: 'goals',
      importance: 'high',
      question: 'Was ist dein Zielgewicht oder Ziel-KFA?',
    });
  }

  // Mittlere Priorität - nur fragen wenn GAR KEINE Meals geloggt
  if (recentActivity.mealsLogged === 0) {
    gaps.push({
      field: 'nutrition_tracking',
      importance: 'medium',
      question: 'Hast du heute schon etwas gegessen? Mit Tracking-Daten kann ich dir besser helfen.',
    });
  } else if (recentActivity.mealsLogged < 3) {
    // Bei 1-2 Meals: Nur low-priority Hinweis, nicht aktiv nachfragen
    gaps.push({
      field: 'nutrition_tracking',
      importance: 'low',
      question: 'Mehr Mahlzeiten-Tracking wuerde mir helfen, deine Ernaehrung besser zu analysieren.',
    });
  }

  if (recentActivity.workoutsThisWeek === 0) {
    gaps.push({
      field: 'training_data',
      importance: 'medium',
      question: 'Wann hast du zuletzt trainiert und wie sah das Training aus?',
    });
  }

  if (!basics.activityLevel) {
    gaps.push({
      field: 'activity_level',
      importance: 'medium',
      question: 'Wie aktiv bist du im Alltag - sitzt du viel oder bist du viel unterwegs?',
    });
  }

  // Niedrige Priorität (aber trotzdem relevant)
  if (!medical.hasBloodwork) {
    gaps.push({
      field: 'bloodwork',
      importance: 'low',
      question: 'Hast du ein aktuelles Blutbild? Das würde uns helfen, deine Gesundheit besser einzuschätzen.',
    });
  }

  if (recentActivity.avgSleepHours === null) {
    gaps.push({
      field: 'sleep',
      importance: 'low',
      question: 'Wie viele Stunden schläfst du durchschnittlich pro Nacht?',
    });
  }

  if (!basics.bodyFatPercentage) {
    gaps.push({
      field: 'body_fat',
      importance: 'low',
      question: 'Weißt du ungefähr deinen Körperfettanteil?',
    });
  }

  return gaps;
}

/**
 * Generiert eine strukturierte Zusammenfassung für den System Prompt
 */
function generatePromptSummary(
  basics: UserHealthContext['basics'],
  recentActivity: UserHealthContext['recentActivity'],
  dailyTargets: UserHealthContext['dailyTargets'],
  journalInsights: UserHealthContext['journalInsights'],
  medical: UserHealthContext['medical'],
  activePlans: UserHealthContext['activePlans'],
  knowledgeGaps: UserHealthContext['knowledgeGaps']
): string {
  const lines: string[] = [];

  // == BEKANNTE DATEN ==
  lines.push('== DEIN WISSEN ÜBER DEN USER ==');

  // Grunddaten
  if (basics.firstName) {
    lines.push('Name: ' + basics.firstName);
  }
  
  const physicalData: string[] = [];
  if (basics.weight) physicalData.push(basics.weight + 'kg');
  if (basics.height) physicalData.push(basics.height + 'cm');
  if (basics.age) physicalData.push(basics.age + ' Jahre');
  if (basics.gender) physicalData.push(basics.gender === 'male' ? 'maennlich' : basics.gender === 'female' ? 'weiblich' : basics.gender);
  if (basics.bodyFatPercentage) physicalData.push('~' + basics.bodyFatPercentage + '% KFA');
  if (basics.musclePercentage) physicalData.push('~' + basics.musclePercentage + '% Muskel');
  
  if (physicalData.length > 0) {
    lines.push('Koerperdaten: ' + physicalData.join(', '));
  }

  // Ziele aus daily_goals (TDEE, Makros)
  if (dailyTargets.calories || dailyTargets.tdee) {
    lines.push('');
    lines.push('-- Taegliche Ziele --');
    if (dailyTargets.tdee) lines.push('TDEE: ' + dailyTargets.tdee + ' kcal');
    if (dailyTargets.calories) lines.push('Kalorienziel: ' + dailyTargets.calories + ' kcal');
    if (dailyTargets.protein) lines.push('Proteinziel: ' + dailyTargets.protein + 'g');
    if (dailyTargets.carbs) lines.push('Kohlenhydrate-Ziel: ' + dailyTargets.carbs + 'g');
    if (dailyTargets.fats) lines.push('Fett-Ziel: ' + dailyTargets.fats + 'g');
    if (dailyTargets.goalType) lines.push('Zieltyp: ' + dailyTargets.goalType);
  }

  // Körperliche Ziele
  const bodyGoals: string[] = [];
  if (basics.targetWeight) bodyGoals.push('Zielgewicht: ' + basics.targetWeight + 'kg');
  if (basics.targetBodyFat) bodyGoals.push('Ziel-KFA: ' + basics.targetBodyFat + '%');
  if (bodyGoals.length > 0) {
    lines.push('Koerper-Ziele: ' + bodyGoals.join(', '));
  }

  // Aktivität letzte 7 Tage
  lines.push('');
  lines.push('-- Aktivitaet (letzte 7 Tage) --');
  
  if (recentActivity.mealsLogged > 0) {
    lines.push('Ernaehrung: ' + recentActivity.mealsLogged + ' Mahlzeiten geloggt');
    
    // DETAILLIERTE Mahlzeiten anzeigen
    if (recentActivity.recentMeals && recentActivity.recentMeals.length > 0) {
      lines.push('Letzte Mahlzeiten:');
      recentActivity.recentMeals.slice(0, 5).forEach((m: any) => {
        const name = m.text || m.title || 'Unbenannte Mahlzeit';
        const mealType = m.meal_type !== 'unknown' ? ' (' + m.meal_type + ')' : '';
        lines.push('  - ' + name + mealType + ': ' + m.calories + 'kcal, ' + m.protein + 'g P, ' + m.carbs + 'g C, ' + m.fats + 'g F [' + m.date + ']');
      });
    }
    
    if (recentActivity.avgCalories) {
      lines.push('Durchschnitt: ' + recentActivity.avgCalories + ' kcal/Mahlzeit, ' + recentActivity.avgProtein + 'g Protein');
    }
  } else {
    lines.push('Ernaehrung: Keine Mahlzeiten geloggt');
  }

  if (recentActivity.workoutsThisWeek > 0) {
    lines.push('Training: ' + recentActivity.workoutsThisWeek + ' Workouts diese Woche');
    if (recentActivity.lastWorkoutDate) {
      lines.push('  Letztes Training: ' + (recentActivity.lastWorkoutType || 'Unbekannt') + ' am ' + recentActivity.lastWorkoutDate);
    }
  } else {
    lines.push('Training: Keine Workouts diese Woche');
  }

  // Schlaf-Details
  if (recentActivity.recentSleep && recentActivity.recentSleep.length > 0) {
    lines.push('');
    lines.push('-- Schlaf (letzte Naechte) --');
    recentActivity.recentSleep.slice(0, 3).forEach((s: any) => {
      lines.push('  ' + s.date + ': ' + s.hours + 'h, Qualitaet ' + s.quality + '/10, Score ' + s.score);
    });
    if (recentActivity.avgSleepHours !== null) {
      lines.push('Durchschnitt: ' + recentActivity.avgSleepHours + 'h/Nacht, Qualitaet ' + (recentActivity.avgSleepQuality || 'k.A.') + '/10');
    }
  } else if (recentActivity.avgSleepHours !== null) {
    lines.push('Schlaf: Oe ' + recentActivity.avgSleepHours + ' Stunden/Nacht');
  }

  // Journal Insights - IMMER anzeigen wenn Einträge vorhanden
  if (journalInsights.recentEntries && journalInsights.recentEntries.length > 0) {
    lines.push('');
    lines.push('-- MINDSET-JOURNAL (letzte Eintraege) --');
    journalInsights.recentEntries.slice(0, 3).forEach((entry: any) => {
      const text = entry.text?.substring(0, 150) || '';
      const moodInfo = entry.mood > 0 ? ' [Mood: ' + entry.mood + '/10]' : '';
      const sentimentInfo = entry.sentiment !== 'neutral' ? ' [' + entry.sentiment + ']' : '';
      lines.push('  ' + entry.date + ': "' + text + (entry.text?.length > 150 ? '...' : '') + '"' + moodInfo + sentimentInfo);
    });
    if (journalInsights.avgMoodScore) {
      lines.push('Durchschnittliche Stimmung: ' + journalInsights.avgMoodScore + '/10');
    }
    if (journalInsights.avgEnergyLevel) {
      lines.push('Durchschnittliches Energielevel: ' + journalInsights.avgEnergyLevel + '/10');
    }
    if (journalInsights.recentChallenges.length > 0) {
      lines.push('Aktuelle Herausforderungen:');
      journalInsights.recentChallenges.forEach((c: string) => {
        lines.push('  - ' + c.substring(0, 100) + (c.length > 100 ? '...' : ''));
      });
    }
    if (journalInsights.recentHighlights.length > 0) {
      lines.push('Aktuelle Highlights:');
      journalInsights.recentHighlights.forEach((h: string) => {
        lines.push('  - ' + h.substring(0, 100) + (h.length > 100 ? '...' : ''));
      });
    }
    if (journalInsights.latestKaiInsight) {
      lines.push('Letzter KI-Insight: ' + journalInsights.latestKaiInsight.substring(0, 200));
    }
  }

  // Medizinische Daten
  if (medical.hasBloodwork || medical.hasHormonePanel || medical.supplements.length > 0) {
    lines.push('');
    lines.push('-- Gesundheit --');
    if (medical.hasBloodwork) {
      lines.push('Blutbild: Ja (' + (medical.lastBloodworkDate || 'Datum unbekannt') + ')');
    }
    if (medical.hasHormonePanel) {
      lines.push('Hormonwerte: Ja (' + (medical.lastHormonePanelDate || 'Datum unbekannt') + ')');
    }
    if (medical.supplements.length > 0) {
      lines.push('Aktive Supplements: ' + medical.supplements.join(', '));
    }
  }

  // Aktive Pläne
  const plans: string[] = [];
  if (activePlans.hasWorkoutPlan) plans.push('Trainingsplan');
  if (activePlans.hasNutritionPlan) plans.push('Ernaehrungsplan');
  if (activePlans.hasSupplementPlan) plans.push('Supplement-Plan');
  if (activePlans.hasPeptideProtocol) plans.push('Peptid-Protokoll');
  
  if (plans.length > 0) {
    lines.push('');
    lines.push('Aktive Plaene: ' + plans.join(', '));
  }

  // == WISSENSLÜCKEN ==
  const criticalGaps = knowledgeGaps.filter(g => g.importance === 'critical');
  const highGaps = knowledgeGaps.filter(g => g.importance === 'high');
  const mediumGaps = knowledgeGaps.filter(g => g.importance === 'medium');

  if (criticalGaps.length > 0 || highGaps.length > 0 || mediumGaps.length > 0) {
    lines.push('');
    lines.push('== WAS DIR NOCH FEHLT ==');
    
    if (criticalGaps.length > 0) {
      lines.push('KRITISCH fehlend:');
      criticalGaps.forEach(g => lines.push('  - ' + g.field + ': "' + g.question + '"'));
    }
    
    if (highGaps.length > 0) {
      lines.push('Wichtig zu erfragen:');
      highGaps.forEach(g => lines.push('  - ' + g.field + ': "' + g.question + '"'));
    }
    
    if (mediumGaps.length > 0) {
      lines.push('Bei Gelegenheit erfragen:');
      mediumGaps.forEach(g => lines.push('  - ' + g.field + ': "' + g.question + '"'));
    }
  }

  return lines.join('\n');
}

export { identifyKnowledgeGaps, generatePromptSummary };
