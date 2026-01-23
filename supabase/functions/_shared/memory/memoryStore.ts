/**
 * Memory Store - Saves and loads insights from database
 */

import { ExtractedInsight, UserInsight, InsightCategory } from './types.ts';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Save extracted insights to database
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
