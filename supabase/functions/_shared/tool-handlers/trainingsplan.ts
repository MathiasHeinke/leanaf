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

    // Save plan directly to workout_plans (not drafts)
    const { data: savedPlan, error: saveError } = await supabase
      .from('workout_plans')
      .insert({
        name: planData.name,
        category: planData.goal || 'custom',
        description: planData.structure.description,
        plan_type: planData.goal || 'custom',
        target_frequency: planData.daysPerWeek,
        duration_weeks: 4,
        exercises: planData.structure.weekly_structure,
        created_by: userId,
        status: 'active',
        scientific_basis: {
          methodology: planData.coachStyle?.style || 'evidence_based',
          coach_personality: planData.coachStyle?.name || 'Sascha',
          user_analysis: planData.userStats
        },
        progression_scheme: planData.structure.progression_plan || {}
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

    // Return structured response with enhanced plan data
    return {
      role: 'assistant',
      type: 'card',
      card: 'enhanced_training_plan',
      content: `Perfekt! Ich habe einen personalisierten ${planData.daysPerWeek}-Tage ${planData.goal}-Plan für dich erstellt.

${planData.analysis}`,
      payload: {
        id: savedPlan.id,
        name: planData.name,
        plan: planData.structure.weekly_structure,
        goal: planData.goal,
        daysPerWeek: planData.daysPerWeek,
        description: planData.structure.description,
        principles: planData.structure.principles,
        userStats: planData.userStats,
        coachStyle: planData.coachStyle,
        progressionPlan: planData.structure.progression_plan,
        onSaveToPlan: true,
        savedPlanId: savedPlan.id
      },
      meta: {
        clearTool: false
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

// Generate a personalized training plan with deep user analysis
async function generateTrainingPlan(params: any) {
  const { goal, experienceYears, daysPerWeek, timePerSession, equipment, preferences, userId } = params;

  // Perform deep user analysis
  const userAnalysis = await analyzeUserTrainingHistory(userId);
  const preferredCoach = await getPreferredCoach(userId);
  
  // Create personalized plan name
  const planName = generatePersonalizedPlanName(goal, daysPerWeek, userAnalysis);

  // Generate structure with user-specific recommendations
  const weeklyStructure = await generatePersonalizedStructure(
    daysPerWeek, 
    goal, 
    userAnalysis, 
    preferredCoach,
    experienceYears
  );

  // Generate coaching principles based on user data and preferred coach
  const principles = generateCoachingPrinciples(goal, experienceYears, userAnalysis, preferredCoach);

  // Generate weight and progression recommendations
  const progressionPlan = generateProgressionRecommendations(userAnalysis, goal);

  return {
    name: planName,
    goal,
    daysPerWeek,
    structure: {
      weekly_structure: weeklyStructure,
      principles,
      progression_plan: progressionPlan,
      description: generatePersonalizedDescription(goal, daysPerWeek, userAnalysis, preferredCoach)
    },
    analysis: generateDetailedAnalysis(userAnalysis, preferredCoach, goal, daysPerWeek),
    userStats: userAnalysis,
    coachStyle: preferredCoach
  };
}

// Deep analysis of user's training history
async function analyzeUserTrainingHistory(userId: string) {
  try {
    // Get exercise history from last 8 weeks
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    
    const { data: exerciseData, error: exerciseError } = await supabase
      .from('exercise_sets')
      .select(`
        weight_kg,
        reps,
        rpe,
        created_at,
        exercises (
          name,
          category,
          muscle_groups
        )
      `)
      .eq('user_id', userId)
      .gte('created_at', eightWeeksAgo.toISOString())
      .order('created_at', { ascending: false });

    if (exerciseError) {
      console.warn('Exercise data fetch error:', exerciseError);
    }

    // Analyze patterns and strengths
    const analysis = {
      totalWorkouts: 0,
      totalVolume: 0,
      favoriteExercises: [],
      strengthEstimates: {},
      muscleGroupBalance: {},
      intensityProfile: { low: 0, medium: 0, high: 0 },
      progressionTrends: {},
      weeklyFrequency: 0,
      lastWorkout: null,
      experienceLevel: 'beginner'
    };

    if (exerciseData && exerciseData.length > 0) {
      // Count unique workout days
      const workoutDays = new Set();
      const exerciseMap = new Map();
      const muscleGroupMap = new Map();

      exerciseData.forEach(set => {
        if (!set.exercises?.name || !set.weight_kg || !set.reps) return;
        
        const workoutDate = set.created_at.split('T')[0];
        workoutDays.add(workoutDate);
        
        const volume = set.weight_kg * set.reps;
        analysis.totalVolume += volume;
        
        // Track favorite exercises
        const exerciseName = set.exercises.name;
        if (!exerciseMap.has(exerciseName)) {
          exerciseMap.set(exerciseName, { volume: 0, sets: 0, maxWeight: 0 });
        }
        const exercise = exerciseMap.get(exerciseName);
        exercise.volume += volume;
        exercise.sets += 1;
        exercise.maxWeight = Math.max(exercise.maxWeight, set.weight_kg);
        
        // Track muscle groups
        if (set.exercises.muscle_groups) {
          set.exercises.muscle_groups.forEach(mg => {
            muscleGroupMap.set(mg, (muscleGroupMap.get(mg) || 0) + volume);
          });
        }
        
        // Track intensity
        if (set.rpe) {
          if (set.rpe <= 6) analysis.intensityProfile.low++;
          else if (set.rpe <= 8) analysis.intensityProfile.medium++;
          else analysis.intensityProfile.high++;
        }
      });

      analysis.totalWorkouts = workoutDays.size;
      analysis.weeklyFrequency = Math.round((workoutDays.size / 8) * 10) / 10;
      
      // Find favorite exercises (top 5 by volume)
      analysis.favoriteExercises = Array.from(exerciseMap.entries())
        .sort((a, b) => b[1].volume - a[1].volume)
        .slice(0, 5)
        .map(([name, data]) => ({ name, ...data }));
      
      // Estimate 1RM for main lifts
      ['Bankdrücken', 'Kniebeugen', 'Kreuzheben', 'Schulterdrücken'].forEach(lift => {
        const liftData = exerciseData.filter(set => 
          set.exercises?.name?.toLowerCase().includes(lift.toLowerCase()) && 
          set.weight_kg && set.reps
        );
        if (liftData.length > 0) {
          const maxSet = liftData.reduce((max, current) => 
            (current.weight_kg > max.weight_kg) ? current : max
          );
          // Simple 1RM estimation: weight * (1 + reps/30)
          analysis.strengthEstimates[lift] = Math.round(
            maxSet.weight_kg * (1 + maxSet.reps / 30)
          );
        }
      });
      
      // Determine experience level
      if (analysis.totalWorkouts > 20 && analysis.totalVolume > 10000) {
        analysis.experienceLevel = 'intermediate';
      }
      if (analysis.totalWorkouts > 50 && analysis.totalVolume > 25000) {
        analysis.experienceLevel = 'advanced';
      }
      
      analysis.lastWorkout = exerciseData[0]?.created_at;
    }

    return analysis;
  } catch (error) {
    console.error('Error analyzing user training history:', error);
    return {
      totalWorkouts: 0,
      totalVolume: 0,
      favoriteExercises: [],
      strengthEstimates: {},
      muscleGroupBalance: {},
      intensityProfile: { low: 0, medium: 0, high: 0 },
      progressionTrends: {},
      weeklyFrequency: 0,
      lastWorkout: null,
      experienceLevel: 'beginner'
    };
  }
}

// Get user's preferred coach from conversation history
async function getPreferredCoach(userId: string) {
  try {
    const { data: conversations, error } = await supabase
      .from('coach_conversations')
      .select('coach_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !conversations || conversations.length === 0) {
      return { id: 'sascha', name: 'Sascha', style: 'motivierend' };
    }

    // Count coach interactions
    const coachCounts = {};
    conversations.forEach(conv => {
      coachCounts[conv.coach_id] = (coachCounts[conv.coach_id] || 0) + 1;
    });

    const preferredCoachId = Object.keys(coachCounts).reduce((a, b) => 
      coachCounts[a] > coachCounts[b] ? a : b
    );

    const coachStyles = {
      'sascha': { name: 'Sascha', style: 'motivierend', focus: 'Kraft & Progression' },
      'markus': { name: 'Markus', style: 'analytisch', focus: 'Technik & Form' },
      'default': { name: 'Sascha', style: 'motivierend', focus: 'Kraft & Progression' }
    };

    return { 
      id: preferredCoachId, 
      ...coachStyles[preferredCoachId] || coachStyles.default 
    };
  } catch (error) {
    console.error('Error getting preferred coach:', error);
    return { id: 'sascha', name: 'Sascha', style: 'motivierend', focus: 'Kraft & Progression' };
  }
}

// Generate personalized plan name
function generatePersonalizedPlanName(goal, daysPerWeek, userAnalysis) {
  const goalNames = {
    'hypertrophy': 'Muskelaufbau',
    'strength': 'Kraftaufbau', 
    'endurance': 'Ausdauer',
    'general': 'Fitness'
  };
  
  const baseGoal = goalNames[goal] || 'Fitness';
  const experiencePrefix = userAnalysis.experienceLevel === 'advanced' ? 'Fortgeschrittener' : 
                          userAnalysis.experienceLevel === 'intermediate' ? 'Mittelstufe' : '';
  
  return experiencePrefix ? 
    `${experiencePrefix} ${daysPerWeek}-Tage ${baseGoal} Plan` :
    `${daysPerWeek}-Tage ${baseGoal} Plan`;
}

// Generate personalized training structure with specific sets, reps, and weights
async function generatePersonalizedStructure(daysPerWeek, goal, userAnalysis, preferredCoach, experienceYears) {
  const templates = {
    3: [
      {
        day: 'Tag 1',
        focus: 'Oberkörper Push',
        exercises: generateExercisesWithDetails([
          { name: 'Bankdrücken', category: 'compound', muscleGroups: ['chest', 'triceps'] },
          { name: 'Schulterdrücken', category: 'compound', muscleGroups: ['shoulders'] },
          { name: 'Dips', category: 'compound', muscleGroups: ['chest', 'triceps'] },
          { name: 'Trizeps Extensions', category: 'isolation', muscleGroups: ['triceps'] }
        ], goal, userAnalysis)
      },
      {
        day: 'Tag 2',
        focus: 'Unterkörper',
        exercises: generateExercisesWithDetails([
          { name: 'Kniebeugen', category: 'compound', muscleGroups: ['quads', 'glutes'] },
          { name: 'Rumänisches Kreuzheben', category: 'compound', muscleGroups: ['hamstrings', 'glutes'] },
          { name: 'Ausfallschritte', category: 'compound', muscleGroups: ['quads', 'glutes'] },
          { name: 'Wadenheben', category: 'isolation', muscleGroups: ['calves'] }
        ], goal, userAnalysis)
      },
      {
        day: 'Tag 3',
        focus: 'Oberkörper Pull',
        exercises: generateExercisesWithDetails([
          { name: 'Klimmzüge', category: 'compound', muscleGroups: ['lats', 'biceps'] },
          { name: 'Rudern', category: 'compound', muscleGroups: ['lats', 'rhomboids'] },
          { name: 'Bizeps Curls', category: 'isolation', muscleGroups: ['biceps'] },
          { name: 'Face Pulls', category: 'isolation', muscleGroups: ['rear_delts'] }
        ], goal, userAnalysis)
      }
    ],
    4: [
      {
        day: 'Tag 1',
        focus: 'Brust & Trizeps',
        exercises: generateExercisesWithDetails([
          { name: 'Bankdrücken', category: 'compound', muscleGroups: ['chest'] },
          { name: 'Schrägbankdrücken', category: 'compound', muscleGroups: ['chest'] },
          { name: 'Dips', category: 'compound', muscleGroups: ['chest', 'triceps'] },
          { name: 'Trizeps Extensions', category: 'isolation', muscleGroups: ['triceps'] }
        ], goal, userAnalysis)
      },
      {
        day: 'Tag 2',
        focus: 'Rücken & Bizeps',
        exercises: generateExercisesWithDetails([
          { name: 'Klimmzüge', category: 'compound', muscleGroups: ['lats'] },
          { name: 'Rudern', category: 'compound', muscleGroups: ['lats'] },
          { name: 'Bizeps Curls', category: 'isolation', muscleGroups: ['biceps'] },
          { name: 'Hammer Curls', category: 'isolation', muscleGroups: ['biceps'] }
        ], goal, userAnalysis)
      },
      {
        day: 'Tag 3',
        focus: 'Beine',
        exercises: generateExercisesWithDetails([
          { name: 'Kniebeugen', category: 'compound', muscleGroups: ['quads'] },
          { name: 'Rumänisches Kreuzheben', category: 'compound', muscleGroups: ['hamstrings'] },
          { name: 'Beinpresse', category: 'compound', muscleGroups: ['quads'] },
          { name: 'Wadenheben', category: 'isolation', muscleGroups: ['calves'] }
        ], goal, userAnalysis)
      },
      {
        day: 'Tag 4',
        focus: 'Schultern & Bauch',
        exercises: generateExercisesWithDetails([
          { name: 'Schulterdrücken', category: 'compound', muscleGroups: ['shoulders'] },
          { name: 'Seitliche Raises', category: 'isolation', muscleGroups: ['shoulders'] },
          { name: 'Vorgebeugtes Fliegen', category: 'isolation', muscleGroups: ['rear_delts'] },
          { name: 'Planks', category: 'core', muscleGroups: ['abs'] }
        ], goal, userAnalysis)
      }
    ]
  };

  return templates[daysPerWeek] || templates[3];
}

// Generate exercises with specific sets, reps, weights and RPE
function generateExercisesWithDetails(exercises, goal, userAnalysis) {
  return exercises.map(exercise => {
    let sets, reps, rpe, weight = null;
    
    // Set parameters based on goal
    if (goal === 'strength') {
      sets = '4-5';
      reps = '3-5';
      rpe = '8-9';
    } else if (goal === 'hypertrophy') {
      sets = '3-4';
      reps = '8-12';
      rpe = '7-8';
    } else {
      sets = '3';
      reps = '8-10';
      rpe = '6-7';
    }
    
    // Adjust based on exercise category
    if (exercise.category === 'isolation') {
      sets = '3';
      reps = goal === 'strength' ? '6-8' : '12-15';
      rpe = '6-8';
    }
    
    // Add weight recommendations based on user history
    if (userAnalysis.strengthEstimates[exercise.name]) {
      const estimate = userAnalysis.strengthEstimates[exercise.name];
      const workingWeight = Math.round(estimate * (goal === 'strength' ? 0.85 : 0.7));
      weight = `${workingWeight}kg (geschätzt)`;
    }
    
    return {
      name: exercise.name,
      sets,
      reps,
      rpe,
      weight,
      rest: exercise.category === 'compound' ? '2-3 min' : '1-2 min',
      notes: generateExerciseNotes(exercise, userAnalysis)
    };
  });
}

// Generate exercise-specific coaching notes
function generateExerciseNotes(exercise, userAnalysis) {
  const notes = [];
  
  if (userAnalysis.experienceLevel === 'beginner') {
    notes.push('Fokus auf saubere Technik');
  }
  
  if (userAnalysis.favoriteExercises.some(fav => fav.name === exercise.name)) {
    notes.push('Du trainierst diese Übung bereits regelmäßig');
  }
  
  return notes.join(', ');
}

// Generate coaching principles based on user data and coach style
function generateCoachingPrinciples(goal, experienceYears, userAnalysis, preferredCoach) {
  const principles = [];
  
  // Base principles by goal
  if (goal === 'hypertrophy') {
    principles.push('8-12 Wiederholungen für optimalen Muskelaufbau');
    principles.push('3-4 Sätze pro Übung mit 60-90s Pause');
    principles.push('Zeit unter Spannung: 2-1-2 Tempo');
  } else if (goal === 'strength') {
    principles.push('3-6 Wiederholungen für Kraftentwicklung');
    principles.push('4-5 Sätze mit 2-3 Minuten Pause');
    principles.push('Explosive konzentrische Phase');
  }
  
  // Coach-specific adjustments
  if (preferredCoach.style === 'motivierend') {
    principles.push('Progressive Überladung jede Woche anstreben');
    principles.push('Schwere Grundübungen priorisieren');
  } else if (preferredCoach.style === 'analytisch') {
    principles.push('Exakte Ausführung vor Gewichtssteigerung');
    principles.push('Regelmäßige Technik-Checks einbauen');
  }
  
  // Experience-based adjustments
  if (userAnalysis.experienceLevel === 'beginner') {
    principles.push('Ganzkörper-Training für optimale Frequenz');
    principles.push('Maschinenübungen für Sicherheit nutzen');
  } else if (userAnalysis.experienceLevel === 'advanced') {
    principles.push('Intensitätstechniken gezielt einsetzen');
    principles.push('Periodisierung der Trainingsvolumen');
  }
  
  return principles;
}

// Generate progression recommendations
function generateProgressionRecommendations(userAnalysis, goal) {
  const recommendations = {
    weekly_progression: {},
    volume_targets: {},
    intensity_zones: {}
  };
  
  if (goal === 'strength') {
    recommendations.weekly_progression = {
      method: 'linear',
      increment: '2.5-5kg pro Woche bei Grundübungen',
      deload: 'Alle 4-6 Wochen 10% reduzieren'
    };
  } else {
    recommendations.weekly_progression = {
      method: 'volume_based',
      increment: '1-2 zusätzliche Sätze oder 2.5kg',
      deload: 'Bei Stagnation Volume um 20% reduzieren'
    };
  }
  
  return recommendations;
}

// Generate personalized description
function generatePersonalizedDescription(goal, daysPerWeek, userAnalysis, preferredCoach) {
  let description = `Ein personalisierter ${daysPerWeek}-Tage-Plan für ${goal === 'hypertrophy' ? 'Muskelaufbau' : goal}. `;
  
  if (userAnalysis.totalWorkouts > 0) {
    description += `Basierend auf deinen ${userAnalysis.totalWorkouts} bisherigen Workouts und ${Math.round(userAnalysis.totalVolume)}kg Gesamtvolumen. `;
  }
  
  if (userAnalysis.favoriteExercises.length > 0) {
    description += `Berücksichtigt deine bevorzugten Übungen wie ${userAnalysis.favoriteExercises[0].name}. `;
  }
  
  description += `Angepasst an ${preferredCoach.name}s ${preferredCoach.style}en Coaching-Stil.`;
  
  return description;
}

// Generate detailed analysis text
function generateDetailedAnalysis(userAnalysis, preferredCoach, goal, daysPerWeek) {
  let analysis = `**Personalisierte Trainingsplan-Analyse:**\n\n`;
  
  if (userAnalysis.totalWorkouts > 0) {
    analysis += `📊 **Deine Trainingsdaten:**\n`;
    analysis += `• ${userAnalysis.totalWorkouts} Workouts in den letzten 8 Wochen\n`;
    analysis += `• ${Math.round(userAnalysis.totalVolume)}kg Gesamtvolumen\n`;
    analysis += `• ${userAnalysis.weeklyFrequency} Trainingstage pro Woche\n`;
    analysis += `• Level: ${userAnalysis.experienceLevel}\n\n`;
    
    if (userAnalysis.favoriteExercises.length > 0) {
      analysis += `🏋️ **Deine Top-Übungen:**\n`;
      userAnalysis.favoriteExercises.slice(0, 3).forEach((ex, i) => {
        analysis += `${i + 1}. ${ex.name} (${Math.round(ex.volume)}kg Volume)\n`;
      });
      analysis += `\n`;
    }
    
    if (Object.keys(userAnalysis.strengthEstimates).length > 0) {
      analysis += `💪 **Geschätzte 1RM-Werte:**\n`;
      Object.entries(userAnalysis.strengthEstimates).forEach(([exercise, weight]) => {
        analysis += `• ${exercise}: ${weight}kg\n`;
      });
      analysis += `\n`;
    }
  }
  
  analysis += `🎯 **Coach ${preferredCoach.name}s Empfehlung:**\n`;
  analysis += `Dieser ${daysPerWeek}-Tage ${goal}-Plan ist perfekt auf dein aktuelles Level abgestimmt. `;
  
  if (preferredCoach.style === 'motivierend') {
    analysis += `Mit dem Fokus auf progressive Steigerung und intensive Grundübungen wirst du schnell Fortschritte sehen!`;
  } else {
    analysis += `Durch präzise Technik und systematische Progression wirst du nachhaltige Erfolge erzielen.`;
  }
  
  return analysis;
}