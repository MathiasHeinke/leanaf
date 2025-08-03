import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TelemetryMetrics {
  performance: {
    avgFirstToken: number;
    avgFullStream: number;
    avgContextBuild: number;
    p95FirstToken: number;
    p95FullStream: number;
  };
  cost: {
    totalCost: number;
    avgCostPerRequest: number;
    tokenUsage: number;
  };
  reliability: {
    errorRate: number;
    ragHitRate: number;
    circuitBreakerStatus: 'closed' | 'half-open' | 'open';
    retryRate: number;
  };
  quality: {
    sentimentTrend: number;
    personaScore: number;
    piiDetections: number;
  };
}

export function useEnhancedTelemetry() {
  const [metrics, setMetrics] = useState<TelemetryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: traces, error } = await supabase
        .from('coach_traces')
        .select('*')
        .gte('ts', since);

      if (error) throw error;

      if (!traces || traces.length === 0) {
        setMetrics(null);
        return;
      }

      // Process traces to extract detailed metrics
      const firstTokenTimes: number[] = [];
      const fullStreamTimes: number[] = [];
      const contextBuildTimes: number[] = [];
      let totalCost = 0;
      let totalTokens = 0;
      let errorCount = 0;
      let ragHits = 0;
      let ragQueries = 0;
      let retryCount = 0;
      let sentimentSum = 0;
      let sentimentCount = 0;
      let personaSum = 0;
      let personaCount = 0;
      let piiDetections = 0;
      let circuitBreakerOpen = false;
      let circuitBreakerHalfOpen = false;

      traces.forEach(trace => {
        const data = trace.data as any || {};
        
        if (typeof data.firstToken_ms === 'number') firstTokenTimes.push(data.firstToken_ms);
        if (typeof data.fullStream_ms === 'number') fullStreamTimes.push(data.fullStream_ms);
        if (typeof data.contextBuild_ms === 'number') contextBuildTimes.push(data.contextBuild_ms);
        if (typeof data.cost_usd === 'number') totalCost += data.cost_usd;
        if (typeof data.prompt_tokens === 'number') totalTokens += data.prompt_tokens;
        if (typeof data.completion_tokens === 'number') totalTokens += data.completion_tokens;
        
        if (trace.stage === 'E_error') errorCount++;
        if (typeof data.rag_hit_rate === 'number') {
          ragQueries++;
          if (data.rag_hit_rate > 0) ragHits++;
        }
        if (typeof data.retry_count === 'number') retryCount += data.retry_count;
        if (typeof data.sentiment_score === 'number') {
          sentimentSum += data.sentiment_score;
          sentimentCount++;
        }
        if (typeof data.persona_score === 'number') {
          personaSum += data.persona_score;
          personaCount++;
        }
        if (data.pii_detected === true) piiDetections++;
        if (data.breaker_open === true) circuitBreakerOpen = true;
        if (data.breaker_halfOpen === true) circuitBreakerHalfOpen = true;
      });

      // Calculate percentiles
      const calculateP95 = (values: number[]) => {
        if (values.length === 0) return 0;
        const sorted = values.sort((a, b) => a - b);
        const index = Math.ceil(sorted.length * 0.95) - 1;
        return sorted[index] || 0;
      };

      const uniqueRequests = [...new Set(traces.map(t => t.trace_id))].length;

      setMetrics({
        performance: {
          avgFirstToken: firstTokenTimes.length > 0 ? firstTokenTimes.reduce((a, b) => a + b, 0) / firstTokenTimes.length : 0,
          avgFullStream: fullStreamTimes.length > 0 ? fullStreamTimes.reduce((a, b) => a + b, 0) / fullStreamTimes.length : 0,
          avgContextBuild: contextBuildTimes.length > 0 ? contextBuildTimes.reduce((a, b) => a + b, 0) / contextBuildTimes.length : 0,
          p95FirstToken: calculateP95(firstTokenTimes),
          p95FullStream: calculateP95(fullStreamTimes)
        },
        cost: {
          totalCost,
          avgCostPerRequest: uniqueRequests > 0 ? totalCost / uniqueRequests : 0,
          tokenUsage: totalTokens
        },
        reliability: {
          errorRate: traces.length > 0 ? errorCount / traces.length : 0,
          ragHitRate: ragQueries > 0 ? ragHits / ragQueries : 0,
          circuitBreakerStatus: circuitBreakerOpen ? 'open' : circuitBreakerHalfOpen ? 'half-open' : 'closed',
          retryRate: traces.length > 0 ? retryCount / traces.length : 0
        },
        quality: {
          sentimentTrend: sentimentCount > 0 ? sentimentSum / sentimentCount : 0,
          personaScore: personaCount > 0 ? personaSum / personaCount : 0,
          piiDetections
        }
      });

      setError(null);
    } catch (err) {
      console.error('Error fetching telemetry metrics:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics
  };
}