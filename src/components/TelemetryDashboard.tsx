import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface TelemetryStats {
  totalRequests: number;
  avgFirstToken: number;
  avgFullStream: number;
  totalCost: number;
  ragHitRate: number;
  errorRate: number;
  circuitBreakerStats: {
    open: number;
    halfOpen: number;
    closed: number;
  };
  sentimentTrend: number;
  piiDetections: number;
}

export default function TelemetryDashboard() {
  const [stats, setStats] = useState<TelemetryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTelemetryStats();
    const interval = setInterval(fetchTelemetryStats, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchTelemetryStats = async () => {
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Last 24h
      
      const { data: traces, error } = await supabase
        .from('coach_traces')
        .select('*')
        .gte('ts', since)
        .order('ts', { ascending: false });

      if (error) throw error;

      if (traces && traces.length > 0) {
        const uniqueTraces = [...new Set(traces.map(t => t.trace_id))];
        
        let totalFirstToken = 0;
        let totalFullStream = 0;
        let totalCost = 0;
        let ragHits = 0;
        let errors = 0;
        let circuitBreaker = { open: 0, halfOpen: 0, closed: 0 };
        let sentimentSum = 0;
        let sentimentCount = 0;
        let piiCount = 0;

        traces.forEach(trace => {
          const data = trace.data as any || {};
          
          if (typeof data.firstToken_ms === 'number') totalFirstToken += data.firstToken_ms;
          if (typeof data.fullStream_ms === 'number') totalFullStream += data.fullStream_ms;
          if (typeof data.cost_usd === 'number') totalCost += data.cost_usd;
          if (typeof data.rag_score === 'number' && data.rag_score > 0.8) ragHits++;
          if (typeof data.http_status === 'number' && data.http_status >= 400) errors++;
          if (data.breaker_open === true) circuitBreaker.open++;
          if (data.breaker_halfOpen === true) circuitBreaker.halfOpen++;
          if (!data.breaker_open && !data.breaker_halfOpen) circuitBreaker.closed++;
          if (typeof data.sentiment_score === 'number') {
            sentimentSum += data.sentiment_score;
            sentimentCount++;
          }
          if (data.pii_detected === true) piiCount++;
        });

        setStats({
          totalRequests: uniqueTraces.length,
          avgFirstToken: totalFirstToken / traces.length || 0,
          avgFullStream: totalFullStream / traces.length || 0,
          totalCost: totalCost,
          ragHitRate: (ragHits / traces.length) * 100 || 0,
          errorRate: (errors / traces.length) * 100 || 0,
          circuitBreakerStats: circuitBreaker,
          sentimentTrend: sentimentCount > 0 ? sentimentSum / sentimentCount : 0,
          piiDetections: piiCount
        });
      }
    } catch (error) {
      console.error('Failed to fetch telemetry stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="pb-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </CardHeader>
          <CardContent>
            <div className="h-8 bg-muted rounded w-1/2"></div>
          </CardContent>
        </Card>
      ))}
    </div>;
  }

  if (!stats) {
    return <div className="text-center text-muted-foreground py-8">No telemetry data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Real-time Cost Ticker */}
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="border-primary shadow-lg">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Today's Cost</div>
            <div className="text-lg font-bold text-primary">
              ${stats.totalCost.toFixed(4)}
            </div>
            <div className="text-xs text-muted-foreground">
              {stats.totalRequests} requests
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Circuit Breaker Status */}
      <div className="flex justify-center">
        <Card className="border-none shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Circuit Breaker:</span>
              <div className="flex gap-2">
                <div className={`w-3 h-3 rounded-full ${stats.circuitBreakerStats.open > 0 ? 'bg-destructive' : 'bg-muted'}`}></div>
                <span className="text-xs">Open ({stats.circuitBreakerStats.open})</span>
              </div>
              <div className="flex gap-2">
                <div className={`w-3 h-3 rounded-full ${stats.circuitBreakerStats.halfOpen > 0 ? 'bg-warning' : 'bg-muted'}`}></div>
                <span className="text-xs">Half-Open ({stats.circuitBreakerStats.halfOpen})</span>
              </div>
              <div className="flex gap-2">
                <div className={`w-3 h-3 rounded-full ${stats.circuitBreakerStats.closed > 0 ? 'bg-success' : 'bg-muted'}`}></div>
                <span className="text-xs">Closed ({stats.circuitBreakerStats.closed})</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg First Token</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgFirstToken.toFixed(0)}ms
            </div>
            <Badge variant={stats.avgFirstToken < 2000 ? "default" : stats.avgFirstToken < 3000 ? "secondary" : "destructive"}>
              {stats.avgFirstToken < 2000 ? '🟢' : stats.avgFirstToken < 3000 ? '🟡' : '🔴'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Full Stream</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgFullStream.toFixed(0)}ms
            </div>
            <Badge variant={stats.avgFullStream < 4000 ? "default" : stats.avgFullStream < 6000 ? "secondary" : "destructive"}>
              {stats.avgFullStream < 4000 ? '🟢' : stats.avgFullStream < 6000 ? '🟡' : '🔴'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>RAG Hit Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.ragHitRate.toFixed(1)}%
            </div>
            <Progress value={stats.ragHitRate} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Error Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.errorRate.toFixed(1)}%
            </div>
            <Badge variant={stats.errorRate < 1 ? "default" : stats.errorRate < 3 ? "secondary" : "destructive"}>
              {stats.errorRate < 1 ? '🟢' : stats.errorRate < 3 ? '🟡' : '🔴'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sentiment Trend</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.sentimentTrend.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              {stats.sentimentTrend > 0 ? '😊 Positive' : stats.sentimentTrend < -0.2 ? '😞 Negative' : '😐 Neutral'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Daily Cost</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalCost.toFixed(4)}
            </div>
            <div className="text-xs text-muted-foreground">
              Last 24h
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalRequests}
            </div>
            <div className="text-xs text-muted-foreground">
              Last 24h
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>PII Detections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.piiDetections}
            </div>
            <Badge variant={stats.piiDetections === 0 ? "default" : "destructive"}>
              {stats.piiDetections === 0 ? '🟢 Safe' : '🔴 Alert'}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}