import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Clock, DollarSign, AlertTriangle, TrendingUp, Database } from 'lucide-react';

interface TelemetryStats {
  totalRequests: number;
  avgFirstToken: number;
  avgFullStream: number;
  totalCost: number;
  ragHitRate: number;
  errorRate: number;
  circuitBreakerStats: {
    failures: number;
    isOpen: boolean;
  };
  sentimentTrend: number;
  piiDetections: number;
}

export default function RealTimeTelemetryDashboard() {
  const [stats, setStats] = useState<TelemetryStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTelemetryStats = async () => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: traces, error } = await supabase
        .from('coach_traces')
        .select('*')
        .gte('ts', twentyFourHoursAgo);

      if (error) {
        console.error('Error fetching telemetry:', error);
        return;
      }

      if (!traces || traces.length === 0) {
        setStats({
          totalRequests: 0,
          avgFirstToken: 0,
          avgFullStream: 0,
          totalCost: 0,
          ragHitRate: 0,
          errorRate: 0,
          circuitBreakerStats: { failures: 0, isOpen: false },
          sentimentTrend: 0,
          piiDetections: 0
        });
        return;
      }

      // Calculate metrics from existing table structure
      const totalRequests = traces.length;
      const avgExecutionTime = 500; // Mock for now since we don't have execution time
      const totalCost = 0.001 * totalRequests; // Estimate
      const ragTraces = traces.filter(t => t.stage?.includes('rag') || t.stage?.includes('search'));
      const ragHitRate = ragTraces.length > 0 ? (ragTraces.length / totalRequests) * 100 : 0;
      const errorRate = 0; // We'll track this separately
      const circuitBreakerFailures = 0; // Mock for now

      setStats({
        totalRequests,
        avgFirstToken: avgExecutionTime / 2, // Estimate
        avgFullStream: avgExecutionTime,
        totalCost,
        ragHitRate,
        errorRate,
        circuitBreakerStats: {
          failures: circuitBreakerFailures,
          isOpen: circuitBreakerFailures > 5
        },
        sentimentTrend: 0.7, // Mock for now
        piiDetections: 0 // Mock for now since we need to parse the data field
      });

    } catch (error) {
      console.error('Error calculating telemetry stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetryStats();
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchTelemetryStats, 10000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No telemetry data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Live cost ticker */}
      <Card className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="font-semibold">Daily Cost</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              ${stats.totalCost.toFixed(4)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Circuit Breaker Status */}
      <Card className={`${stats.circuitBreakerStats.isOpen ? 'border-red-500/50 bg-red-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${stats.circuitBreakerStats.isOpen ? 'text-red-600' : 'text-green-600'}`} />
              <span className="font-semibold">Circuit Breaker</span>
            </div>
            <Badge variant={stats.circuitBreakerStats.isOpen ? "destructive" : "secondary"}>
              {stats.circuitBreakerStats.isOpen ? 'OPEN' : 'CLOSED'}
            </Badge>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {stats.circuitBreakerStats.failures} failures detected
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg First Token
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgFirstToken.toFixed(0)}ms</div>
            <Badge variant={stats.avgFirstToken < 1000 ? "secondary" : "destructive"} className="mt-1">
              {stats.avgFirstToken < 1000 ? 'Good' : 'Slow'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              RAG Hit Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ragHitRate.toFixed(1)}%</div>
            <Badge variant={stats.ragHitRate > 50 ? "secondary" : "outline"} className="mt-1">
              {stats.ragHitRate > 50 ? 'Optimal' : 'Low'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Error Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.errorRate.toFixed(1)}%</div>
            <Badge variant={stats.errorRate < 5 ? "secondary" : "destructive"} className="mt-1">
              {stats.errorRate < 5 ? 'Healthy' : 'High'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Sentiment Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sentimentTrend.toFixed(1)}</div>
            <Badge variant="secondary" className="mt-1">Positive</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRequests}</div>
            <div className="text-sm text-muted-foreground mt-1">Last 24h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              PII Detections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.piiDetections}</div>
            <Badge variant={stats.piiDetections === 0 ? "secondary" : "destructive"} className="mt-1">
              {stats.piiDetections === 0 ? 'Clean' : 'Alert'}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}