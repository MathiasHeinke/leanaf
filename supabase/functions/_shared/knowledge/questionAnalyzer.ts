// Question Analyzer for ARES Knowledge System
// Extracts keywords and maps German synonyms to canonical terms

// German synonym mappings to canonical keywords
const SYNONYM_MAPPINGS: Record<string, string[]> = {
  // Peptides
  'semaglutid': ['sema', 'ozempic', 'wegovy', 'rybelsus', 'glp1', 'glp-1', 'abnehmspritze', 'spritze abnehmen'],
  'tirzepatid': ['tirze', 'mounjaro', 'zepbound', 'gip glp'],
  'bpc157': ['bpc', 'bpc-157', 'body protection compound'],
  'tb500': ['tb-500', 'thymosin beta'],
  'ipamorelin': ['ipam', 'ghrp'],
  'cjc1295': ['cjc', 'cjc-1295', 'mod grf'],
  'mk677': ['mk-677', 'ibutamoren', 'nutrobal'],
  
  // Hormones
  'testosteron': ['testo', 'test', 'trt', 'hormonersatz', 'androgen'],
  'oestrogen': ['estrogen', 'östrogen', 'e2', 'estradiol'],
  'progesteron': ['progest', 'gelbkörperhormon'],
  'schilddruese': ['thyroid', 'tsh', 'ft3', 'ft4', 't3', 't4', 'schilddrüse'],
  'cortisol': ['cortison', 'stresshormon', 'hydrocortison'],
  'insulin': ['blutzucker', 'glukose', 'homa', 'nüchtern'],
  'wachstumshormon': ['hgh', 'gh', 'growth hormone', 'somatropin'],
  
  // Supplements
  'kreatin': ['creatine', 'creatin', 'monohydrat'],
  'vitamin_d': ['vitamin d', 'vit d', 'd3', 'cholecalciferol', 'sonnenvitamin'],
  'omega3': ['omega 3', 'omega-3', 'fischöl', 'epa', 'dha', 'fischoel'],
  'magnesium': ['mg', 'magn'],
  'zink': ['zinc', 'zn'],
  'vitamin_b12': ['b12', 'cobalamin', 'methylcobalamin'],
  'eisen': ['iron', 'ferritin', 'eisenmangel'],
  
  // Training
  'krafttraining': ['gewichte', 'fitness', 'gym', 'muskelaufbau', 'hypertrophie', 'bodybuilding'],
  'ausdauer': ['cardio', 'laufen', 'joggen', 'kondition', 'hiit', 'intervall'],
  'regeneration': ['recovery', 'erholung', 'pause', 'deload', 'rest'],
  'progressive_overload': ['progression', 'steigern', 'mehr gewicht', 'stärker'],
  
  // Nutrition
  'protein': ['eiweiß', 'eiweiss', 'proteine', 'aminosäuren', 'bcaa'],
  'kalorien': ['kcal', 'energie', 'kalorienzählen', 'energiebilanz'],
  'makros': ['makronährstoffe', 'kohlenhydrate', 'fette', 'carbs'],
  'fasten': ['intermittent fasting', 'if', 'intervallfasten', '16:8', 'essensfenster'],
  'ketogen': ['keto', 'ketose', 'low carb', 'lowcarb'],
  
  // Health & Longevity
  'schlaf': ['sleep', 'schlafen', 'schlafqualität', 'tiefschlaf', 'rem'],
  'stress': ['burnout', 'überlastung', 'mental', 'psyche'],
  'entzuendung': ['inflammation', 'entzündung', 'crp', 'chronisch'],
  'longevity': ['langlebigkeit', 'anti-aging', 'altern', 'lebensdauer'],
  'autophagie': ['autophagy', 'zellreinigung', 'fasten'],
  
  // Bloodwork
  'blutbild': ['blutwerte', 'laborwerte', 'bluttest', 'blutuntersuchung'],
  'cholesterin': ['ldl', 'hdl', 'triglyceride', 'lipide', 'blutfette'],
  'leberwerte': ['got', 'gpt', 'ggt', 'alt', 'ast', 'leber'],
  'nierenwerte': ['kreatinin', 'gfr', 'niere', 'harnstoff'],
  'haematokrit': ['hämatokrit', 'hkt', 'hct', 'blutverdünnung']
};

// Stopwords to exclude from keyword extraction
const GERMAN_STOPWORDS = new Set([
  'der', 'die', 'das', 'den', 'dem', 'ein', 'eine', 'einer', 'eines',
  'und', 'oder', 'aber', 'wenn', 'weil', 'dass', 'ob', 'wie', 'was',
  'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'mein', 'dein',
  'ist', 'sind', 'war', 'habe', 'hat', 'haben', 'kann', 'kannst',
  'mit', 'für', 'bei', 'von', 'zu', 'auf', 'in', 'an', 'aus',
  'nicht', 'auch', 'noch', 'nur', 'schon', 'sehr', 'mehr', 'weniger',
  'mir', 'mich', 'dir', 'dich', 'ihm', 'ihr', 'uns', 'euch',
  'über', 'unter', 'nach', 'vor', 'durch', 'gegen', 'ohne', 'um',
  'hier', 'dort', 'heute', 'morgen', 'gestern', 'jetzt', 'dann',
  'bitte', 'danke', 'ja', 'nein', 'okay', 'gut', 'schlecht',
  'mal', 'so', 'also', 'denn', 'doch', 'wohl', 'eben', 'halt',
  'vielleicht', 'eigentlich', 'wahrscheinlich', 'etwa', 'ungefähr'
]);

/**
 * Extract relevant keywords from a user message for knowledge lookup
 */
export function extractQueryKeywords(userMessage: string): string[] {
  if (!userMessage || userMessage.trim().length === 0) {
    return [];
  }
  
  const normalizedMessage = userMessage.toLowerCase().trim();
  const keywords: Set<string> = new Set();
  
  // 1. Check for synonym matches first (higher priority)
  for (const [canonical, synonyms] of Object.entries(SYNONYM_MAPPINGS)) {
    // Check if any synonym appears in the message
    for (const synonym of synonyms) {
      if (normalizedMessage.includes(synonym.toLowerCase())) {
        keywords.add(canonical);
        break;
      }
    }
    // Also check if the canonical term itself appears
    if (normalizedMessage.includes(canonical.replace('_', ' '))) {
      keywords.add(canonical);
    }
  }
  
  // 2. Extract individual words (fallback for topics not in synonyms)
  const words = normalizedMessage
    .replace(/[^\wäöüß\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 3 && !GERMAN_STOPWORDS.has(word));
  
  // Add words that might be relevant topics
  for (const word of words) {
    // Skip if we already have a synonym match for this word
    let alreadyMatched = false;
    for (const synonyms of Object.values(SYNONYM_MAPPINGS)) {
      if (synonyms.some(s => s.includes(word) || word.includes(s))) {
        alreadyMatched = true;
        break;
      }
    }
    
    if (!alreadyMatched && word.length >= 4) {
      keywords.add(word);
    }
  }
  
  // 3. Return top keywords (limit to prevent over-querying)
  return Array.from(keywords).slice(0, 8);
}

/**
 * Detect if the message is asking for scientific/knowledge-based information
 */
export function isKnowledgeQuery(userMessage: string): boolean {
  const normalizedMessage = userMessage.toLowerCase();
  
  const knowledgeIndicators = [
    'was ist', 'was sind', 'wie wirkt', 'wie funktioniert',
    'erkläre', 'erklär', 'erzähl', 'sag mir',
    'warum', 'wieso', 'weshalb',
    'studie', 'forschung', 'wissenschaft', 'evidenz',
    'nebenwirkung', 'risiko', 'gefahr', 'sicher',
    'dosierung', 'dosis', 'einnahme', 'protokoll',
    'wirkung', 'effekt', 'nutzen', 'vorteil',
    'unterschied', 'vergleich', 'besser', 'alternative'
  ];
  
  return knowledgeIndicators.some(indicator => normalizedMessage.includes(indicator));
}

/**
 * Get related topics based on a primary topic
 */
export function getRelatedTopicKeywords(primaryKeyword: string): string[] {
  const relatedTopics: Record<string, string[]> = {
    'semaglutid': ['glp1', 'insulin', 'blutzucker', 'appetit'],
    'testosteron': ['östrogen', 'shbg', 'libido', 'muskelaufbau'],
    'kreatin': ['atp', 'kraft', 'muskel', 'wasser'],
    'vitamin_d': ['calcium', 'knochen', 'immunsystem', 'sonne'],
    'schlaf': ['melatonin', 'cortisol', 'regeneration', 'zirkadian'],
    'fasten': ['autophagie', 'insulin', 'ketose', 'stoffwechsel'],
  };
  
  return relatedTopics[primaryKeyword] || [];
}
