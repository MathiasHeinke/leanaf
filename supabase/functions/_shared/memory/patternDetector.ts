/**
 * Pattern Detector - Detects correlations, contradictions, and trends in user insights
 */

import { ExtractedInsight, UserInsight, DetectedPattern, UserPattern } from './types.ts';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Pattern rules for detection
const CORRELATION_RULES = [
  {
    name: 'kaffee_schlaf',
    categories: ['ernährung', 'schlaf'],
    keywords: [['kaffee', 'koffein'], ['schlaf', 'müde', 'einschlafen']],
    suggestion: 'Kaffeekonsum könnte Schlafqualität beeinflussen - nachfragen ob Kaffee nach 14 Uhr'
  },
  {
    name: 'stress_essen',
    categories: ['stress', 'ernährung'],
    keywords: [['stress', 'druck', 'arbeit'], ['essen', 'hunger', 'naschen']],
    suggestion: 'Möglicher Zusammenhang zwischen Stress und Essverhalten - emotionales Essen ansprechen'
  },
  {
    name: 'schlaf_training',
    categories: ['schlaf', 'training'],
    keywords: [['schlaf', 'müde', 'energie'], ['training', 'sport', 'motivation']],
    suggestion: 'Schlafqualität beeinflusst Trainingsmotivation - Erholungsphasen optimieren'
  },
  {
    name: 'alkohol_ziele',
    categories: ['ernährung', 'ziele'],
    keywords: [['alkohol', 'bier', 'wein'], ['abnehmen', 'definieren', 'gewicht']],
    suggestion: 'Alkoholkonsum könnte Abnehmziele behindern - Kaloriengehalt thematisieren'
  },
  // NEW: Additional correlation rules
  {
    name: 'wasser_energie',
    categories: ['ernährung', 'emotionen'],
    keywords: [['wasser', 'trinken', 'dehydriert'], ['müde', 'energie', 'erschöpft', 'kraftlos']],
    suggestion: 'Dehydration könnte Energielevel beeinflussen - Trinkgewohnheiten prüfen'
  },
  {
    name: 'schlaf_stimmung',
    categories: ['schlaf', 'emotionen'],
    keywords: [['schlaf', 'müde', 'wach'], ['gereizt', 'launisch', 'traurig', 'down']],
    suggestion: 'Schlechter Schlaf beeinflusst Stimmung - Schlafhygiene verbessern'
  },
  {
    name: 'training_stress',
    categories: ['training', 'stress'],
    keywords: [['training', 'sport', 'gym'], ['stress', 'entspannen', 'abschalten']],
    suggestion: 'Training als Stressventil nutzen - gezielte Trainingszeiten vorschlagen'
  },
  {
    name: 'zucker_energie',
    categories: ['ernährung', 'emotionen'],
    keywords: [['zucker', 'süß', 'schoko'], ['müde', 'crash', 'einbruch', 'energie']],
    suggestion: 'Zuckerkonsum verursacht Energie-Crashes - stabilere Energiequellen empfehlen'
  },
  {
    name: 'protein_muskel',
    categories: ['ernährung', 'training'],
    keywords: [['protein', 'eiweiß', 'fleisch'], ['muskel', 'kraft', 'aufbau']],
    suggestion: 'Proteinzufuhr für Muskelaufbau optimieren - Timing und Menge prüfen'
  }
];

const CONTRADICTION_PATTERNS = [
  {
    name: 'ziel_verhalten',
    pattern1: { category: 'ziele', keywords: ['abnehmen', 'definieren', 'gewicht'] },
    pattern2: { category: 'ernährung', keywords: ['fastfood', 'süß', 'naschen', 'chips'] },
    suggestion: 'Widerspruch zwischen Abnehm-Ziel und Ernährungsgewohnheiten - sanft ansprechen'
  },
  {
    name: 'gesund_rauchen',
    pattern1: { category: 'ziele', keywords: ['gesund', 'fit', 'ausdauer'] },
    pattern2: { category: 'gewohnheiten', keywords: ['rauch', 'zigarette', 'vape'] },
    suggestion: 'Rauchen steht im Widerspruch zu Gesundheitszielen - behutsam thematisieren'
  },
  // NEW: Additional contradiction patterns
  {
    name: 'muskel_nur_cardio',
    pattern1: { category: 'ziele', keywords: ['muskel', 'aufbau', 'masse', 'kraft'] },
    pattern2: { category: 'training', keywords: ['nur cardio', 'joggen', 'laufen', 'kein kraft'] },
    suggestion: 'Muskelaufbau-Ziel mit reinem Cardio schwer erreichbar - Krafttraining empfehlen'
  },
  {
    name: 'abnehmen_kein_training',
    pattern1: { category: 'ziele', keywords: ['abnehmen', 'gewicht', 'fett'] },
    pattern2: { category: 'training', keywords: ['kein sport', 'nicht trainieren', 'keine bewegung'] },
    suggestion: 'Abnehmen ohne Bewegung schwieriger - sanfte Bewegungsintegration vorschlagen'
  },
  {
    name: 'gesund_alkohol',
    pattern1: { category: 'ziele', keywords: ['gesund', 'leber', 'entgiften'] },
    pattern2: { category: 'gewohnheiten', keywords: ['alkohol', 'trinken', 'bier', 'wein'] },
    suggestion: 'Regelmäßiger Alkohol vs Gesundheitsziele - Balance besprechen'
  },
  {
    name: 'schlafen_koffein_spät',
    pattern1: { category: 'ziele', keywords: ['besser schlafen', 'schlaf verbessern'] },
    pattern2: { category: 'gewohnheiten', keywords: ['abends kaffee', 'spät koffein', 'energy drink'] },
    suggestion: 'Späte Koffein-Einnahme vs Schlafziel - Koffein-Curfew empfehlen'
  }
];

/**
 * Detect patterns from new and existing insights
 */
export async function detectPatterns(
  userId: string,
  newInsights: ExtractedInsight[],
  existingInsights: UserInsight[],
  supabase: SupabaseClient
): Promise<DetectedPattern[]> {
  const allInsights = [
    ...newInsights.map((i, idx) => ({ ...i, id: `new-${idx}`, isNew: true })),
    ...existingInsights.map(i => ({ ...i, isNew: false }))
  ];

  const detectedPatterns: DetectedPattern[] = [];

  // Check for correlations
  for (const rule of CORRELATION_RULES) {
    const matches = checkCorrelationRule(rule, allInsights);
    if (matches) {
      detectedPatterns.push({
        patternType: 'correlation',
        description: `Möglicher Zusammenhang: ${rule.name.replace('_', ' ↔ ')}`,
        insightIds: matches.insightIds,
        confidence: matches.confidence,
        suggestion: rule.suggestion
      });
    }
  }

  // Check for contradictions
  for (const pattern of CONTRADICTION_PATTERNS) {
    const matches = checkContradiction(pattern, allInsights);
    if (matches) {
      detectedPatterns.push({
        patternType: 'contradiction',
        description: `Möglicher Widerspruch: ${pattern.name.replace('_', ' vs ')}`,
        insightIds: matches.insightIds,
        confidence: matches.confidence,
        suggestion: pattern.suggestion
      });
    }
  }

  // Check for trends (repetition of similar topics)
  const trends = detectTrends(allInsights);
  detectedPatterns.push(...trends);

  // Save new patterns to database
  if (detectedPatterns.length > 0) {
    await saveNewPatterns(userId, detectedPatterns, supabase);
  }

  return detectedPatterns;
}

/**
 * Load unaddressed patterns for prompt integration
 */
export async function loadUnaddressedPatterns(
  userId: string,
  maxPatterns: number,
  supabase: SupabaseClient
): Promise<UserPattern[]> {
  const { data, error } = await supabase
    .from('user_patterns')
    .select('*')
    .eq('user_id', userId)
    .eq('is_addressed', false)
    .order('confidence', { ascending: false })
    .limit(maxPatterns);

  if (error) {
    console.error('[PatternDetector] Error loading patterns:', error);
    return [];
  }

  return (data || []).map(mapDbRowToPattern);
}

/**
 * Mark a pattern as addressed
 */
export async function markPatternAddressed(
  patternId: string,
  supabase: SupabaseClient
): Promise<void> {
  await supabase
    .from('user_patterns')
    .update({ is_addressed: true })
    .eq('id', patternId);
}

// Helper functions

function checkCorrelationRule(
  rule: typeof CORRELATION_RULES[0],
  insights: any[]
): { insightIds: string[], confidence: number } | null {
  const matchingInsights: string[] = [];
  let foundCategories = 0;

  for (const [index, keywordGroup] of rule.keywords.entries()) {
    const categoryInsights = insights.filter(i => 
      i.category === rule.categories[index] ||
      keywordGroup.some(kw => i.insight.toLowerCase().includes(kw))
    );

    if (categoryInsights.length > 0) {
      foundCategories++;
      matchingInsights.push(...categoryInsights.map(i => i.id));
    }
  }

  if (foundCategories >= 2) {
    return {
      insightIds: [...new Set(matchingInsights)],
      confidence: 0.6 + (foundCategories * 0.1)
    };
  }

  return null;
}

function checkContradiction(
  pattern: typeof CONTRADICTION_PATTERNS[0],
  insights: any[]
): { insightIds: string[], confidence: number } | null {
  const pattern1Matches = insights.filter(i =>
    i.category === pattern.pattern1.category &&
    pattern.pattern1.keywords.some(kw => i.insight.toLowerCase().includes(kw))
  );

  const pattern2Matches = insights.filter(i =>
    i.category === pattern.pattern2.category &&
    pattern.pattern2.keywords.some(kw => i.insight.toLowerCase().includes(kw))
  );

  if (pattern1Matches.length > 0 && pattern2Matches.length > 0) {
    return {
      insightIds: [
        ...pattern1Matches.map(i => i.id),
        ...pattern2Matches.map(i => i.id)
      ],
      confidence: 0.7
    };
  }

  return null;
}

function detectTrends(insights: any[]): DetectedPattern[] {
  const trends: DetectedPattern[] = [];
  const categoryCount: Record<string, number> = {};

  // Count category mentions
  for (const insight of insights) {
    categoryCount[insight.category] = (categoryCount[insight.category] || 0) + 1;
  }

  // Detect frequent topics (potential concerns)
  for (const [category, count] of Object.entries(categoryCount)) {
    if (count >= 3) {
      const categoryInsights = insights.filter(i => i.category === category);
      trends.push({
        patternType: 'trend',
        description: `Häufiges Thema: ${category} (${count}x erwähnt)`,
        insightIds: categoryInsights.slice(0, 5).map(i => i.id),
        confidence: Math.min(0.9, 0.5 + (count * 0.1)),
        suggestion: `User beschäftigt sich häufig mit ${category} - möglicherweise ein Fokusthema`
      });
    }
  }

  return trends;
}

async function saveNewPatterns(
  userId: string,
  patterns: DetectedPattern[],
  supabase: SupabaseClient
): Promise<void> {
  // Check for existing similar patterns to avoid duplicates
  const { data: existingPatterns } = await supabase
    .from('user_patterns')
    .select('description')
    .eq('user_id', userId)
    .eq('is_addressed', false);

  const existingDescriptions = new Set((existingPatterns || []).map(p => p.description));

  const newPatterns = patterns.filter(p => !existingDescriptions.has(p.description));

  if (newPatterns.length === 0) return;

  const rows = newPatterns.map(pattern => ({
    user_id: userId,
    pattern_type: pattern.patternType,
    description: pattern.description,
    insight_ids: pattern.insightIds.filter(id => !id.startsWith('new-')),
    confidence: pattern.confidence,
    suggestion: pattern.suggestion,
    is_addressed: false
  }));

  const { error } = await supabase
    .from('user_patterns')
    .insert(rows);

  if (error) {
    console.error('[PatternDetector] Error saving patterns:', error);
  } else {
    console.log(`[PatternDetector] Saved ${rows.length} new patterns`);
  }
}

function mapDbRowToPattern(row: any): UserPattern {
  return {
    id: row.id,
    userId: row.user_id,
    patternType: row.pattern_type,
    description: row.description,
    insightIds: row.insight_ids || [],
    confidence: row.confidence,
    suggestion: row.suggestion,
    isAddressed: row.is_addressed,
    createdAt: new Date(row.created_at)
  };
}
