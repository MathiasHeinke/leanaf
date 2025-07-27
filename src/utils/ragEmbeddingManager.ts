import { supabase } from "@/integrations/supabase/client";

export interface RAGSearchResult {
  knowledge_id: string;
  content_chunk: string;
  similarity?: number;
  combined_score?: number;
  title: string;
  expertise_area: string;
  coach_id: string;
  chunk_index?: number;
}

export interface RAGResponse {
  success: boolean;
  context: Array<{
    content: string;
    title: string;
    expertise_area: string;
    relevance_score: number;
    source_id: string;
    final_relevance?: number;
  }>;
  search_results: RAGSearchResult[];
  metadata: {
    search_method: string;
    results_count: number;
    response_time_ms: number;
    relevance_score: number;
    embedding_tokens: number;
    context_length: number;
  };
}

export class RAGEmbeddingManager {
  
  /**
   * Generiert Embeddings für die gesamte Knowledge Base
   */
  static async generateAllEmbeddings(): Promise<{ success: boolean; processed: number; failed: number; total: number }> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: { regenerate_all: true }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating all embeddings:', error);
      throw error;
    }
  }

  /**
   * Generiert Embeddings für einen spezifischen Knowledge Entry
   */
  static async generateSingleEmbedding(knowledgeId: string): Promise<{ success: boolean; knowledge_id: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: { knowledge_id: knowledgeId }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating single embedding:', error);
      throw error;
    }
  }

  /**
   * Führt eine Enhanced RAG-Suche durch
   */
  static async performRAGSearch(
    query: string,
    coachId: string,
    options: {
      userId?: string;
      searchMethod?: 'semantic' | 'hybrid' | 'keyword';
      maxResults?: number;
      contextWindow?: number;
    } = {}
  ): Promise<RAGResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-coach-rag', {
        body: {
          query,
          coach_id: coachId,
          user_id: options.userId,
          search_method: options.searchMethod || 'hybrid',
          max_results: options.maxResults || 5,
          context_window: options.contextWindow || 2000
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error performing RAG search:', error);
      throw error;
    }
  }

  /**
   * Prüft den Embedding-Status der Knowledge Base
   */
  static async checkEmbeddingStatus(): Promise<{
    total_knowledge_entries: number;
    embedded_entries: number;
    missing_embeddings: string[];
    completion_percentage: number;
  }> {
    try {
      // Hole alle Knowledge Base Einträge
      const { data: knowledgeEntries, error: kbError } = await supabase
        .from('coach_knowledge_base')
        .select('id, title, coach_id');

      if (kbError) throw kbError;

      // Hole alle Embedding Einträge (eindeutige knowledge_ids)
      const { data: embeddingEntries, error: embError } = await supabase
        .from('knowledge_base_embeddings')
        .select('knowledge_id');

      if (embError) throw embError;

      // Erstelle Set von eindeutigen knowledge_ids
      const embeddedIds = new Set(embeddingEntries?.map(e => e.knowledge_id) || []);
      const missingEmbeddings = knowledgeEntries?.filter(kb => !embeddedIds.has(kb.id)) || [];

      return {
        total_knowledge_entries: knowledgeEntries?.length || 0,
        embedded_entries: embeddedIds.size,
        missing_embeddings: missingEmbeddings.map(kb => `${kb.title} (${kb.coach_id})`),
        completion_percentage: knowledgeEntries?.length 
          ? Math.round((embeddedIds.size / knowledgeEntries.length) * 100)
          : 0
      };
    } catch (error) {
      console.error('Error checking embedding status:', error);
      throw error;
    }
  }

  /**
   * Holt Performance-Metriken für einen Coach
   */
  static async getPerformanceMetrics(coachId: string, days: number = 7) {
    try {
      const { data, error } = await supabase
        .from('rag_performance_metrics')
        .select('*')
        .eq('coach_id', coachId)
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const metrics = data || [];
      
      return {
        total_queries: metrics.length,
        avg_response_time: metrics.reduce((sum, m) => sum + m.response_time_ms, 0) / metrics.length || 0,
        avg_relevance: metrics.reduce((sum, m) => sum + (m.relevance_score || 0), 0) / metrics.length || 0,
        search_methods: metrics.reduce((acc, m) => {
          acc[m.search_method] = (acc[m.search_method] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        cache_hit_rate: metrics.filter(m => m.cache_hit).length / metrics.length * 100 || 0
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      throw error;
    }
  }
}

// Utility-Funktionen für RAG-Integration
export const ragUtils = {
  /**
   * Formatiert RAG-Kontext für GPT-Prompts
   */
  formatContextForGPT: (ragResponse: RAGResponse): string => {
    if (!ragResponse.context.length) {
      return "Keine spezifischen Informationen verfügbar.";
    }

    return ragResponse.context
      .map((chunk, index) => 
        `[Quelle ${index + 1}: ${chunk.title} | ${chunk.expertise_area} | Relevanz: ${chunk.final_relevance?.toFixed(2) || chunk.relevance_score.toFixed(2)}]\n${chunk.content}`
      )
      .join('\n\n');
  },

  /**
   * Erstellt Debug-Informationen für RAG-Suchen
   */
  createDebugInfo: (ragResponse: RAGResponse): string => {
    return `
🔍 RAG Search Debug Info:
• Suchmethode: ${ragResponse.metadata.search_method}
• Ergebnisse: ${ragResponse.metadata.results_count}
• Antwortzeit: ${ragResponse.metadata.response_time_ms}ms
• Relevanz-Score: ${ragResponse.metadata.relevance_score}
• Kontext-Länge: ${ragResponse.metadata.context_length} Zeichen
• Embedding-Tokens: ${ragResponse.metadata.embedding_tokens}
    `.trim();
  },

  /**
   * Prüft ob eine RAG-Suche erfolgreich war
   */
  isValidRAGResponse: (ragResponse: RAGResponse): boolean => {
    return ragResponse.success && 
           ragResponse.context.length > 0 && 
           ragResponse.metadata.relevance_score > 0.3;
  }
};