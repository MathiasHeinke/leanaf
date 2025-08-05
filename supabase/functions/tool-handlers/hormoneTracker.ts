import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface HormoneTracking {
  symptoms: {
    physical: string[];
    emotional: string[];
    cognitive: string[];
  };
  energy_level: number;
  sleep_quality: number;
  stress_level: number;
  cravings: string[];
  skin_condition: string;
  libido_level: number;
  pain_level: number;
  notes: string;
}

export default async function handleHormoneTracker(conv: any[], userId: string) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  
  function extractHormoneData(text: string): HormoneTracking {
    const data: HormoneTracking = {
      symptoms: { physical: [], emotional: [], cognitive: [] },
      energy_level: 5,
      sleep_quality: 5,
      stress_level: 5,
      cravings: [],
      skin_condition: 'normal',
      libido_level: 5,
      pain_level: 0,
      notes: text
    };
    
    // Physical symptoms
    const physicalSymptoms = [
      { keywords: ['kopfschmerz', 'migräne', 'kopf'], symptom: 'headache' },
      { keywords: ['brustspann', 'brustschmerz', 'empfindlich'], symptom: 'breast_tenderness' },
      { keywords: ['blähung', 'aufgebläht', 'bauch'], symptom: 'bloating' },
      { keywords: ['krämpfe', 'unterleibsschmerz', 'periodensch'], symptom: 'cramps' },
      { keywords: ['übelkeit', 'übel'], symptom: 'nausea' },
      { keywords: ['wassereinlagerung', 'geschwollen'], symptom: 'water_retention' },
      { keywords: ['müdigkeit', 'erschöpfung', 'schlapp'], symptom: 'fatigue' },
      { keywords: ['rückenschmerz', 'rücken'], symptom: 'back_pain' },
      { keywords: ['gelenk', 'muskel', 'verspannt'], symptom: 'muscle_tension' }
    ];
    
    for (const { keywords, symptom } of physicalSymptoms) {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        data.symptoms.physical.push(symptom);
      }
    }
    
    // Emotional symptoms
    const emotionalSymptoms = [
      { keywords: ['gereizt', 'reizbar', 'aggressiv'], symptom: 'irritability' },
      { keywords: ['traurig', 'down', 'deprimiert'], symptom: 'sadness' },
      { keywords: ['ängstlich', 'sorgen', 'angst'], symptom: 'anxiety' },
      { keywords: ['emotional', 'weinen', 'tränen'], symptom: 'mood_swings' },
      { keywords: ['gestresst', 'stress', 'überfordert'], symptom: 'stress' },
      { keywords: ['motivationslos', 'antriebslos'], symptom: 'low_motivation' }
    ];
    
    for (const { keywords, symptom } of emotionalSymptoms) {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        data.symptoms.emotional.push(symptom);
      }
    }
    
    // Cognitive symptoms
    const cognitiveSymptoms = [
      { keywords: ['vergesslich', 'vergessen', 'gedächtnis'], symptom: 'forgetfulness' },
      { keywords: ['konzentration', 'focus', 'unkonzentriert'], symptom: 'poor_concentration' },
      { keywords: ['gehirnnebel', 'brain fog', 'benebelt'], symptom: 'brain_fog' },
      { keywords: ['entscheidung', 'unentschlossen'], symptom: 'indecisiveness' }
    ];
    
    for (const { keywords, symptom } of cognitiveSymptoms) {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        data.symptoms.cognitive.push(symptom);
      }
    }
    
    // Energy level (1-10)
    const energyMatch = text.match(/energie(?:level)?\s*(?:ist|bei)?\s*(\d{1,2})/i);
    if (energyMatch) {
      data.energy_level = Math.min(10, Math.max(1, parseInt(energyMatch[1])));
    } else if (text.includes('energielos') || text.includes('müde')) {
      data.energy_level = 3;
    } else if (text.includes('energisch') || text.includes('kraftvoll')) {
      data.energy_level = 8;
    }
    
    // Sleep quality (1-10)
    const sleepMatch = text.match(/schlaf(?:qualität)?\s*(?:ist|bei)?\s*(\d{1,2})/i);
    if (sleepMatch) {
      data.sleep_quality = Math.min(10, Math.max(1, parseInt(sleepMatch[1])));
    } else if (text.includes('schlecht geschlafen') || text.includes('schlaflos')) {
      data.sleep_quality = 3;
    } else if (text.includes('gut geschlafen') || text.includes('erholsam')) {
      data.sleep_quality = 8;
    }
    
    // Stress level (1-10)
    const stressMatch = text.match(/stress(?:level)?\s*(?:ist|bei)?\s*(\d{1,2})/i);
    if (stressMatch) {
      data.stress_level = Math.min(10, Math.max(1, parseInt(stressMatch[1])));
    } else if (text.includes('sehr gestresst') || text.includes('überfordert')) {
      data.stress_level = 8;
    } else if (text.includes('entspannt') || text.includes('ruhig')) {
      data.stress_level = 2;
    }
    
    // Cravings
    const cravingKeywords = [
      { keywords: ['schokolade', 'süß', 'zucker'], craving: 'sweet' },
      { keywords: ['salzig', 'chips', 'salziges'], craving: 'salty' },
      { keywords: ['kohlenhydrat', 'pasta', 'brot'], craving: 'carbs' },
      { keywords: ['fett', 'öl', 'nüsse'], craving: 'fat' },
      { keywords: ['kaffee', 'koffein'], craving: 'caffeine' }
    ];
    
    for (const { keywords, craving } of cravingKeywords) {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        data.cravings.push(craving);
      }
    }
    
    // Skin condition
    if (text.includes('pickel') || text.includes('unrein') || text.includes('akne')) {
      data.skin_condition = 'problematic';
    } else if (text.includes('trocken') || text.includes('schuppig')) {
      data.skin_condition = 'dry';
    } else if (text.includes('fettig') || text.includes('ölig')) {
      data.skin_condition = 'oily';
    } else if (text.includes('glatt') || text.includes('rein')) {
      data.skin_condition = 'clear';
    }
    
    // Pain level
    const painMatch = text.match(/schmerz(?:en)?\s*(?:level|stufe)?\s*(\d{1,2})/i);
    if (painMatch) {
      data.pain_level = Math.min(10, Math.max(0, parseInt(painMatch[1])));
    } else if (text.includes('starke schmerzen')) {
      data.pain_level = 8;
    } else if (text.includes('leichte schmerzen')) {
      data.pain_level = 3;
    }
    
    return data;
  }
  
  function generateHormoneInsights(data: HormoneTracking): string[] {
    const insights: string[] = [];
    
    // Energy insights
    if (data.energy_level <= 3) {
      insights.push('Niedrige Energie könnte auf Eisenmangel oder Schilddrüsenprobleme hinweisen.');
    } else if (data.energy_level >= 8 && data.sleep_quality <= 4) {
      insights.push('Trotz schlechtem Schlaf hohe Energie - möglicherweise erhöhtes Cortisol.');
    }
    
    // Symptom pattern analysis
    const totalSymptoms = data.symptoms.physical.length + data.symptoms.emotional.length + data.symptoms.cognitive.length;
    if (totalSymptoms >= 5) {
      insights.push('Viele Symptome deuten auf hormonelle Dysbalance hin - Laborcheck empfohlen.');
    }
    
    // PMS indicators
    if (data.symptoms.emotional.includes('irritability') && data.symptoms.physical.includes('bloating')) {
      insights.push('Klassische PMS-Anzeichen - Magnesium und B6 könnten helfen.');
    }
    
    // PCOS indicators
    if (data.skin_condition === 'problematic' && data.cravings.includes('sweet')) {
      insights.push('Hautprobleme + Süßhunger könnten auf Insulinresistenz/PCOS hinweisen.');
    }
    
    // Stress-related
    if (data.stress_level >= 7 && data.sleep_quality <= 4) {
      insights.push('Hoher Stress + schlechter Schlaf = Cortisol-Dysbalance wahrscheinlich.');
    }
    
    // Thyroid indicators
    if (data.symptoms.physical.includes('fatigue') && data.symptoms.cognitive.includes('brain_fog')) {
      insights.push('Müdigkeit + Brain Fog können Schilddrüsenunterfunktion anzeigen.');
    }
    
    return insights;
  }
  
  function getSupplementRecommendations(data: HormoneTracking): string[] {
    const recommendations: string[] = [];
    
    if (data.symptoms.emotional.includes('irritability') || data.symptoms.physical.includes('cramps')) {
      recommendations.push('Magnesium (300-400mg täglich)');
    }
    
    if (data.energy_level <= 4 || data.symptoms.physical.includes('fatigue')) {
      recommendations.push('Vitamin B-Komplex + Eisen (nach Laborcheck)');
    }
    
    if (data.stress_level >= 7) {
      recommendations.push('Adaptogene (Ashwagandha, Rhodiola)');
    }
    
    if (data.skin_condition === 'problematic') {
      recommendations.push('Omega-3 + Zink + Vitamin D');
    }
    
    if (data.sleep_quality <= 4) {
      recommendations.push('Melatonin (0.5-3mg) + Glycin');
    }
    
    return recommendations;
  }
  
  const tracking = extractHormoneData(lastUserMsg);
  const insights = generateHormoneInsights(tracking);
  const supplements = getSupplementRecommendations(tracking);
  
  // Save to database
  try {
    await supabase.from('hormone_tracking').insert({
      user_id: userId,
      date: new Date().toISOString().split('T')[0],
      ...tracking,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving hormone tracking:', error);
  }
  
  return {
    role: 'assistant',
    type: 'card',
    card: 'hormone_tracker',
    payload: {
      tracking,
      insights,
      supplement_recommendations: supplements,
      hormone_score: calculateHormoneScore(tracking),
      recommendations: generateActionRecommendations(tracking),
      ts: Date.now()
    },
    meta: { clearTool: true }
  };
}

function calculateHormoneScore(data: HormoneTracking): number {
  const totalSymptoms = data.symptoms.physical.length + data.symptoms.emotional.length + data.symptoms.cognitive.length;
  const energyScore = data.energy_level;
  const sleepScore = data.sleep_quality;
  const stressScore = 10 - data.stress_level; // Invert stress (lower stress = better score)
  const painScore = 10 - data.pain_level; // Invert pain
  
  // Calculate weighted score
  const rawScore = (energyScore * 0.25) + (sleepScore * 0.25) + (stressScore * 0.25) + (painScore * 0.15) + ((10 - Math.min(totalSymptoms, 10)) * 0.1);
  
  return Math.round(Math.max(1, Math.min(10, rawScore)));
}

function generateActionRecommendations(data: HormoneTracking): string[] {
  const recommendations: string[] = [];
  
  if (data.energy_level <= 4) {
    recommendations.push('Laborcheck: Schilddrüse, Vitamin D, B12, Eisen');
  }
  
  if (data.stress_level >= 7) {
    recommendations.push('Stressreduktion: Meditation, Yoga, Atemübungen');
  }
  
  if (data.sleep_quality <= 4) {
    recommendations.push('Schlafhygiene optimieren: Regelmäßige Zeiten, dunkler Raum');
  }
  
  const totalSymptoms = data.symptoms.physical.length + data.symptoms.emotional.length + data.symptoms.cognitive.length;
  if (totalSymptoms >= 5) {
    recommendations.push('Termin bei Gynäkolog*in oder Endokrinolog*in vereinbaren');
  }
  
  if (data.cravings.length >= 3) {
    recommendations.push('Blutzucker stabilisieren: Protein + gesunde Fette zu jeder Mahlzeit');
  }
  
  return recommendations;
}