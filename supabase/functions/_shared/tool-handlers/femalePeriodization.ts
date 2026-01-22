import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface FemalePeriodization {
  cycle_length: number;
  current_phase: string;
  training_goal: 'strength' | 'hypertrophy' | 'endurance' | 'fat_loss' | 'general_fitness';
  experience_level: 'beginner' | 'intermediate' | 'advanced';
  available_days: number;
  session_duration: number;
  preferences: string[];
  contraception_type?: 'none' | 'pill' | 'iud' | 'other';
}

export default async function handleFemalePeriodization(conv: any[], userId: string) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  
  function extractPeriodizationData(text: string): FemalePeriodization {
    const data: FemalePeriodization = {
      cycle_length: 28,
      current_phase: 'follicular',
      training_goal: 'general_fitness',
      experience_level: 'intermediate',
      available_days: 3,
      session_duration: 60,
      preferences: [],
      contraception_type: 'none'
    };
    
    // Training goal extraction
    if (text.match(/\b(masse|muskeln|hypertrophie|größer|breiter|volumen)\b/i)) {
      data.training_goal = 'hypertrophy';
    } else if (text.match(/\b(kraft|stärke|1rm|powerlifting|stark|maximal)\b/i)) {
      data.training_goal = 'strength';
    } else if (text.match(/\b(cardio|laufen|ausdauer|marathon|kondition)\b/i)) {
      data.training_goal = 'endurance';
    } else if (text.match(/\b(abnehmen|fett|definition|toned|schlank)\b/i)) {
      data.training_goal = 'fat_loss';
    }
    
    // Experience level
    if (text.match(/\b(anfänger|beginner|neu|erste?s?\s+mal)\b/i)) {
      data.experience_level = 'beginner';
    } else if (text.match(/\b(fortgeschritten|advanced|profi|jahre|wettkampf)\b/i)) {
      data.experience_level = 'advanced';
    }
    
    // Available days
    const daysMatch = text.match(/(\d)\s*(?:mal|x|tage?)\s*(?:pro|in\s+der|\/)\s*woche/i);
    if (daysMatch) {
      data.available_days = parseInt(daysMatch[1]);
    }
    
    // Session duration
    const durationMatch = text.match(/(\d{2,3})\s*(?:min|minuten|stunden?)/i);
    if (durationMatch) {
      let duration = parseInt(durationMatch[1]);
      if (text.includes('stunde')) duration *= 60;
      data.session_duration = duration;
    }
    
    // Preferences
    if (text.match(/\b(kraft|heavy|schwer)\b/i)) data.preferences.push('strength_focus');
    if (text.match(/\b(pump|brennen|feel)\b/i)) data.preferences.push('pump_style');
    if (text.match(/\b(funktional|athletic|sport)\b/i)) data.preferences.push('functional');
    if (text.match(/\b(zuhause|home|bodyweight)\b/i)) data.preferences.push('home_workout');
    if (text.match(/\b(studio|gym|geräte)\b/i)) data.preferences.push('gym_equipment');
    
    // Contraception
    if (text.match(/\b(pille|pill|antibaby)\b/i)) {
      data.contraception_type = 'pill';
    } else if (text.match(/\b(spirale|iud|kupfer)\b/i)) {
      data.contraception_type = 'iud';
    } else if (text.match(/\b(verhütung|hormon)\b/i)) {
      data.contraception_type = 'other';
    }
    
    return data;
  }
  
  function generateCyclePeriodization(data: FemalePeriodization): any {
    const baseTemplate = getBaseTemplate(data.training_goal, data.experience_level);
    
    // Adjust for contraception - hormonal contraception dampens natural cycle
    const hasNaturalCycle = data.contraception_type === 'none';
    
    const phases = {
      menstrual: {
        name: 'Menstrual (Tag 1-5)',
        intensity: hasNaturalCycle ? 'low' : 'moderate',
        volume_modifier: hasNaturalCycle ? 0.7 : 0.85,
        focus: ['mobility', 'light_cardio', 'yoga'],
        avoid: ['max_attempts', 'high_volume'],
        description: hasNaturalCycle 
          ? 'Sanfte Bewegung, Regeneration priorisieren' 
          : 'Leicht reduzierte Intensität, aber normal trainierbar'
      },
      follicular: {
        name: 'Follikulär (Tag 6-13)',
        intensity: 'high',
        volume_modifier: 1.1,
        focus: ['strength', 'skill_learning', 'progressive_overload'],
        avoid: [],
        description: 'Beste Zeit für Kraftzuwächse und neue Übungen'
      },
      ovulatory: {
        name: 'Ovulation (Tag 14-16)',
        intensity: 'peak',
        volume_modifier: 1.2,
        focus: ['max_attempts', 'explosive_training', 'competition'],
        avoid: [],
        description: 'Peak Performance - Zeit für persönliche Bestleistungen'
      },
      luteal: {
        name: 'Luteal (Tag 17-28)',
        intensity: 'moderate',
        volume_modifier: 0.9,
        focus: ['endurance', 'stability', 'injury_prevention'],
        avoid: ['new_exercises', 'max_loads'],
        description: 'Fokus auf Kraftausdauer und Verletzungsprävention'
      }
    };
    
    return {
      base_template: baseTemplate,
      cycle_phases: phases,
      weekly_schedule: generateWeeklySchedule(data, phases),
      nutrition_cycling: getNutritionCycling(hasNaturalCycle),
      supplement_protocol: getSupplementProtocol(data.training_goal)
    };
  }
  
  function getBaseTemplate(goal: string, level: string): any {
    const templates = {
      strength: {
        beginner: { sets: '3-4', reps: '5-8', rest: '2-3min', frequency: 3 },
        intermediate: { sets: '4-5', reps: '3-6', rest: '3-4min', frequency: 4 },
        advanced: { sets: '5-6', reps: '1-5', rest: '3-5min', frequency: 5 }
      },
      hypertrophy: {
        beginner: { sets: '3-4', reps: '8-12', rest: '60-90s', frequency: 3 },
        intermediate: { sets: '4-5', reps: '6-12', rest: '90-120s', frequency: 4 },
        advanced: { sets: '5-6', reps: '6-15', rest: '60-120s', frequency: 5 }
      },
      endurance: {
        beginner: { sets: '2-3', reps: '12-20', rest: '30-60s', frequency: 3 },
        intermediate: { sets: '3-4', reps: '15-25', rest: '30-45s', frequency: 4 },
        advanced: { sets: '4-5', reps: '20-30', rest: '30s', frequency: 5 }
      },
      fat_loss: {
        beginner: { sets: '3', reps: '10-15', rest: '45-60s', frequency: 4 },
        intermediate: { sets: '3-4', reps: '10-15', rest: '30-45s', frequency: 5 },
        advanced: { sets: '4-5', reps: '12-20', rest: '30s', frequency: 6 }
      },
      general_fitness: {
        beginner: { sets: '2-3', reps: '8-15', rest: '60-90s', frequency: 3 },
        intermediate: { sets: '3-4', reps: '8-15', rest: '60-90s', frequency: 4 },
        advanced: { sets: '3-4', reps: '8-15', rest: '60-90s', frequency: 4 }
      }
    };
    
    type GoalType = 'strength' | 'hypertrophy' | 'endurance' | 'fat_loss' | 'general_fitness';
    type LevelType = 'beginner' | 'intermediate' | 'advanced';
    return (templates[goal as GoalType]?.[level as LevelType]) || templates.general_fitness.intermediate;
  }
  
  function generateWeeklySchedule(data: FemalePeriodization, phases: any): any {
    const schedule: Record<string, any> = {};
    const daysPerWeek = Math.min(data.available_days, 6);
    
    // Create cycle-based weekly templates
    Object.keys(phases).forEach(phaseName => {
      const phase = phases[phaseName];
      schedule[phaseName] = createPhaseSchedule(daysPerWeek, phase, data);
    });
    
    return schedule;
  }
  
  function createPhaseSchedule(days: number, phase: any, data: FemalePeriodization): any {
    const schedules: Record<number, string[]> = {
      3: ['Upper Body + Core', 'Lower Body + Cardio', 'Full Body + Mobility'],
      4: ['Upper Push', 'Lower Body', 'Upper Pull', 'Full Body + Cardio'],
      5: ['Push', 'Pull', 'Legs', 'Upper Body', 'Full Body + Cardio'],
      6: ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Active Recovery']
    };
    
    const baseSchedule = schedules[days] || schedules[3];
    
    return baseSchedule.map((session: string, index: number) => ({
      day: index + 1,
      session_name: session,
      intensity_modifier: phase.volume_modifier,
      focus: phase.focus,
      avoid: phase.avoid,
      duration: data.session_duration,
      special_notes: getPhaseSpecificNotes(phase.name, session)
    }));
  }
  
  function getPhaseSpecificNotes(phaseName: string, session: string): string[] {
    const notes: Record<string, string[]> = {
      'Menstrual (Tag 1-5)': [
        'Aufwärmzeit verlängern',
        'Bei starken Beschwerden: Yoga/Spaziergang als Alternative',
        'Hydration besonders wichtig'
      ],
      'Follikulär (Tag 6-13)': [
        'Beste Zeit für schwere Grundübungen',
        'Neue Übungen/Techniken ausprobieren',
        'Progressive Overload anstreben'
      ],
      'Ovulation (Tag 14-16)': [
        'Maximalversuche möglich',
        'Explosive Bewegungen betonen',
        'Koordination ist auf Peak-Level'
      ],
      'Luteal (Tag 17-28)': [
        'Verletzungsprävention priorisieren',
        'Längere Aufwärmphase',
        'Bei PMS: Intensität reduzieren'
      ]
    };
    
    return notes[phaseName] || [];
  }
  
  function getNutritionCycling(hasNaturalCycle: boolean): any {
    if (!hasNaturalCycle) {
      return {
        approach: 'consistent',
        note: 'Bei hormoneller Verhütung: Gleichmäßige Ernährung ohne Zyklusanpassung'
      };
    }
    
    return {
      menstrual: {
        focus: 'Eisen-reiche Lebensmittel, Magnesium, warme Speisen',
        calories: 'Maintenance oder leicht erhöht',
        carbs: 'Moderat, Fokus auf komplexe KH'
      },
      follicular: {
        focus: 'Protein erhöhen, gesunde Fette, frisches Obst/Gemüse',
        calories: 'Leichtes Defizit möglich',
        carbs: 'Pre-Workout erhöht für bessere Performance'
      },
      ovulatory: {
        focus: 'Antioxidantien, gesunde Fette, hochwertige Proteine',
        calories: 'Maintenance',
        carbs: 'Um Workouts erhöht'
      },
      luteal: {
        focus: 'Magnesium, B-Vitamine, Omega-3, warme Speisen',
        calories: 'Maintenance bis leicht erhöht',
        carbs: 'Komplex, Heißhunger-Management'
      }
    };
  }
  
  function getSupplementProtocol(goal: string): any {
    const base = {
      daily: ['Vitamin D3', 'Omega-3', 'Magnesium'],
      cycle_specific: {
        menstrual: ['Eisen (bei Bedarf)', 'Magnesium erhöht'],
        follicular: ['B-Komplex', 'Kreatin'],
        ovulatory: ['Vitamin E', 'Selen'],
        luteal: ['Magnesium', 'B6', 'Adaptogene']
      }
    };
    
    const goalSpecific: Record<string, string[]> = {
      strength: ['Kreatin', 'Beta-Alanin'],
      hypertrophy: ['Protein Powder', 'HMB'],
      endurance: ['Elektrolyte', 'Iron'],
      fat_loss: ['L-Carnitin', 'Green Tea Extract']
    };
    
    if (goalSpecific[goal]) {
      base.daily.push(...goalSpecific[goal]);
    }
    
    return base;
  }
  
  const periodizationData = extractPeriodizationData(lastUserMsg);
  const periodization = generateCyclePeriodization(periodizationData);
  
  // Save to database
  try {
    await supabase.from('female_periodization_plans').insert({
      user_id: userId,
      plan_data: periodization,
      user_preferences: periodizationData,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving periodization plan:', error);
  }
  
  return {
    role: 'assistant',
    type: 'card',
    card: 'female_periodization',
    payload: {
      periodization,
      current_recommendations: getCurrentPhaseRecommendations(periodizationData.current_phase, periodization),
      vita_wisdom: getVitaWisdom(periodizationData),
      ts: Date.now()
    },
    meta: { clearTool: true }
  };
}

function getCurrentPhaseRecommendations(currentPhase: string, periodization: any): any {
  const phase = periodization.cycle_phases[currentPhase];
  if (!phase) return null;
  
  return {
    phase_name: phase.name,
    description: phase.description,
    training_focus: phase.focus,
    intensity: phase.intensity,
    this_week_plan: periodization.weekly_schedule[currentPhase] || [],
    nutrition_tips: periodization.nutrition_cycling[currentPhase] || {},
    supplements: periodization.supplement_protocol.cycle_specific[currentPhase] || []
  };
}

function getVitaWisdom(data: FemalePeriodization): string {
  const wisdoms = {
    strength: "Deine weibliche Kraft ist zyklisch - nutze diese Superpower! 💪✨",
    hypertrophy: "Muskeln wachsen im Rhythmus deines Zyklus - wir arbeiten MIT deinem Körper! 🌸",
    endurance: "Ausdauer ist weiblich - von der ersten Periode bis zur goldenen Reife! 🌺",
    fat_loss: "Stoffwechsel folgt deinem 28-Tage-Rhythmus, nicht dem 7-Tage-Kalender der Männer! ✨",
    general_fitness: "Fitness bedeutet im Einklang mit deinem natürlichen Rhythmus zu leben! 🌙"
  };
  
  return wisdoms[data.training_goal] || wisdoms.general_fitness;
}