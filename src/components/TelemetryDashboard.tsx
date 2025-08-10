import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Activity, TrendingUp, AlertTriangle, Users, Zap, Clock, Target } from 'lucide-react';

interface TelemetryMetrics {
  totalTraces: number;
  successRate: number;
  averageLatency: number;
  errorRate: number;
  activeUsers: number;
  featureFlagStats: Array<{ flag: string; enabled: number; total: number }>;
  performanceData: Array<{ date: string; latency: number; success: number }>;
  errorDistribution: Array<{ type: string; count: number }>;
}

interface FeatureFlagStat {
  flag_name: string;
  users_enabled: number;
  total_users: number;
  success_rate: number;
}

export const TelemetryDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<TelemetryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  const fetchTelemetryData = async () => {
    try {
      setLoading(true);
      
      const hoursBack = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
      const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

      // Fetch trace events
      const { data: traces, error: tracesError } = await supabase
        .from('coach_trace_events')
        .select('*')
        .gte('created_at', cutoffTime);

      if (tracesError) throw tracesError;

      // Fetch feature flag stats
      const { data: flagStats, error: flagError } = await supabase
        .from('user_feature_flags')
        .select(`
          feature_flag_id,
          is_enabled,
          feature_flags!inner(flag_name)
        `);

      if (flagError) throw flagError;

      // Process metrics
      const totalTraces = traces?.length || 0;
      const successfulTraces = traces?.filter(t => t.status === 'complete')?.length || 0;
      const errorTraces = traces?.filter(t => t.status === 'error')?.length || 0;
      
      const successRate = totalTraces > 0 ? (successfulTraces / totalTraces) * 100 : 0;
      const errorRate = totalTraces > 0 ? (errorTraces / totalTraces) * 100 : 0;

      // Calculate average latency
      const completedTraces = traces?.filter(t => t.duration_ms && t.duration_ms > 0) || [];
      const averageLatency = completedTraces.length > 0 
        ? completedTraces.reduce((sum, t) => sum + (t.duration_ms || 0), 0) / completedTraces.length
        : 0;

      // Active users (unique conversation_ids in timeframe)
      const uniqueUsers = new Set(traces?.map(t => t.conversation_id).filter(Boolean)).size;

      // Feature flag distribution
      const flagDistribution = flagStats?.reduce((acc: Record<string, any>, stat: any) => {
        const flagName = stat.feature_flags?.flag_name;
        if (!flagName) return acc;
        
        if (!acc[flagName]) {
          acc[flagName] = { enabled: 0, total: 0 };
        }
        acc[flagName].total++;
        if (stat.is_enabled) acc[flagName].enabled++;
        return acc;
      }, {});

      const featureFlagStats = Object.entries(flagDistribution || {}).map(([flag, data]: [string, any]) => ({
        flag,
        enabled: data.enabled,
        total: data.total
      }));

      // Performance over time (simplified)
      const performanceData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dayTraces = traces?.filter(t => 
          new Date(t.created_at).toDateString() === date.toDateString()
        ) || [];
        
        return {
          date: date.toLocaleDateString('de-DE', { month: 'short', day: 'numeric' }),
          latency: dayTraces.length > 0 
            ? dayTraces.reduce((sum, t) => sum + (t.duration_ms || 0), 0) / dayTraces.length
            : 0,
          success: dayTraces.filter(t => t.status === 'complete').length
        };
      }).reverse();

      // Error distribution
      const errorDistribution = traces?.reduce((acc: Record<string, number>, trace) => {
        if (trace.status === 'error') {
          const errorType = trace.step || 'unknown';
          acc[errorType] = (acc[errorType] || 0) + 1;
        }
        return acc;
      }, {});

      const errorDistArray = Object.entries(errorDistribution || {}).map(([type, count]) => ({
        type,
        count: count as number
      }));

      setMetrics({
        totalTraces,
        successRate,
        averageLatency,
        errorRate,
        activeUsers: uniqueUsers,
        featureFlagStats,
        performanceData,
        errorDistribution: errorDistArray
      });
    } catch (error) {
      console.error('Error fetching telemetry data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetryData();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              Keine Telemetrie-Daten verfügbar
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Telemetrie Dashboard</h1>
        <div className="flex gap-2">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erfolgsquote</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.successRate.toFixed(1)}%</div>
            <Badge variant={metrics.successRate > 95 ? 'default' : metrics.successRate > 85 ? 'secondary' : 'destructive'}>
              {metrics.totalTraces} Traces
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ø Latenz</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(metrics.averageLatency)}ms</div>
            <Badge variant={metrics.averageLatency < 1000 ? 'default' : metrics.averageLatency < 3000 ? 'secondary' : 'destructive'}>
              Performance
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktive User</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsers}</div>
            <Badge variant="default">
              {timeRange}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fehlerrate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.errorRate.toFixed(1)}%</div>
            <Badge variant={metrics.errorRate < 5 ? 'default' : metrics.errorRate < 10 ? 'secondary' : 'destructive'}>
              Stabilität
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="features">Feature Flags</TabsTrigger>
          <TabsTrigger value="errors">Fehler-Analyse</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance über Zeit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="latency" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Latenz (ms)"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="success" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      name="Erfolgreiche Anfragen"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flag Adoption</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.featureFlagStats.map((flag) => (
                  <div key={flag.flag} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{flag.flag}</h4>
                      <p className="text-sm text-muted-foreground">
                        {flag.enabled} von {flag.total} Usern aktiviert
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ width: `${(flag.enabled / Math.max(flag.total, 1)) * 100}%` }}
                        />
                      </div>
                      <Badge variant="outline">
                        {Math.round((flag.enabled / Math.max(flag.total, 1)) * 100)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fehler-Verteilung</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.errorDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--destructive))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};