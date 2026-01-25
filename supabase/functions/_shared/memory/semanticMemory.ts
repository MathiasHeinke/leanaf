/**
 * Semantic Memory - pgvector-powered insight search
 * 
 * ARES 3.0 PRO: Semantic search using OpenAI embeddings + pgvector
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SemanticSearchResult, ExtractedInsight } from './types.ts';

// ═══════════════════════════════════════════════════════════════════════════════
// EMBEDDING GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate embedding for text using OpenAI text-embedding-3-small
 * Cost: ~$0.00002 per 1000 tokens
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    console.error('[SemanticMemory] No OpenAI API key for embeddings');
    return null;
  }

  // Truncate very long text to avoid token limits
  const truncatedText = text.slice(0, 8000);

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: truncatedText,
        dimensions: 1536
      })
    });

    if (!response.ok) {
      console.error('[SemanticMemory] Embedding API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (error) {
    console.error('[SemanticMemory] Embedding generation failed:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEMANTIC SEARCH
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Search user insights semantically using vector similarity
 */
export async function searchInsightsSemantic(
  userId: string,
  query: string,
  supabase: SupabaseClient,
  options: {
    limit?: number;
    similarityThreshold?: number;
  } = {}
): Promise<SemanticSearchResult[]> {
  const { limit = 10, similarityThreshold = 0.7 } = options;

  console.log('[SemanticMemory] Searching insights for query:', query.slice(0, 50));

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);
  if (!queryEmbedding) {
    console.warn('[SemanticMemory] Failed to generate query embedding, falling back to text search');
    return [];
  }

  try {
    // Call the semantic search RPC
    const { data, error } = await supabase.rpc('search_user_insights_semantic', {
      p_user_id: userId,
      p_query_embedding: queryEmbedding,
      p_limit: limit,
      p_similarity_threshold: similarityThreshold
    });

    if (error) {
      console.error('[SemanticMemory] Semantic search RPC error:', error);
      return [];
    }

    console.log('[SemanticMemory] Found', data?.length || 0, 'semantic matches');

    return (data || []).map((row: any) => ({
      id: row.id,
      insight: row.insight,
      category: row.category,
      subcategory: row.subcategory,
      importance: row.importance,
      similarity: row.similarity,
      extractedAt: new Date(row.extracted_at),
      rawQuote: row.raw_quote
    }));
  } catch (error) {
    console.error('[SemanticMemory] Search failed:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEDUPLICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a similar insight already exists (for deduplication)
 * Uses 0.92 similarity threshold by default
 */
export async function findSimilarInsights(
  userId: string,
  insight: ExtractedInsight,
  embedding: number[],
  supabase: SupabaseClient
): Promise<{ id: string; insight: string; similarity: number }[]> {
  try {
    const { data, error } = await supabase.rpc('find_similar_insights', {
      p_user_id: userId,
      p_new_embedding: embedding,
      p_category: insight.category,
      p_threshold: 0.92  // High threshold for deduplication
    });

    if (error) {
      console.error('[SemanticMemory] Find similar error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[SemanticMemory] Find similar failed:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INSIGHT LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mark insights as referenced (updates usage tracking)
 */
export async function markInsightsReferenced(
  insightIds: string[],
  supabase: SupabaseClient
): Promise<void> {
  if (insightIds.length === 0) return;

  try {
    const { error } = await supabase.rpc('update_insight_reference', {
      p_insight_ids: insightIds
    });

    if (error) {
      console.error('[SemanticMemory] Update reference error:', error);
    }
  } catch (error) {
    console.error('[SemanticMemory] Mark referenced failed:', error);
  }
}

/**
 * Supersede old insight with new one (for fact updates)
 */
export async function supersedeInsight(
  oldInsightId: string,
  newInsightId: string,
  supabase: SupabaseClient
): Promise<void> {
  try {
    const { error } = await supabase.rpc('supersede_insight', {
      p_old_insight_id: oldInsightId,
      p_new_insight_id: newInsightId
    });

    if (error) {
      console.error('[SemanticMemory] Supersede error:', error);
    } else {
      console.log('[SemanticMemory] Superseded insight:', oldInsightId, '→', newInsightId);
    }
  } catch (error) {
    console.error('[SemanticMemory] Supersede failed:', error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAVE INSIGHT WITH EMBEDDING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Save insight with its embedding to the database
 * Includes deduplication check
 */
export async function saveInsightWithEmbedding(
  userId: string,
  insight: ExtractedInsight,
  source: string,
  sourceId: string,
  supabase: SupabaseClient
): Promise<{ saved: boolean; duplicateOf?: string }> {
  // Generate embedding
  const embedding = await generateEmbedding(insight.insight);
  
  if (!embedding) {
    console.warn('[SemanticMemory] Could not generate embedding, saving without it');
    // Fall back to saving without embedding
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
        is_current: true,
        reference_count: 1,
        extracted_at: new Date().toISOString(),
        last_relevant_at: new Date().toISOString()
      });

    if (error) {
      console.error('[SemanticMemory] Save without embedding error:', error);
      return { saved: false };
    }
    return { saved: true };
  }

  // Check for duplicates
  const similar = await findSimilarInsights(userId, insight, embedding, supabase);
  
  if (similar.length > 0) {
    console.log('[SemanticMemory] Found duplicate insight:', similar[0].insight.slice(0, 50));
    
    // Update reference count of existing insight instead
    await markInsightsReferenced([similar[0].id], supabase);
    
    return { saved: false, duplicateOf: similar[0].id };
  }

  // Save with embedding
  const { data, error } = await supabase
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
      embedding: embedding,
      is_active: true,
      is_current: true,
      reference_count: 1,
      extracted_at: new Date().toISOString(),
      last_relevant_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (error) {
    console.error('[SemanticMemory] Save with embedding error:', error);
    return { saved: false };
  }

  console.log('[SemanticMemory] Saved insight with embedding:', insight.insight.slice(0, 50));
  return { saved: true };
}
