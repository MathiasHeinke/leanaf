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
    targetWeight: number | null;
    targetBodyFat: number | null;
    activityLevel: string | null;
    tdee: number | null;
  };

  // Tracking-Daten (letzte 7 Tage)
  recentActivity: {
    avgCalories: number | null;
    avgProtein: number | null;
    avgCarbs: number | null;
    avgFat: number | null;
    mealsLogged: number;
    workoutsThisWeek: number;
    lastWorkoutDate: string | null;
    lastWorkoutType: string | null;
    avgSleepHours: number | null;
    avgSleepQuality: number | null;
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

  // 2. Letzte Gewichtsmessungen
  const { data: weightLogs } = await supabase
    .from('weight_logs')
    .select('weight, body_fat_percentage, date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(5);

  // 3. Mahlzeiten der letzten 7 Tage aggregieren
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { data: meals } = await supabase
    .from('meals')
    .select('calories, protein, carbs, fat, date')
    .eq('user_id', userId)
    .gte('date', sevenDaysAgo)
    .order('date', { ascending: false });

  // 4. Workouts der letzten 7 Tage
  const { data: workouts } = await supabase
    .from('workouts')
    .select('workout_type, duration_minutes, date')
    .eq('user_id', userId)
    .gte('date', sevenDaysAgo)
    .order('date', { ascending: false });

  // 5. Schlaf-Daten
  const { data: sleepLogs } = await supabase
    .from('sleep_logs')
    .select('hours, quality, date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(7);

  // 6. Blutbilder prüfen
  const { data: bloodwork } = await supabase
    .from('bloodwork_results')
    .select('date, test_type')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1);

  // 7. Hormone prüfen
  const { data: hormones } = await supabase
    .from('hormone_panels')
    .select('date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1);

  // 8. Aktive Supplements
  const { data: supplements } = await supabase
    .from('user_supplements')
    .select('supplement_database(name)')
    .eq('user_id', userId)
    .eq('is_active', true);

  // 9. Aktive Pläne prüfen
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
  const avgFat = mealCount > 0 ? Math.round(meals!.reduce((sum: number, m: any) => sum + (m.fat || 0), 0) / mealCount) : null;

  const sleepCount = sleepLogs?.length || 0;
  const avgSleepHours = sleepCount > 0 ? Number((sleepLogs!.reduce((sum: number, s: any) => sum + (s.hours || 0), 0) / sleepCount).toFixed(1)) : null;
  const avgSleepQuality = sleepCount > 0 ? Number((sleepLogs!.reduce((sum: number, s: any) => sum + (s.quality || 0), 0) / sleepCount).toFixed(1)) : null;

  const workoutCount = workouts?.length || 0;
  const lastWorkout = workouts?.[0];

  // Aktuelles Gewicht (bevorzugt aus Log, sonst Profil)
  const currentWeight = weightLogs?.[0]?.weight || profile?.weight || null;
  const currentBodyFat = weightLogs?.[0]?.body_fat_percentage || profile?.body_fat_percentage || null;

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
    targetWeight: profile?.target_weight || null,
    targetBodyFat: profile?.target_body_fat || null,
    activityLevel: profile?.activity_level || null,
    tdee: profile?.tdee || null,
  };

  const recentActivity = {
    avgCalories,
    avgProtein,
    avgCarbs,
    avgFat,
    mealsLogged: mealCount,
    workoutsThisWeek: workoutCount,
    lastWorkoutDate: lastWorkout?.date || null,
    lastWorkoutType: lastWorkout?.workout_type || null,
    avgSleepHours,
    avgSleepQuality,
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
  const summaryForPrompt = generatePromptSummary(basics, recentActivity, medical, activePlans, knowledgeGaps);

  console.log(`[USER-CONTEXT] Loaded: Weight=${currentWeight}kg, Meals=${mealCount}, Workouts=${workoutCount}, Gaps=${knowledgeGaps.length}`);

  return {
    basics,
    recentActivity,
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

  // Mittlere Priorität
  if (recentActivity.mealsLogged < 3) {
    gaps.push({
      field: 'nutrition_tracking',
      importance: 'medium',
      question: 'Kannst du mir sagen was du heute schon gegessen hast? Ohne Tracking kann ich dir nicht optimal helfen.',
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
  medical: UserHealthContext['medical'],
  activePlans: UserHealthContext['activePlans'],
  knowledgeGaps: UserHealthContext['knowledgeGaps']
): string {
  const lines: string[] = [];

  // == BEKANNTE DATEN ==
  lines.push('== DEIN WISSEN ÜBER DEN USER ==');

  // Grunddaten
  if (basics.firstName) {
    lines.push(`Name: ${basics.firstName}`);
  }
  
  const physicalData: string[] = [];
  if (basics.weight) physicalData.push(`${basics.weight}kg`);
  if (basics.height) physicalData.push(`${basics.height}cm`);
  if (basics.age) physicalData.push(`${basics.age} Jahre`);
  if (basics.gender) physicalData.push(basics.gender === 'male' ? 'männlich' : basics.gender === 'female' ? 'weiblich' : basics.gender);
  if (basics.bodyFatPercentage) physicalData.push(`~${basics.bodyFatPercentage}% KFA`);
  
  if (physicalData.length > 0) {
    lines.push(`Körperdaten: ${physicalData.join(', ')}`);
  }

  // Ziele
  const goals: string[] = [];
  if (basics.targetWeight) goals.push(`Zielgewicht: ${basics.targetWeight}kg`);
  if (basics.targetBodyFat) goals.push(`Ziel-KFA: ${basics.targetBodyFat}%`);
  if (goals.length > 0) {
    lines.push(`Ziele: ${goals.join(', ')}`);
  }

  // Aktivität letzte 7 Tage
  lines.push('');
  lines.push('-- Aktivität (letzte 7 Tage) --');
  
  if (recentActivity.mealsLogged > 0) {
    lines.push(`Ernährung: ${recentActivity.mealsLogged} Mahlzeiten geloggt`);
    if (recentActivity.avgCalories) {
      lines.push(`  Ø ${recentActivity.avgCalories} kcal, ${recentActivity.avgProtein}g Protein, ${recentActivity.avgCarbs}g Carbs, ${recentActivity.avgFat}g Fett`);
    }
  } else {
    lines.push('Ernährung: Keine Mahlzeiten geloggt');
  }

  if (recentActivity.workoutsThisWeek > 0) {
    lines.push(`Training: ${recentActivity.workoutsThisWeek} Workouts diese Woche`);
    if (recentActivity.lastWorkoutDate) {
      lines.push(`  Letztes Training: ${recentActivity.lastWorkoutType || 'Unbekannt'} am ${recentActivity.lastWorkoutDate}`);
    }
  } else {
    lines.push('Training: Keine Workouts diese Woche');
  }

  if (recentActivity.avgSleepHours !== null) {
    lines.push(`Schlaf: Ø ${recentActivity.avgSleepHours} Stunden/Nacht`);
  }

  // Medizinische Daten
  if (medical.hasBloodwork || medical.hasHormonePanel || medical.supplements.length > 0) {
    lines.push('');
    lines.push('-- Gesundheit --');
    if (medical.hasBloodwork) {
      lines.push(`Blutbild: Ja (${medical.lastBloodworkDate || 'Datum unbekannt'})`);
    }
    if (medical.hasHormonePanel) {
      lines.push(`Hormonwerte: Ja (${medical.lastHormonePanelDate || 'Datum unbekannt'})`);
    }
    if (medical.supplements.length > 0) {
      lines.push(`Aktive Supplements: ${medical.supplements.join(', ')}`);
    }
  }

  // Aktive Pläne
  const plans: string[] = [];
  if (activePlans.hasWorkoutPlan) plans.push('Trainingsplan');
  if (activePlans.hasNutritionPlan) plans.push('Ernährungsplan');
  if (activePlans.hasSupplementPlan) plans.push('Supplement-Plan');
  if (activePlans.hasPeptideProtocol) plans.push('Peptid-Protokoll');
  
  if (plans.length > 0) {
    lines.push('');
    lines.push(`Aktive Pläne: ${plans.join(', ')}`);
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
      criticalGaps.forEach(g => lines.push(`  - ${g.field}: "${g.question}"`));
    }
    
    if (highGaps.length > 0) {
      lines.push('Wichtig zu erfragen:');
      highGaps.forEach(g => lines.push(`  - ${g.field}: "${g.question}"`));
    }
    
    if (mediumGaps.length > 0) {
      lines.push('Bei Gelegenheit erfragen:');
      mediumGaps.forEach(g => lines.push(`  - ${g.field}: "${g.question}"`));
    }
  }

  return lines.join('\n');
}

export { identifyKnowledgeGaps, generatePromptSummary };
