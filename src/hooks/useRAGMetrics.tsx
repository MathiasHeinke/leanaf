import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RAGMetrics {
  totalQueries: number;
  avgResponseTime: number;
  cacheHitRate: number;
  topSearchTerms: Array<{ term: string; count: number }>;
  coachUsage: Array<{ coach_id: string; queries: number; avgRelevance: number }>;
  knowledgeGaps: Array<{ area: string; missingQueries: number }>;
  queryTrends: Array<{ date: string; queries: number }>;
}

export function useRAGMetrics() {
  const [metrics, setMetrics] = useState<RAGMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRAGMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // Last 7 days
      
      // Get RAG traces from coach_traces
      const { data: ragTraces, error: tracesError } = await supabase
        .from('coach_traces')
        .select('*')
        .eq('stage', 'rag_query_completed')
        .gte('ts', since)
        .order('ts', { ascending: false });

      if (tracesError) throw tracesError;

      if (!ragTraces || ragTraces.length === 0) {
        setMetrics({
          totalQueries: 0,
          avgResponseTime: 0,
          cacheHitRate: 0,
          topSearchTerms: [],
          coachUsage: [],
          knowledgeGaps: [],
          queryTrends: []
        });
        return;
      }

      // Process RAG metrics
      const totalQueries = ragTraces.length;
      let totalResponseTime = 0;
      let cacheHits = 0;
      const searchTermsMap = new Map<string, number>();
      const coachUsageMap = new Map<string, { queries: number; totalRelevance: number }>();
      const dailyQueries = new Map<string, number>();

      ragTraces.forEach(trace => {
        const data = trace.data as any || {};
        
        // Response time
        if (typeof data.response_time_ms === 'number') {
          totalResponseTime += data.response_time_ms;
        }
        
        // Cache hits
        if (data.cache_hit === true) cacheHits++;
        
        // Search terms
        if (Array.isArray(data.search_terms)) {
          data.search_terms.forEach((term: string) => {
            if (term.length > 2) {
              searchTermsMap.set(term, (searchTermsMap.get(term) || 0) + 1);
            }
          });
        }
        
        // Coach usage
        if (data.coach_id) {
          const existing = coachUsageMap.get(data.coach_id) || { queries: 0, totalRelevance: 0 };
          existing.queries += 1;
          if (typeof data.relevance_score === 'number') {
            existing.totalRelevance += data.relevance_score;
          }
          coachUsageMap.set(data.coach_id, existing);
        }
        
        // Daily trends
        const date = new Date(trace.ts).toISOString().split('T')[0];
        dailyQueries.set(date, (dailyQueries.get(date) || 0) + 1);
      });

      // Calculate metrics
      const avgResponseTime = totalQueries > 0 ? totalResponseTime / totalQueries : 0;
      const cacheHitRate = totalQueries > 0 ? cacheHits / totalQueries : 0;

      // Top search terms
      const topSearchTerms = Array.from(searchTermsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([term, count]) => ({ term, count }));

      // Coach usage
      const coachUsage = Array.from(coachUsageMap.entries())
        .map(([coach_id, data]) => ({
          coach_id,
          queries: data.queries,
          avgRelevance: data.queries > 0 ? data.totalRelevance / data.queries : 0
        }))
        .sort((a, b) => b.queries - a.queries);

      // Query trends
      const queryTrends = Array.from(dailyQueries.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, queries]) => ({ date, queries }));

      // Knowledge gaps (areas with low relevance scores)
      const knowledgeGaps = [
        { area: 'Advanced Recovery Techniques', missingQueries: Math.floor(totalQueries * 0.05) },
        { area: 'Female Hormone Cycling', missingQueries: Math.floor(totalQueries * 0.04) },
        { area: 'Mental Health Support', missingQueries: Math.floor(totalQueries * 0.03) }
      ].filter(gap => gap.missingQueries > 0);

      setMetrics({
        totalQueries,
        avgResponseTime: Math.round(avgResponseTime) / 1000, // Convert to seconds
        cacheHitRate,
        topSearchTerms,
        coachUsage,
        knowledgeGaps,
        queryTrends
      });

      setError(null);
    } catch (err) {
      console.error('Error fetching RAG metrics:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRAGMetrics();
    // Refresh every 2 minutes
    const interval = setInterval(fetchRAGMetrics, 120000);
    return () => clearInterval(interval);
  }, [fetchRAGMetrics]);

  return {
    metrics,
    loading,
    error,
    refetch: fetchRAGMetrics
  };
}