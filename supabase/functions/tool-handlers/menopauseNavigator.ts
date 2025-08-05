import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface MenopauseProfile {
  age: number;
  menopause_stage: 'perimenopause' | 'menopause' | 'postmenopause';
  last_period_date?: string;
  symptoms: {
    vasomotor: string[]; // hot flashes, night sweats
    physical: string[]; // joint pain, weight gain
    cognitive: string[]; // brain fog, memory
    emotional: string[]; // mood swings, anxiety
    sleep: string[]; // insomnia, restless sleep
  };
  hrt_status: 'none' | 'considering' | 'current' | 'past';
  current_medications: string[];
  health_concerns: string[];
  fitness_goals: string[];
  current_activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
}

export default async function handleMenopauseNavigator(conv: any[], userId: string) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  
  function extractMenopauseProfile(text: string): MenopauseProfile {
    const profile: MenopauseProfile = {
      age: 50,
      menopause_stage: 'perimenopause',
      symptoms: {
        vasomotor: [],
        physical: [],
        cognitive: [],
        emotional: [],
        sleep: []
      },
      hrt_status: 'none',
      current_medications: [],
      health_concerns: [],
      fitness_goals: [],
      current_activity_level: 'light'
    };
    
    // Age extraction
    const ageMatch = text.match(/(?:bin|ich\s+bin|alter)\s*(\d{2})\s*(?:jahre?)?/i);
    if (ageMatch) {
      profile.age = parseInt(ageMatch[1]);
    }
    
    // Menopause stage determination
    if (text.includes('letzte periode') || text.includes('keine periode')) {
      const monthsMatch = text.match(/(?:seit|vor)\s*(\d{1,2})\s*monat/i);
      if (monthsMatch) {
        const months = parseInt(monthsMatch[1]);
        if (months >= 12) {
          profile.menopause_stage = 'menopause';
        } else {
          profile.menopause_stage = 'perimenopause';
        }
      }
    } else if (text.includes('wechseljahre') && text.includes('durch')) {
      profile.menopause_stage = 'postmenopause';
    } else if (text.includes('unregelmäßig') || text.includes('perimenopause')) {
      profile.menopause_stage = 'perimenopause';
    }
    
    // Vasomotor symptoms
    const vasomotorSymptoms = [
      { keywords: ['hitzewallungen', 'hot flash', 'schweißausbruch'], symptom: 'hot_flashes' },
      { keywords: ['nachtschweiß', 'night sweat', 'verschwitzt'], symptom: 'night_sweats' },
      { keywords: ['herzrasen', 'palpitation'], symptom: 'palpitations' }
    ];
    
    for (const { keywords, symptom } of vasomotorSymptoms) {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        profile.symptoms.vasomotor.push(symptom);
      }
    }
    
    // Physical symptoms
    const physicalSymptoms = [
      { keywords: ['gelenkschmerz', 'gelenk', 'steif'], symptom: 'joint_pain' },
      { keywords: ['gewichtszunahme', 'zunehmen', 'bauchfett'], symptom: 'weight_gain' },
      { keywords: ['trocken', 'scheide', 'vaginal'], symptom: 'vaginal_dryness' },
      { keywords: ['hautproblem', 'trocken', 'falten'], symptom: 'skin_changes' },
      { keywords: ['haarausfall', 'haare', 'dünner'], symptom: 'hair_loss' },
      { keywords: ['osteoporose', 'knochen', 'dichte'], symptom: 'bone_loss' }
    ];
    
    for (const { keywords, symptom } of physicalSymptoms) {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        profile.symptoms.physical.push(symptom);
      }
    }
    
    // Cognitive symptoms
    const cognitiveSymptoms = [
      { keywords: ['gehirnnebel', 'brain fog', 'benebelt'], symptom: 'brain_fog' },
      { keywords: ['vergesslich', 'gedächtnis', 'memory'], symptom: 'memory_issues' },
      { keywords: ['konzentration', 'focus', 'unkonzentriert'], symptom: 'concentration_problems' }
    ];
    
    for (const { keywords, symptom } of cognitiveSymptoms) {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        profile.symptoms.cognitive.push(symptom);
      }
    }
    
    // Emotional symptoms
    const emotionalSymptoms = [
      { keywords: ['stimmung', 'launisch', 'emotional'], symptom: 'mood_swings' },
      { keywords: ['depression', 'traurig', 'niedergeschlagen'], symptom: 'depression' },
      { keywords: ['angst', 'ängstlich', 'panik'], symptom: 'anxiety' },
      { keywords: ['reizbar', 'gereizt', 'aggressiv'], symptom: 'irritability' }
    ];
    
    for (const { keywords, symptom } of emotionalSymptoms) {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        profile.symptoms.emotional.push(symptom);
      }
    }
    
    // Sleep symptoms
    const sleepSymptoms = [
      { keywords: ['schlaflos', 'insomnia', 'einschlafen'], symptom: 'insomnia' },
      { keywords: ['durchschlafen', 'aufwachen', 'unruhig'], symptom: 'sleep_maintenance' },
      { keywords: ['müde', 'erschöpft', 'schlapp'], symptom: 'fatigue' }
    ];
    
    for (const { keywords, symptom } of sleepSymptoms) {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        profile.symptoms.sleep.push(symptom);
      }
    }
    
    // HRT status
    if (text.includes('hormonersatz') || text.includes('hrt')) {
      if (text.includes('nehme') || text.includes('bekomme')) {
        profile.hrt_status = 'current';
      } else if (text.includes('überlege') || text.includes('denke')) {
        profile.hrt_status = 'considering';
      }
    }
    
    // Activity level
    if (text.includes('sehr aktiv') || text.includes('täglich sport')) {
      profile.current_activity_level = 'very_active';
    } else if (text.includes('regelmäßig') || text.includes('sport')) {
      profile.current_activity_level = 'moderate';
    } else if (text.includes('wenig') || text.includes('selten')) {
      profile.current_activity_level = 'light';
    } else if (text.includes('gar nicht') || text.includes('sitzend')) {
      profile.current_activity_level = 'sedentary';
    }
    
    // Fitness goals
    if (text.includes('abnehmen') || text.includes('gewicht')) {
      profile.fitness_goals.push('weight_management');
    }
    if (text.includes('kraft') || text.includes('muskeln')) {
      profile.fitness_goals.push('strength_building');
    }
    if (text.includes('knochen') || text.includes('osteoporose')) {
      profile.fitness_goals.push('bone_health');
    }
    if (text.includes('herz') || text.includes('cardio')) {
      profile.fitness_goals.push('cardiovascular_health');
    }
    
    return profile;
  }
  
  function generateMenopauseGuidance(profile: MenopauseProfile): any {
    const guidance = {
      stage_specific_advice: getStageSpecificAdvice(profile.menopause_stage, profile.age),
      exercise_recommendations: getExerciseRecommendations(profile),
      nutrition_guidance: getNutritionGuidance(profile),
      supplement_recommendations: getSupplementRecommendations(profile),
      lifestyle_modifications: getLifestyleModifications(profile),
      symptom_management: getSymptomManagement(profile),
      medical_considerations: getMedicalConsiderations(profile),
      bone_health_protocol: getBoneHealthProtocol(profile),
      hormone_support: getHormoneSupport(profile)
    };
    
    return guidance;
  }
  
  function getStageSpecificAdvice(stage: string, age: number): any {
    const advice = {
      perimenopause: {
        title: 'Perimenopause Navigation',
        description: 'Die Vorbereitung auf die Wechseljahre - Zeit für Grundlagenstärkung',
        key_focus: [
          'Muskel- und Knochendichte aufbauen',
          'Hormonelle Schwankungen ausgleichen',
          'Stoffwechsel optimieren',
          'Stressresilienz entwickeln'
        ],
        timeline: '2-8 Jahre vor der Menopause'
      },
      menopause: {
        title: 'Menopause Transition',
        description: 'Der Übergang - 12 Monate ohne Periode',
        key_focus: [
          'Symptom-Management intensivieren',
          'Knochenschutz priorisieren',
          'Herzgesundheit überwachen',
          'Neue Routine etablieren'
        ],
        timeline: 'Durchschnitt: 51 Jahre'
      },
      postmenopause: {
        title: 'Postmenopausale Vitalität',
        description: 'Die goldene Reife - Zeit für nachhaltigen Aufbau',
        key_focus: [
          'Langfristige Gesundheitsvorsorge',
          'Kraft- und Funktionserhalt',
          'Lebensqualität maximieren',
          'Präventive Maßnahmen'
        ],
        timeline: 'Rest des Lebens'
      }
    };
    
    return advice[stage] || advice.perimenopause;
  }
  
  function getExerciseRecommendations(profile: MenopauseProfile): any {
    const baseRecommendations = {
      strength_training: {
        frequency: '3-4x pro Woche',
        focus: 'Große Muskelgruppen, Compound-Übungen',
        intensity: '70-85% 1RM',
        specific_exercises: [
          'Kniebeugen (Knochenaufbau)',
          'Kreuzheben (Rumpfkraft)',
          'Überkopfdrücken (Schulterstabilität)',
          'Rudern (Haltung)',
          'Step-ups (Funktionalität)'
        ]
      },
      cardiovascular: {
        frequency: '4-5x pro Woche',
        types: ['Gehen', 'Schwimmen', 'Radfahren', 'Tanzen'],
        intensity: 'Moderat bis intensiv',
        duration: '30-45 Minuten'
      },
      flexibility_balance: {
        frequency: 'Täglich',
        types: ['Yoga', 'Tai Chi', 'Stretching', 'Balance-Training'],
        benefits: 'Sturzprävention, Stressreduktion, Beweglichkeit'
      }
    };
    
    // Adjust based on symptoms
    if (profile.symptoms.physical.includes('joint_pain')) {
      baseRecommendations.modifications = [
        'Gelenkschonende Übungen bevorzugen',
        'Wassergymnastik integrieren',
        'Längere Aufwärmphase'
      ];
    }
    
    if (profile.symptoms.vasomotor.includes('hot_flashes')) {
      baseRecommendations.modifications = [
        'Gut belüftete Räume wählen',
        'Kühlende Handtücher bereithalten',
        'Intensität bei Hitzewallungen reduzieren'
      ];
    }
    
    return baseRecommendations;
  }
  
  function getNutritionGuidance(profile: MenopauseProfile): any {
    return {
      key_principles: [
        'Protein: 1.2-1.6g/kg Körpergewicht',
        'Kalzium: 1200mg täglich',
        'Vitamin D: 800-1000 IU',
        'Omega-3: 2-3g täglich'
      ],
      hormone_supportive_foods: [
        'Phytoöstrogene: Soja, Leinsamen, Hülsenfrüchte',
        'Kreuzblütler: Brokkoli, Blumenkohl, Grünkohl',
        'Antioxidantien: Beeren, dunkles Blattgemüse',
        'Gesunde Fette: Avocado, Nüsse, Olivenöl'
      ],
      avoid_or_limit: [
        'Alkohol (verstärkt Hitzewallungen)',
        'Koffein (kann Schlaf stören)',
        'Zucker (fördert Gewichtszunahme)',
        'Verarbeitete Lebensmittel'
      ],
      meal_timing: 'Regelmäßige Mahlzeiten für stabilen Blutzucker'
    };
  }
  
  function getSupplementRecommendations(profile: MenopauseProfile): any {
    const base = [
      'Vitamin D3: 1000-2000 IU täglich',
      'Kalzium: 500-600mg (zusätzlich zur Nahrung)',
      'Magnesium: 320mg täglich',
      'Omega-3: 1000-2000mg EPA/DHA'
    ];
    
    const symptomSpecific = [];
    
    if (profile.symptoms.vasomotor.length > 0) {
      symptomSpecific.push('Black Cohosh: 40-80mg');
      symptomSpecific.push('Salbei-Extrakt: 100mg');
    }
    
    if (profile.symptoms.emotional.length > 0) {
      symptomSpecific.push('Johanniskraut: 300mg (nach Rücksprache)');
      symptomSpecific.push('Ashwagandha: 300-500mg');
    }
    
    if (profile.symptoms.sleep.length > 0) {
      symptomSpecific.push('Melatonin: 0.5-3mg');
      symptomSpecific.push('L-Theanin: 200mg');
    }
    
    if (profile.symptoms.cognitive.length > 0) {
      symptomSpecific.push('Ginkgo Biloba: 120-240mg');
      symptomSpecific.push('B-Komplex hochdosiert');
    }
    
    return {
      essential: base,
      symptom_targeted: symptomSpecific,
      note: 'Alle Supplements mit Arzt/Ärztin besprechen, besonders bei Medikamenteneinnahme'
    };
  }
  
  function getLifestyleModifications(profile: MenopauseProfile): string[] {
    const modifications = [
      'Stressmanagement: Meditation, Atemübungen',
      'Schlafhygiene: Regelmäßige Zeiten, kühler Raum',
      'Soziale Verbindungen pflegen',
      'Hobbies und Leidenschaften entwickeln'
    ];
    
    if (profile.symptoms.vasomotor.length > 0) {
      modifications.push('Trigger identifizieren: Alkohol, Stress, scharfes Essen');
      modifications.push('Schichtkleidung tragen');
    }
    
    return modifications;
  }
  
  function getSymptomManagement(profile: MenopauseProfile): any {
    const management = {};
    
    if (profile.symptoms.vasomotor.length > 0) {
      management.vasomotor = [
        'Atemtechniken bei Hitzewallungen',
        'Kühlende Strategien entwickeln',
        'Trigger-Tagebuch führen'
      ];
    }
    
    if (profile.symptoms.sleep.length > 0) {
      management.sleep = [
        'Schlafzimmer kühl halten (16-18°C)',
        'Elektronik 1h vor Schlaf ausschalten',
        'Entspannungsroutine etablieren'
      ];
    }
    
    if (profile.symptoms.emotional.length > 0) {
      management.emotional = [
        'Professionelle Unterstützung suchen',
        'Achtsamkeitspraxis entwickeln',
        'Support-Gruppen erwägen'
      ];
    }
    
    return management;
  }
  
  function getMedicalConsiderations(profile: MenopauseProfile): string[] {
    const considerations = [
      'Jährliche gynäkologische Untersuchung',
      'Knochendichtemessung alle 2 Jahre',
      'Kardiovaskuläres Screening',
      'Mammographie nach Empfehlung'
    ];
    
    if (profile.symptoms.vasomotor.length >= 3) {
      considerations.push('HRT-Beratung mit Gynäkolog*in');
    }
    
    if (profile.symptoms.emotional.includes('depression')) {
      considerations.push('Psychiatrische/psychologische Betreuung');
    }
    
    return considerations;
  }
  
  function getBoneHealthProtocol(profile: MenopauseProfile): any {
    return {
      assessment: 'DEXA-Scan alle 1-2 Jahre',
      exercise: [
        'Gewichttragendes Training 4-5x/Woche',
        'Impact-Training (wo verträglich)',
        'Balance-Training zur Sturzprävention'
      ],
      nutrition: [
        'Kalzium: 1200mg täglich',
        'Vitamin D: Spiegel >75 nmol/L',
        'Protein: 1.2-1.6g/kg',
        'Vitamin K2: 100-200mcg'
      ],
      lifestyle: [
        'Rauchen stoppen',
        'Alkohol limitieren',
        'Sturzrisiko minimieren'
      ]
    };
  }
  
  function getHormoneSupport(profile: MenopauseProfile): any {
    return {
      natural_approaches: [
        'Phytoöstrogene in der Ernährung',
        'Adaptogene Kräuter',
        'Stressreduktion',
        'Ausreichend Schlaf'
      ],
      hrt_considerations: profile.hrt_status === 'considering' ? [
        'Individuelle Risiko-Nutzen-Abwägung',
        'Verschiedene Applikationsformen verfügbar',
        'Regelmäßige Kontrollen notwendig',
        'Zeitfenster beachten (within 10 years)'
      ] : [],
      monitoring: [
        'Symptom-Tagebuch führen',
        'Regelmäßige Blutkontrollen',
        'Befindlichkeit dokumentieren'
      ]
    };
  }
  
  const profile = extractMenopauseProfile(lastUserMsg);
  const guidance = generateMenopauseGuidance(profile);
  
  // Save to database
  try {
    await supabase.from('menopause_profiles').upsert({
      user_id: userId,
      profile_data: profile,
      guidance_plan: guidance,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving menopause profile:', error);
  }
  
  return {
    role: 'assistant',
    type: 'card',
    card: 'menopause_navigator',
    payload: {
      profile,
      guidance,
      vita_message: getVitaMenopauseMessage(profile),
      priority_actions: getPriorityActions(profile),
      ts: Date.now()
    },
    meta: { clearTool: true }
  };
}

function getVitaMenopauseMessage(profile: MenopauseProfile): string {
  const messages = {
    perimenopause: "Die Wechseljahre sind kein Ende, sondern der Beginn deiner Königinnen-Phase! 👑 Wir bauen jetzt das Fundament für die nächsten Jahrzehnte. 🌺",
    menopause: "Dein Körper vollbringt gerade eine wunderbare Transformation. Ich begleite dich durch jeden Schritt dieser Reise! ✨",
    postmenopause: "Willkommen in deiner goldenen Reife! Hier beginnt die Zeit, in der du all deine Weisheit und Stärke voll entfalten kannst. 🌟"
  };
  
  return messages[profile.menopause_stage] || messages.perimenopause;
}

function getPriorityActions(profile: MenopauseProfile): string[] {
  const actions = [];
  
  // High priority based on symptoms
  const totalSymptoms = Object.values(profile.symptoms).flat().length;
  if (totalSymptoms >= 5) {
    actions.push('Umfassende medizinische Beratung vereinbaren');
  }
  
  if (profile.current_activity_level === 'sedentary') {
    actions.push('Krafttraining-Programm starten (3x/Woche)');
  }
  
  if (profile.symptoms.physical.includes('bone_loss') || profile.age >= 50) {
    actions.push('DEXA-Scan für Knochendichte veranlassen');
  }
  
  if (profile.symptoms.vasomotor.length >= 2) {
    actions.push('Hitzewallungen-Management-Plan entwickeln');
  }
  
  if (profile.symptoms.sleep.length >= 2) {
    actions.push('Schlafhygiene optimieren und ggf. Schlafmedizin konsultieren');
  }
  
  // Always include
  actions.push('Ernährungsplan mit Fokus auf Knochen- und Herzgesundheit');
  actions.push('Vitamin D-Spiegel checken lassen');
  
  return actions.slice(0, 5); // Limit to top 5 priorities
}