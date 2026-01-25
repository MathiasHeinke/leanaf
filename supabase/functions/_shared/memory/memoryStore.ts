/**
 * Memory Store - Saves and loads insights from database
 * 
 * ARES 3.0 PRO: Enhanced with time-aware context (formatTimeAgo)
 */

import { ExtractedInsight, UserInsight, InsightCategory, ImportanceLevel } from './types.ts';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Extended insight type with update detection
export interface ExtractedInsightWithUpdate extends ExtractedInsight {
  isUpdate?: boolean;
  updatesKeyword?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIME-AWARE MEMORY (ARES 3.0 PRO - "Elefantengedächtnis")
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Formatiert ein Datum als natürlichen deutschen Zeitausdruck
 * z.B. "heute", "gestern", "vor 3 Tagen", "letzte Woche", "vor 2 Monaten"
 */
export function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const past = typeof date === 'string' ? new Date(date) : date;
  
  const diffMs = now.getTime() - past.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffDays === 0) {
    if (diffHours === 0) {
      if (diffMinutes < 5) return 'gerade eben';
      return `vor ${diffMinutes} Minuten`;
    }
    if (diffHours === 1) return 'vor einer Stunde';
    return `vor ${diffHours} Stunden`;
  }
  
  if (diffDays === 1) return 'gestern';
  if (diffDays === 2) return 'vorgestern';
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  
  if (diffWeeks === 1) return 'letzte Woche';
  if (diffWeeks < 4) return `vor ${diffWeeks} Wochen`;
  
  if (diffMonths === 1) return 'letzten Monat';
  if (diffMonths < 12) return `vor ${diffMonths} Monaten`;
  
  const diffYears = Math.floor(diffMonths / 12);
  if (diffYears === 1) return 'letztes Jahr';
  return `vor ${diffYears} Jahren`;
}

/**
 * Erstellt einen formatierten Insight-String mit Zeitkontext
 * z.B. "Nimmt Kreatin (erwähnt vor 2 Wochen)"
 */
export function formatInsightWithTime(insight: UserInsight): string {
  const timeAgo = formatTimeAgo(insight.extractedAt);
  return `${insight.insight} (${timeAgo})`;
}

/**
 * Erstellt eine Memory-Section für den System-Prompt mit Zeitkontext
 * OPTIMIERT: "Critical Memory Injection" nach Gemini's Empfehlung
 */
export function buildTimeAwareMemorySection(insights: UserInsight[]): string {
  if (!insights || insights.length === 0) return '';

  const sections: string[] = [];
  sections.push('## 🧠 MEMORY & KONTEXT (WICHTIG)');
  sections.push('Nutze dieses Wissen aktiv. Frage NICHT nach Dingen, die du bereits weißt!');
  sections.push('');

  // ═══════════════════════════════════════════════════════════════════════════════
  // 1. KRITISCHE FAKTEN - ALLE, mit Kategorie-Label für besseren Kontext
  // ═══════════════════════════════════════════════════════════════════════════════
  const criticalInsights = insights.filter(i => i.importance === 'critical');
  if (criticalInsights.length > 0) {
    sections.push('### 🔥 KRITISCHE FAKTEN (Beachte diese IMMER!)');
    criticalInsights.forEach(insight => {
      const timeAgo = formatTimeAgo(insight.extractedAt);
      // MIT Kategorie-Label für besseren semantischen Kontext
      sections.push(`- [${insight.category.toUpperCase()}] ${insight.insight} (${timeAgo})`);
    });
    sections.push('');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 2. NICHT-KRITISCHE - Sortiert nach Importance → Datum (neueste zuerst)
  // ═══════════════════════════════════════════════════════════════════════════════
  const nonCritical = insights
    .filter(i => i.importance !== 'critical')
    .sort((a, b) => {
      // Erst nach Importance (high vor medium vor low)
      const importanceOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      const impDiff = (importanceOrder[a.importance] ?? 2) - (importanceOrder[b.importance] ?? 2);
      if (impDiff !== 0) return impDiff;
      // Dann nach Datum (neueste zuerst)
      return new Date(b.extractedAt).getTime() - new Date(a.extractedAt).getTime();
    });
  
  const byCategory: Record<string, UserInsight[]> = {};
  for (const insight of nonCritical) {
    if (!byCategory[insight.category]) {
      byCategory[insight.category] = [];
    }
    byCategory[insight.category].push(insight);
  }

  // Kategorien nach Priorität sortieren
  const categoryOrder = ['substanzen', 'gesundheit', 'ziele', 'training', 'ernaehrung', 'koerper', 'schlaf', 'stress', 'gewohnheiten', 'privat'];
  const sortedCategories = Object.keys(byCategory).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
  });

  for (const category of sortedCategories) {
    const categoryInsights = byCategory[category];
    sections.push(`### ${category.toUpperCase()}`);
    
    // ERHÖHT: 8 Insights pro Kategorie (Gemini's Empfehlung für große Kontextfenster)
    categoryInsights.slice(0, 8).forEach(insight => {
      const importance = insight.importance === 'high' ? '❗ ' : '';
      const timeAgo = formatTimeAgo(insight.extractedAt);
      sections.push(`- ${importance}${insight.insight} (${timeAgo})`);
    });
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Save extracted insights to database (basic version)
 */
export async function saveInsights(
  userId: string,
  insights: ExtractedInsight[],
  source: string,
  sourceId: string,
  supabase: SupabaseClient
): Promise<void> {
  if (insights.length === 0) return;

  const rows = insights.map(insight => ({
    user_id: userId,
    category: insight.category,
    subcategory: insight.subcategory || null,
    insight: insight.insight,
    raw_quote: insight.rawQuote || null,
    source: source,
    source_id: sourceId,
    confidence: insight.confidence,
    importance: insight.importance,
    is_active: true,
    extracted_at: new Date().toISOString(),
    last_relevant_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from('user_insights')
    .insert(rows);

  if (error) {
    console.error('[MemoryStore] Error saving insights:', error);
  } else {
    console.log(`[MemoryStore] Saved ${insights.length} insights for user ${userId}`);
  }
}

/**
 * ENHANCED: Save insights with update detection - supersedes old values
 */
export async function saveInsightsWithUpdates(
  userId: string,
  insights: ExtractedInsightWithUpdate[],
  source: string,
  sourceId: string,
  supabase: SupabaseClient
): Promise<{ saved: number; superseded: number }> {
  if (insights.length === 0) return { saved: 0, superseded: 0 };

  let savedCount = 0;
  let supersededCount = 0;

  for (const insight of insights) {
    // Check if this is an update to an existing insight
    if (insight.isUpdate && insight.updatesKeyword) {
      console.log(`[MemoryStore] Detected UPDATE for keyword: "${insight.updatesKeyword}"`);
      
      // Find old insights with this keyword
      const { data: oldInsights } = await supabase
        .from('user_insights')
        .select('id, insight')
        .eq('user_id', userId)
        .eq('is_active', true)
        .ilike('insight', `%${insight.updatesKeyword}%`)
        .limit(5);

      if (oldInsights && oldInsights.length > 0) {
        const oldIds = oldInsights.map(i => i.id);
        
        // Supersede old insights
        const { error: supersedeError } = await supabase
          .from('user_insights')
          .update({ 
            is_active: false
          })
          .in('id', oldIds);

        if (!supersedeError) {
          supersededCount += oldIds.length;
          console.log(`[MemoryStore] Superseded ${oldIds.length} old insights: ${oldInsights.map(i => i.insight.slice(0, 30)).join(', ')}`);
        }
      }
    }

    // Insert the new insight
    const { error } = await supabase
      .from('user_insights')
      .insert({
        user_id: userId,
        category: insight.category,
        subcategory: insight.subcategory || null,
        insight: insight.insight,
        raw_quote: insight.rawQuote || null,
        source: source,
        source_id: sourceId,
        confidence: insight.confidence,
        importance: insight.importance,
        is_active: true,
        extracted_at: new Date().toISOString(),
        last_relevant_at: new Date().toISOString()
      });

    if (!error) {
      savedCount++;
    } else {
      console.error('[MemoryStore] Error saving insight:', error);
    }
  }

  console.log(`[MemoryStore] Saved ${savedCount} insights, superseded ${supersededCount} old values`);
  return { saved: savedCount, superseded: supersededCount };
}

/**
 * Load relevant insights for current conversation context
 */
export async function loadRelevantInsights(
  userId: string,
  currentTopic: string,
  maxInsights: number,
  supabase: SupabaseClient
): Promise<UserInsight[]> {
  // Determine relevant categories based on topic
  const relevantCategories = detectRelevantCategories(currentTopic);

  // First, get high-importance and critical insights
  const { data: criticalInsights, error: error1 } = await supabase
    .from('user_insights')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('importance', ['critical', 'high'])
    .order('extracted_at', { ascending: false })
    .limit(Math.ceil(maxInsights / 2));

  if (error1) {
    console.error('[MemoryStore] Error loading critical insights:', error1);
  }

  // Then get topic-relevant insights
  const { data: topicInsights, error: error2 } = await supabase
    .from('user_insights')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('category', relevantCategories)
    .order('last_relevant_at', { ascending: false })
    .limit(Math.ceil(maxInsights / 2));

  if (error2) {
    console.error('[MemoryStore] Error loading topic insights:', error2);
  }

  // Merge and deduplicate
  const allInsights = [...(criticalInsights || []), ...(topicInsights || [])];
  const uniqueInsights = deduplicateInsights(allInsights);

  // Update last_relevant_at for used insights
  const usedIds = uniqueInsights.slice(0, maxInsights).map(i => i.id);
  if (usedIds.length > 0) {
    await supabase
      .from('user_insights')
      .update({ last_relevant_at: new Date().toISOString() })
      .in('id', usedIds);
  }

  return uniqueInsights.slice(0, maxInsights).map(mapDbRowToInsight);
}

/**
 * Get all active insights for a user (for pattern detection)
 */
export async function getAllUserInsights(
  userId: string,
  supabase: SupabaseClient
): Promise<UserInsight[]> {
  const { data, error } = await supabase
    .from('user_insights')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('extracted_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[MemoryStore] Error loading all insights:', error);
    return [];
  }

  return (data || []).map(mapDbRowToInsight);
}

/**
 * Get existing insight strings for duplicate detection
 */
export async function getExistingInsightStrings(
  userId: string,
  supabase: SupabaseClient
): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_insights')
    .select('insight')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('extracted_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[MemoryStore] Error loading existing insights:', error);
    return [];
  }

  return (data || []).map(row => row.insight);
}

// Helper functions

function detectRelevantCategories(topic: string): InsightCategory[] {
  const topicLower = topic.toLowerCase();
  const categories: InsightCategory[] = [];

  // Keyword-based detection
  if (/training|workout|übung|sport|kraft|cardio|gym/.test(topicLower)) {
    categories.push('training', 'körper');
  }
  if (/essen|ernährung|diät|kalorien|protein|mahlzeit|hunger/.test(topicLower)) {
    categories.push('ernährung', 'gewohnheiten');
  }
  if (/schlaf|müde|energie|erholung|nacht/.test(topicLower)) {
    categories.push('schlaf', 'stress');
  }
  if (/stress|arbeit|zeit|druck|überfordert/.test(topicLower)) {
    categories.push('stress', 'emotionen');
  }
  if (/ziel|abnehmen|zunehmen|muskel|gewicht/.test(topicLower)) {
    categories.push('ziele', 'körper');
  }
  if (/medikament|arzt|krank|schmerz|verletz/.test(topicLower)) {
    categories.push('gesundheit');
  }

  // Default categories if nothing matched
  if (categories.length === 0) {
    categories.push('ziele', 'gewohnheiten', 'körper');
  }

  return [...new Set(categories)];
}

function deduplicateInsights(insights: any[]): any[] {
  const seen = new Set<string>();
  return insights.filter(insight => {
    if (seen.has(insight.id)) return false;
    seen.add(insight.id);
    return true;
  });
}

function mapDbRowToInsight(row: any): UserInsight {
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category,
    subcategory: row.subcategory,
    insight: row.insight,
    rawQuote: row.raw_quote,
    source: row.source,
    sourceId: row.source_id,
    confidence: row.confidence,
    importance: row.importance,
    isActive: row.is_active,
    relatedInsights: row.related_insights,
    extractedAt: new Date(row.extracted_at),
    lastRelevantAt: new Date(row.last_relevant_at),
    expiresAt: row.expires_at ? new Date(row.expires_at) : undefined
  };
}
