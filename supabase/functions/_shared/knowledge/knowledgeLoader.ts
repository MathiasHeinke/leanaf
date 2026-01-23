// Knowledge Loader for ARES Coach
// Phase 5: Load relevant scientific topics from knowledge_taxonomy

import type { TaxonomyTopic, KnowledgeContext, KnowledgeLoaderOptions } from './types.ts';
import { extractQueryKeywords, isKnowledgeQuery } from './questionAnalyzer.ts';

// Evidence level priority for sorting
const EVIDENCE_PRIORITY: Record<string, number> = {
  'stark': 3,
  'moderat': 2,
  'anekdotisch': 1
};

/**
 * Load relevant knowledge topics based on user message
 */
export async function loadRelevantKnowledge(
  userMessage: string,
  supabase: any,
  options: KnowledgeLoaderOptions = {}
): Promise<KnowledgeContext> {
  const {
    maxTopics = 5,
    minEvidence = 'anekdotisch',
    includeSensitive = false
  } = options;
  
  const emptyResult: KnowledgeContext = {
    topics: [],
    totalFound: 0,
    queryKeywords: [],
    hasRelevantKnowledge: false
  };
  
  // Skip if message is too short or not a knowledge query
  if (!userMessage || userMessage.length < 5) {
    return emptyResult;
  }
  
  try {
    // Extract keywords from user message
    const queryKeywords = extractQueryKeywords(userMessage);
    
    if (queryKeywords.length === 0) {
      console.log('[KNOWLEDGE] No keywords extracted from message');
      return emptyResult;
    }
    
    console.log('[KNOWLEDGE] Extracted keywords:', queryKeywords.join(', '));
    
    // Try RPC function first (if available)
    let topics: TaxonomyTopic[] = [];
    
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('search_knowledge_topics', {
          search_query: queryKeywords.join(' '),
          max_results: maxTopics * 2 // Get more for filtering
        });
      
      if (!rpcError && rpcData && rpcData.length > 0) {
        topics = rpcData;
        console.log('[KNOWLEDGE] RPC search returned ' + topics.length + ' topics');
      }
    } catch (rpcErr) {
      console.log('[KNOWLEDGE] RPC not available, falling back to direct query');
    }
    
    // Fallback: Direct table query with keyword matching
    if (topics.length === 0) {
      // Build OR conditions for keyword search
      const keywordConditions = queryKeywords
        .map(kw => `keywords.cs.{${kw}}`)
        .join(',');
      
      const { data: directData, error: directError } = await supabase
        .from('knowledge_taxonomy')
        .select('*')
        .eq('is_active', true)
        .or(keywordConditions)
        .order('evidence_level', { ascending: false })
        .limit(maxTopics * 2);
      
      if (directError) {
        // Try simpler text search as last resort
        const { data: textData } = await supabase
          .from('knowledge_taxonomy')
          .select('*')
          .eq('is_active', true)
          .ilike('title', `%${queryKeywords[0]}%`)
          .limit(maxTopics);
        
        topics = textData || [];
      } else {
        topics = directData || [];
      }
      
      console.log('[KNOWLEDGE] Direct query returned ' + topics.length + ' topics');
    }
    
    // Filter by evidence level
    const minEvidencePriority = EVIDENCE_PRIORITY[minEvidence] || 1;
    topics = topics.filter(t => 
      (EVIDENCE_PRIORITY[t.evidence_level] || 1) >= minEvidencePriority
    );
    
    // Filter sensitive topics if not explicitly included
    if (!includeSensitive) {
      topics = topics.filter(t => !t.is_sensitive);
    }
    
    // Sort by evidence level (highest first)
    topics.sort((a, b) => 
      (EVIDENCE_PRIORITY[b.evidence_level] || 1) - (EVIDENCE_PRIORITY[a.evidence_level] || 1)
    );
    
    // Limit to maxTopics
    const finalTopics = topics.slice(0, maxTopics);
    
    console.log('[KNOWLEDGE] Returning ' + finalTopics.length + ' topics for context');
    
    return {
      topics: finalTopics,
      totalFound: topics.length,
      queryKeywords,
      hasRelevantKnowledge: finalTopics.length > 0
    };
    
  } catch (error) {
    console.error('[KNOWLEDGE] Error loading knowledge:', error);
    return emptyResult;
  }
}

/**
 * Format knowledge context for prompt injection
 */
export function formatKnowledgeForPrompt(context: KnowledgeContext): string {
  if (!context.hasRelevantKnowledge || context.topics.length === 0) {
    return '';
  }
  
  const lines: string[] = [
    '',
    '== RELEVANTES FACHWISSEN ==',
    'Folgende wissenschaftliche Informationen sind fuer die Anfrage relevant:',
    ''
  ];
  
  for (const topic of context.topics) {
    const evidenceLabel = {
      'stark': '[Starke Evidenz]',
      'moderat': '[Moderate Evidenz]',
      'anekdotisch': '[Anekdotisch]'
    }[topic.evidence_level] || '[Evidenz]';
    
    lines.push(evidenceLabel + ' ' + topic.title);
    
    // Add summary or description
    const content = topic.summary || topic.description;
    if (content) {
      // Truncate if too long
      const truncated = content.length > 400 
        ? content.substring(0, 400) + '...'
        : content;
      lines.push('  ' + truncated);
    }
    
    // Add mechanism if available and relevant
    if (topic.mechanism_of_action) {
      const mechanism = topic.mechanism_of_action.length > 200
        ? topic.mechanism_of_action.substring(0, 200) + '...'
        : topic.mechanism_of_action;
      lines.push('  Wirkweise: ' + mechanism);
    }
    
    lines.push('');
  }
  
  return lines.join('\n');
}
