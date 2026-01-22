import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface CycleAssessment {
  cycle_length: number;
  last_period_date: string;
  current_phase: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';
  phase_day: number;
  symptoms: string[];
  energy_level: number;
  mood_assessment: string;
  training_readiness: number;
}

export default async function handleCycleAssessment(conv: any[], userId: string) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  
  // Extract cycle information from conversation
  function extractCycleData(text: string): Partial<CycleAssessment> {
    const data: Partial<CycleAssessment> = {};
    
    // Cycle length extraction
    const cycleLengthMatch = text.match(/(?:zyklus|cycle)\s*(?:ist|dauert|length)?\s*(\d{2,3})\s*(?:tage?|days?)/i);
    if (cycleLengthMatch) {
      data.cycle_length = parseInt(cycleLengthMatch[1]);
    } else {
      data.cycle_length = 28; // default
    }
    
    // Last period date
    const datePatterns = [
      /letzte\s+(?:periode|blutung|menstruation)\s+(?:war\s+)?(?:am\s+)?(\d{1,2})\.(\d{1,2})\.?(?:(\d{4})|(\d{2}))?/i,
      /periode\s+(?:war\s+)?vor\s+(\d{1,2})\s+tagen?/i
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[1] && match[2]) {
          // Date format: DD.MM.YYYY or DD.MM.YY
          const day = parseInt(match[1]);
          const month = parseInt(match[2]);
          const year = match[3] ? parseInt(match[3]) : (match[4] ? 2000 + parseInt(match[4]) : new Date().getFullYear());
          data.last_period_date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        } else if (match[1]) {
          // Days ago format
          const daysAgo = parseInt(match[1]);
          const date = new Date();
          date.setDate(date.getDate() - daysAgo);
          data.last_period_date = date.toISOString().split('T')[0];
        }
        break;
      }
    }
    
    // Energy level (1-10)
    const energyMatch = text.match(/energie(?:level)?\s*(?:ist|bei)?\s*(\d{1,2})/i) ||
                       text.match(/(?:fühle|bin)\s+(?:sehr\s+)?(müde|schwach|energielos|kraftlos|erschöpft|schlapp)/i) ||
                       text.match(/(?:fühle|bin)\s+(?:sehr\s+)?(energisch|kraftvoll|stark|fit|vital|power)/i);
    
    if (energyMatch) {
      if (energyMatch[1] && !isNaN(parseInt(energyMatch[1]))) {
        data.energy_level = Math.min(10, Math.max(1, parseInt(energyMatch[1])));
      } else {
        const energyWords = energyMatch[1]?.toLowerCase();
        if (['müde', 'schwach', 'energielos', 'kraftlos', 'erschöpft', 'schlapp'].includes(energyWords)) {
          data.energy_level = 3;
        } else if (['energisch', 'kraftvoll', 'stark', 'fit', 'vital', 'power'].includes(energyWords)) {
          data.energy_level = 8;
        }
      }
    } else {
      data.energy_level = 5; // default neutral
    }
    
    // Symptoms extraction
    const symptoms: string[] = [];
    const symptomKeywords = [
      { keywords: ['kopfschmerz', 'migräne'], symptom: 'headache' },
      { keywords: ['bauchschmerz', 'krämpfe', 'unterleib'], symptom: 'cramps' },
      { keywords: ['stimmung', 'gereizt', 'emotional', 'weinen'], symptom: 'mood_swings' },
      { keywords: ['brustspann', 'brust schmerz', 'empfindlich'], symptom: 'breast_tenderness' },
      { keywords: ['blähung', 'aufgebläht', 'wasser'], symptom: 'bloating' },
      { keywords: ['heißhunger', 'appetit', 'schokolade'], symptom: 'cravings' },
      { keywords: ['schlaflos', 'schlecht geschlafen'], symptom: 'sleep_issues' },
      { keywords: ['pickel', 'haut', 'unrein'], symptom: 'skin_changes' }
    ];
    
    for (const { keywords, symptom } of symptomKeywords) {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        symptoms.push(symptom);
      }
    }
    data.symptoms = symptoms;
    
    // Mood assessment
    const moodKeywords = {
      'positive': ['gut', 'super', 'toll', 'fröhlich', 'motiviert', 'ausgeglichen'],
      'negative': ['schlecht', 'gereizt', 'traurig', 'gestresst', 'müde', 'emotional'],
      'neutral': ['okay', 'normal', 'geht']
    };
    
    for (const [mood, keywords] of Object.entries(moodKeywords)) {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        data.mood_assessment = mood;
        break;
      }
    }
    if (!data.mood_assessment) data.mood_assessment = 'neutral';
    
    return data;
  }
  
  // Calculate current cycle phase
  function calculateCyclePhase(lastPeriodDate: string, cycleLength: number): { phase: string; day: number; training_readiness: number } {
    const lastPeriod = new Date(lastPeriodDate);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24));
    const cycleDay = (daysDiff % cycleLength) + 1;
    
    let phase: string;
    let training_readiness: number;
    
    if (cycleDay <= 5) {
      phase = 'menstrual';
      training_readiness = 4; // Lower intensity recommended
    } else if (cycleDay <= 13) {
      phase = 'follicular';
      training_readiness = 8; // High training readiness
    } else if (cycleDay <= 16) {
      phase = 'ovulatory';
      training_readiness = 9; // Peak training readiness
    } else {
      phase = 'luteal';
      training_readiness = 6; // Moderate, focus on recovery
    }
    
    return { phase, day: cycleDay, training_readiness };
  }
  
  const extractedData = extractCycleData(lastUserMsg);
  
  // Calculate phase if we have last period date
  let phaseInfo = { phase: 'unknown', day: 0, training_readiness: 5 };
  if (extractedData.last_period_date && extractedData.cycle_length) {
    phaseInfo = calculateCyclePhase(extractedData.last_period_date, extractedData.cycle_length);
  }
  
  const assessment: CycleAssessment = {
    cycle_length: extractedData.cycle_length || 28,
    last_period_date: extractedData.last_period_date || '',
    current_phase: phaseInfo.phase as any,
    phase_day: phaseInfo.day,
    symptoms: extractedData.symptoms || [],
    energy_level: extractedData.energy_level || 5,
    mood_assessment: extractedData.mood_assessment || 'neutral',
    training_readiness: phaseInfo.training_readiness
  };
  
  // Save assessment to database
  try {
    await supabase.from('cycle_assessments').upsert({
      user_id: userId,
      date: new Date().toISOString().split('T')[0],
      ...assessment,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving cycle assessment:', error);
  }
  
  return {
    role: 'assistant',
    type: 'card',
    card: 'cycle_assessment',
    payload: {
      ...assessment,
      phase_description: getPhaseDescription(phaseInfo.phase),
      training_recommendations: getTrainingRecommendations(phaseInfo.phase, assessment.energy_level),
      ts: Date.now()
    },
    meta: { clearTool: true }
  };
}

type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' | 'unknown';

function getPhaseDescription(phase: string): string {
  const descriptions: Record<CyclePhase, string> = {
    'menstrual': 'Menstruationsphase: Dein Körper regeneriert sich. Zeit für sanfte Bewegung und Selbstfürsorge.',
    'follicular': 'Follikelphase: Deine Energie steigt! Perfekt für Krafttraining und neue Herausforderungen.',
    'ovulatory': 'Ovulationsphase: Du bist auf dem Höhepunkt deiner Kraft! Nutze diese Zeit für intensive Workouts.',
    'luteal': 'Lutealphase: Dein Körper bereitet sich vor. Fokussiere dich auf Stabilität und Regeneration.',
    'unknown': 'Um deine Zyklusphase zu bestimmen, teile mir dein letztes Periodenstart-Datum mit.'
  };
  return descriptions[phase as CyclePhase] || descriptions['unknown'];
}

function getTrainingRecommendations(phase: string, energyLevel: number): string[] {
  const baseRecommendations: Record<CyclePhase, string[]> = {
    'menstrual': [
      'Sanftes Yoga oder Pilates',
      'Leichte Spaziergänge',
      'Atemübungen und Meditation',
      'Dehnung und Mobilität'
    ],
    'follicular': [
      'Krafttraining mit progressiver Steigerung',
      'HIIT-Workouts',
      'Neue Übungen ausprobieren',
      'Schwere Grundübungen'
    ],
    'ovulatory': [
      'Maximalkrafttraining',
      'Explosive Bewegungen',
      'Wettkampf-ähnliche Intensität',
      'Persönliche Bestleistungen anstreben'
    ],
    'luteal': [
      'Kraftausdauer-Training',
      'Steady-State Cardio',
      'Verletzungsprävention',
      'Regenerative Aktivitäten'
    ],
    'unknown': [
      'Höre auf deinen Körper',
      'Moderates Training',
      'Tracking für bessere Einschätzung'
    ]
  };
  
  let recommendations = baseRecommendations[phase as CyclePhase] || baseRecommendations['unknown'];
  
  // Adjust based on energy level
  if (energyLevel <= 3) {
    recommendations = recommendations.filter((rec: string) => 
      rec.includes('sanft') || rec.includes('leicht') || rec.includes('regenerativ')
    );
    recommendations.push('Extra Ruhetag einlegen');
  } else if (energyLevel >= 8) {
    recommendations.push('Intensität kann gesteigert werden');
  }
  
  return recommendations;
}