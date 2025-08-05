import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Database {
  public: {
    Tables: {
      rag_performance_metrics: {
        Insert: {
          user_id?: string;
          coach_id: string;
          query_text: string;
          search_method: string;
          response_time_ms: number;
          relevance_score?: number;
          user_rating?: number;
          cache_hit?: boolean;
          embedding_tokens?: number;
        };
      };
    };
  };
}

interface RAGRequest {
  query: string;
  coach_id: string;
  user_id?: string;
  search_method?: 'semantic' | 'hybrid' | 'keyword';
  max_results?: number;
  context_window?: number;
}

interface SearchResult {
  knowledge_id: string;
  content_chunk: string;
  similarity?: number;
  combined_score?: number;
  title: string;
  expertise_area: string;
  coach_id: string;
  chunk_index?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const request: RAGRequest = await req.json();
    const {
      query,
      coach_id,
      user_id,
      search_method = 'hybrid',
      max_results = 5,
      context_window = 2000
    } = request;

    console.log(`Enhanced RAG request: ${search_method} search for "${query}" (Coach: ${coach_id})`);

    // Schritt 1: Query-Embedding generieren (falls benötigt)
    let queryEmbedding: number[] | null = null;
    let embeddingTokens = 0;

    if (search_method === 'semantic' || search_method === 'hybrid') {
      queryEmbedding = await generateQueryEmbedding(openAIApiKey, query);
      embeddingTokens = estimateTokens(query);
    }

    // Schritt 2: Relevante Kontexte suchen
    const searchResults = await performSearch(
      supabaseClient,
      query,
      queryEmbedding,
      coach_id,
      search_method,
      max_results
    );

    // Schritt 3: Kontexte für GPT vorbereiten
    const contextChunks = buildContext(searchResults, context_window);

    // Schritt 4: Performance Metrics tracken
    const responseTime = Date.now() - startTime;
    const relevance_score = calculateRelevanceScore(searchResults);

    // Enhanced RAG telemetry in coach_traces table
    try {
      const telemetryData = {
        query_text: query.substring(0, 100), // First 100 chars for privacy
        search_method,
        response_time_ms: responseTime,
        relevance_score,
        cache_hit: false, // TODO: Implement cache checking
        embedding_tokens: embeddingTokens,
        results_count: searchResults.length,
        context_length: contextChunks.reduce((sum, chunk) => sum + chunk.content.length, 0),
        coach_id,
        search_terms: query.toLowerCase().split(' ').filter(w => w.length > 2).slice(0, 5) // Top 5 search terms
      };

      // Save to coach_traces for real-time dashboard
      await supabaseClient
        .from('coach_traces')
        .insert({
          trace_id: `rag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ts: new Date().toISOString(),
          stage: 'rag_query_completed',
          data: telemetryData
        });

      // Also save to legacy rag_performance_metrics table
      await savePerformanceMetrics(supabaseClient, {
        user_id,
        coach_id,
        query_text: query,
        search_method,
        response_time_ms: responseTime,
        relevance_score,
        cache_hit: false,
        embedding_tokens: embeddingTokens
      });
    } catch (metricsError) {
      console.error('Failed to save RAG telemetry:', metricsError);
    }

    // Schritt 5: Intelligentes Context Ranking
    const rankedContext = rankContextByRelevance(contextChunks, query);

    return new Response(
      JSON.stringify({
        success: true,
        context: rankedContext,
        search_results: searchResults,
        metadata: {
          search_method,
          results_count: searchResults.length,
          response_time_ms: responseTime,
          relevance_score,
          embedding_tokens: embeddingTokens,
          context_length: rankedContext.reduce((sum, chunk) => sum + chunk.content.length, 0)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enhanced-coach-rag function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function generateQueryEmbedding(openAIApiKey: string, query: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: query,
      encoding_format: 'float'
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI embedding error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function performSearch(
  supabaseClient: any,
  query: string,
  queryEmbedding: number[] | null,
  coachId: string,
  searchMethod: string,
  maxResults: number
): Promise<SearchResult[]> {
  
  switch (searchMethod) {
    case 'semantic':
      if (!queryEmbedding) throw new Error('Query embedding required for semantic search');
      return await performSemanticSearch(supabaseClient, queryEmbedding, coachId, maxResults);
    
    case 'hybrid':
      if (!queryEmbedding) throw new Error('Query embedding required for hybrid search');
      return await performHybridSearch(supabaseClient, query, queryEmbedding, coachId, maxResults);
    
    case 'keyword':
    default:
      return await performKeywordSearch(supabaseClient, query, coachId, maxResults);
  }
}

async function performSemanticSearch(
  supabaseClient: any,
  queryEmbedding: number[],
  coachId: string,
  maxResults: number
): Promise<SearchResult[]> {
  
  // Lucy can access all coaches' knowledge, others are restricted to their own
  const coachFilter = coachId === 'lucy' ? null : coachId;
  
  const { data, error } = await supabaseClient.rpc('search_knowledge_semantic', {
    query_embedding: queryEmbedding,
    coach_filter: coachFilter,
    similarity_threshold: 0.6,
    match_count: maxResults
  });

  if (error) throw error;
  return data || [];
}

async function performHybridSearch(
  supabaseClient: any,
  queryText: string,
  queryEmbedding: number[],
  coachId: string,
  maxResults: number
): Promise<SearchResult[]> {
  
  // Lucy can access all coaches' knowledge, others are restricted to their own
  const coachFilter = coachId === 'lucy' ? null : coachId;
  
  const { data, error } = await supabaseClient.rpc('search_knowledge_hybrid', {
    query_text: queryText,
    query_embedding: queryEmbedding,
    coach_filter: coachFilter,
    semantic_weight: 0.7,
    text_weight: 0.3,
    match_count: maxResults
  });

  if (error) throw error;
  return data || [];
}

async function performKeywordSearch(
  supabaseClient: any,
  query: string,
  coachId: string,
  maxResults: number
): Promise<SearchResult[]> {
  
  // Lucy can access all coaches' knowledge, others are restricted to their own
  let queryBuilder = supabaseClient
    .from('coach_knowledge_base')
    .select(`
      id,
      title,
      content,
      expertise_area,
      coach_id
    `);

  // Only filter by coach if not Lucy
  if (coachId !== 'lucy') {
    queryBuilder = queryBuilder.eq('coach_id', coachId);
  }

  const { data, error } = await queryBuilder
    .textSearch('content', query)
    .limit(maxResults);

  if (error) throw error;
  
  return data?.map(item => ({
    knowledge_id: item.id,
    content_chunk: item.content.substring(0, 500),
    title: item.title,
    expertise_area: item.expertise_area,
    coach_id: item.coach_id,
    similarity: 0.5 // Default für Keyword-Suche
  })) || [];
}

function buildContext(searchResults: SearchResult[], maxLength: number): any[] {
  const chunks = [];
  let currentLength = 0;

  for (const result of searchResults) {
    const chunkLength = result.content_chunk.length;
    
    if (currentLength + chunkLength <= maxLength) {
      chunks.push({
        content: result.content_chunk,
        title: result.title,
        expertise_area: result.expertise_area,
        relevance_score: result.similarity || result.combined_score || 0,
        source_id: result.knowledge_id
      });
      currentLength += chunkLength;
    } else {
      break;
    }
  }

  return chunks;
}

function rankContextByRelevance(chunks: any[], query: string): any[] {
  // Erweiterte Relevanz-Bewertung basierend auf:
  // 1. Similarity Score
  // 2. Query-Keyword-Matches
  // 3. Expertise Area Relevanz
  
  return chunks
    .map(chunk => {
      let relevanceBoost = 0;
      
      // Keyword-Matches in Content
      const queryKeywords = query.toLowerCase().split(' ').filter(w => w.length > 2);
      const contentLower = chunk.content.toLowerCase();
      const titleLower = chunk.title.toLowerCase();
      
      queryKeywords.forEach(keyword => {
        if (contentLower.includes(keyword)) relevanceBoost += 0.1;
        if (titleLower.includes(keyword)) relevanceBoost += 0.2;
      });
      
      // Expertise Area Boost
      const expertiseKeywords = ['training', 'ernährung', 'muskelaufbau', 'kraft', 'ausdauer'];
      if (expertiseKeywords.some(keyword => chunk.expertise_area.toLowerCase().includes(keyword))) {
        relevanceBoost += 0.05;
      }
      
      chunk.final_relevance = (chunk.relevance_score || 0) + relevanceBoost;
      return chunk;
    })
    .sort((a, b) => b.final_relevance - a.final_relevance);
}

function calculateRelevanceScore(results: SearchResult[]): number {
  if (results.length === 0) return 0;
  
  const scores = results.map(r => r.similarity || r.combined_score || 0);
  const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return Math.round(avgScore * 100) / 100;
}

function estimateTokens(text: string): number {
  // Grobe Schätzung: ~4 Zeichen pro Token
  return Math.ceil(text.length / 4);
}

async function savePerformanceMetrics(supabaseClient: any, metrics: any) {
  try {
    const { error } = await supabaseClient
      .from('rag_performance_metrics')
      .insert(metrics);
    
    if (error) {
      console.error('Failed to save performance metrics:', error);
    }
  } catch (error) {
    console.error('Error saving performance metrics:', error);
  }
}