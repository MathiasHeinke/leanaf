import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Clock, DollarSign, Zap, Brain, MessageSquare, Pause, Play } from 'lucide-react';

interface TraceEntry {
  id: number;
  trace_id: string;
  ts: string;
  stage: string;
  data: any;
}

interface TraceMetrics {
  totalTraces: number;
  avgResponseTime: number;
  totalCost: number;
  errorRate: number;
  tokensPerSecond: number;
}

export default function TraceLive() {
  const { user } = useAuth();
  const [traces, setTraces] = useState<TraceEntry[]>([]);
  const [metrics, setMetrics] = useState<TraceMetrics>({
    totalTraces: 0,
    avgResponseTime: 0,
    totalCost: 0,
    errorRate: 0,
    tokensPerSecond: 0
  });
  const [isLive, setIsLive] = useState(true);
  const [selectedTrace, setSelectedTrace] = useState<string | null>(null);

  // Load initial traces
  const loadTraces = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('coach_traces')
      .select('*')
      .gte('ts', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24h
      .order('ts', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Failed to load traces:', error);
      return;
    }

    setTraces(data || []);
    calculateMetrics(data || []);
  };

  // Calculate metrics from trace data
  const calculateMetrics = (traceData: TraceEntry[]) => {
    if (traceData.length === 0) return;

    const responseTimes = traceData
      .filter(t => t.data.totalDuration)
      .map(t => t.data.totalDuration);
    
    const costs = traceData
      .filter(t => t.data.cost_usd)
      .map(t => t.data.cost_usd);
    
    const errors = traceData.filter(t => t.stage === 'error').length;
    
    const tokenRates = traceData
      .filter(t => t.data.tokensPerSecond)
      .map(t => t.data.tokensPerSecond);

    setMetrics({
      totalTraces: traceData.length,
      avgResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      totalCost: costs.reduce((a, b) => a + b, 0),
      errorRate: traceData.length > 0 ? (errors / traceData.length) * 100 : 0,
      tokensPerSecond: tokenRates.length > 0 ? tokenRates.reduce((a, b) => a + b, 0) / tokenRates.length : 0
    });
  };

  // Real-time subscription
  useEffect(() => {
    if (!isLive || !user?.id) return;

    const channel = supabase
      .channel('trace-live-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'coach_traces'
        },
        (payload) => {
          console.log('🔴 Live trace update:', payload);
          const newTrace = payload.new as TraceEntry;
          
          setTraces(prev => {
            const updated = [newTrace, ...prev].slice(0, 100); // Keep last 100
            calculateMetrics(updated);
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLive, user?.id]);

  // Load traces on mount
  useEffect(() => {
    loadTraces();
  }, [user?.id]);

  const getStageIcon = (stage: string) => {
    const iconMap: Record<string, any> = {
      'A_received': MessageSquare,
      'B_context_ready': Brain,
      'C_openai_call': Zap,
      'D_delta': Activity,
      'F_streaming_done': Clock,
      'G_complete': DollarSign,
      'error': () => '❌'
    };
    
    const Icon = iconMap[stage] || Activity;
    return typeof Icon === 'function' ? <Icon className="h-4 w-4" /> : Icon;
  };

  const getStageBadge = (stage: string) => {
    const variantMap: Record<string, any> = {
      'A_received': 'secondary',
      'B_context_ready': 'default', 
      'C_openai_call': 'destructive',
      'D_delta': 'default',
      'F_streaming_done': 'secondary',
      'G_complete': 'default',
      'error': 'destructive'
    };
    
    return (
      <Badge variant={variantMap[stage] || 'outline'} className="text-xs">
        {getStageIcon(stage)} {stage}
      </Badge>
    );
  };

  const groupedTraces = traces.reduce((acc, trace) => {
    if (!acc[trace.trace_id]) {
      acc[trace.trace_id] = [];
    }
    acc[trace.trace_id].push(trace);
    return acc;
  }, {} as Record<string, TraceEntry[]>);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Live Traces</h1>
          <p className="text-muted-foreground">Real-time monitoring deiner Coach-Gespräche</p>
        </div>
        <Button
          variant={isLive ? "destructive" : "default"}
          onClick={() => setIsLive(!isLive)}
          className="flex items-center gap-2"
        >
          {isLive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isLive ? 'Live pausieren' : 'Live starten'}
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total Traces</p>
                <p className="text-lg font-bold">{metrics.totalTraces}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Avg Response</p>
                <p className="text-lg font-bold">{Math.round(metrics.avgResponseTime)}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Total Cost</p>
                <p className="text-lg font-bold">${metrics.totalCost.toFixed(4)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Tokens/sec</p>
                <p className="text-lg font-bold">{Math.round(metrics.tokensPerSecond)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-red-500 rounded-full" />
              <div>
                <p className="text-xs text-muted-foreground">Error Rate</p>
                <p className="text-lg font-bold">{metrics.errorRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Indicator */}
      {isLive && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          Live Updates aktiv
        </div>
      )}

      {/* Trace Groups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Trace Groups ({Object.keys(groupedTraces).length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {Object.entries(groupedTraces)
                .sort(([, a], [, b]) => new Date(b[0]?.ts).getTime() - new Date(a[0]?.ts).getTime())
                .map(([traceId, traceGroup]) => {
                  const isExpanded = selectedTrace === traceId;
                  const latestTrace = traceGroup[0];
                  const stages = traceGroup.map(t => t.stage).join(' → ');
                  
                  return (
                    <div key={traceId} className="border rounded-lg p-4">
                      <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setSelectedTrace(isExpanded ? null : traceId)}
                      >
                        <div className="flex items-center gap-3">
                          <code className="text-xs bg-secondary px-2 py-1 rounded font-mono">
                            {traceId.substring(0, 12)}...
                          </code>
                          <span className="text-sm text-muted-foreground">
                            {new Date(latestTrace.ts).toLocaleTimeString()}
                          </span>
                          <div className="flex gap-1">
                            {traceGroup.slice(0, 3).map((trace, idx) => (
                              <div key={idx}>{getStageBadge(trace.stage)}</div>
                            ))}
                            {traceGroup.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{traceGroup.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          {isExpanded ? '▼' : '▶'}
                        </Button>
                      </div>
                      
                      {isExpanded && (
                        <>
                          <Separator className="my-3" />
                          <div className="space-y-3">
                            {traceGroup
                              .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
                              .map((trace, idx) => (
                                <div key={trace.id} className="flex items-start gap-3 text-sm">
                                <div className="flex-shrink-0 text-xs text-muted-foreground mt-1">
                                    {new Date(trace.ts).toLocaleTimeString()}
                                  </div>
                                  <div className="flex-shrink-0">
                                    {getStageBadge(trace.stage)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    {Object.keys(trace.data).length > 0 && (
                                      <details className="mt-1">
                                        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                                          Data ({Object.keys(trace.data).length} keys)
                                        </summary>
                                        <pre className="mt-2 text-xs bg-secondary p-2 rounded overflow-x-auto">
                                          {JSON.stringify(trace.data, null, 2)}
                                        </pre>
                                      </details>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              
              {Object.keys(groupedTraces).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Keine Traces gefunden</p>
                  <p className="text-sm mt-1">Starte ein Gespräch mit einem Coach um Traces zu sehen</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}