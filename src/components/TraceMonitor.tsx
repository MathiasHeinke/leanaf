import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity, 
  RefreshCw, 
  Eye, 
  Clock, 
  Database,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface TraceEntry {
  id: number;
  trace_id: string;
  ts: string;
  stage: string;
  data: any;
}

export const TraceMonitor: React.FC = () => {
  const [traces, setTraces] = useState<TraceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRealTime, setIsRealTime] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [selectedTrace, setSelectedTrace] = useState<string | null>(null);

  const loadTraces = async () => {
    setIsLoading(true);
    try {
      // Get traces from the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('coach_traces')
        .select('*')
        .gte('ts', oneHourAgo)
        .order('ts', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading traces:', error);
        return;
      }

      setTraces(data || []);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Exception loading traces:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRealTime = () => {
    setIsRealTime(!isRealTime);
  };

  const getStageIcon = (stage: string) => {
    const stageMap: Record<string, React.ReactNode> = {
      'A_received': <CheckCircle className="h-3 w-3 text-blue-500" />,
      'B_context_ready': <Database className="h-3 w-3 text-green-500" />,
      'C_openai_call': <Activity className="h-3 w-3 text-orange-500" />,
      'D_delta': <Loader2 className="h-3 w-3 text-purple-500 animate-spin" />,
      'G_memory_saved': <CheckCircle className="h-3 w-3 text-green-600" />,
      'test_write': <AlertCircle className="h-3 w-3 text-yellow-500" />
    };
    
    return stageMap[stage] || <Activity className="h-3 w-3 text-gray-400" />;
  };

  const getStageBadge = (stage: string) => {
    const stageVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'A_received': 'secondary',
      'B_context_ready': 'default',
      'C_openai_call': 'outline',
      'D_delta': 'secondary',
      'G_memory_saved': 'default',
      'test_write': 'destructive'
    };
    
    return (
      <Badge variant={stageVariants[stage] || 'outline'} className="text-xs">
        {stage}
      </Badge>
    );
  };

  const groupTracesByTraceId = (traces: TraceEntry[]) => {
    const grouped: Record<string, TraceEntry[]> = {};
    
    traces.forEach(trace => {
      if (!grouped[trace.trace_id]) {
        grouped[trace.trace_id] = [];
      }
      grouped[trace.trace_id].push(trace);
    });
    
    // Sort each group by timestamp
    Object.keys(grouped).forEach(traceId => {
      grouped[traceId].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
    });
    
    return grouped;
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    
    if (diffMs < 60000) return `${Math.floor(diffMs / 1000)}s ago`;
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
    return time.toLocaleTimeString();
  };

  // Real-time polling
  useEffect(() => {
    if (!isRealTime) return;
    
    const interval = setInterval(loadTraces, 2000);
    return () => clearInterval(interval);
  }, [isRealTime]);

  // Initial load
  useEffect(() => {
    loadTraces();
  }, []);

  const groupedTraces = groupTracesByTraceId(traces);
  const traceGroups = Object.entries(groupedTraces)
    .sort(([, a], [, b]) => new Date(b[0].ts).getTime() - new Date(a[0].ts).getTime());

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Trace Monitor
            <Badge variant="outline" className="ml-2">
              {traces.length} traces
            </Badge>
          </CardTitle>
          
          <div className="flex gap-2">
            <Button
              variant={isRealTime ? "default" : "outline"}
              size="sm"
              onClick={toggleRealTime}
            >
              {isRealTime ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Live
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  Watch
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={loadTraces}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 max-h-96 overflow-y-auto">
        {traceGroups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No traces found in the last hour</p>
            <p className="text-xs mt-1">Send a message to Lucy to generate traces</p>
          </div>
        ) : (
          traceGroups.map(([traceId, traceList]) => (
            <div key={traceId} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs font-mono"
                    onClick={() => setSelectedTrace(
                      selectedTrace === traceId ? null : traceId
                    )}
                  >
                    {traceId.slice(0, 12)}...
                  </Button>
                  <Badge variant="outline" className="text-xs">
                    {traceList.length} stages
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(traceList[0].ts)}
                </span>
              </div>
              
              {/* Stage Flow */}
              <div className="flex flex-wrap gap-1">
                {traceList.map((trace, index) => (
                  <div key={trace.id} className="flex items-center gap-1">
                    {getStageIcon(trace.stage)}
                    {getStageBadge(trace.stage)}
                    {index < traceList.length - 1 && (
                      <span className="text-muted-foreground mx-1">→</span>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Expanded Details */}
              {selectedTrace === traceId && (
                <div className="mt-3 space-y-2 bg-muted/30 p-2 rounded text-xs">
                  {traceList.map(trace => (
                    <div key={trace.id} className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {getStageIcon(trace.stage)}
                        <span className="font-mono">{trace.stage}</span>
                        <span className="text-muted-foreground">
                          {new Date(trace.ts).toLocaleTimeString()}
                        </span>
                      </div>
                      {trace.data && (
                        <pre className="text-xs bg-background p-1 rounded flex-1 overflow-x-auto">
                          {JSON.stringify(trace.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};