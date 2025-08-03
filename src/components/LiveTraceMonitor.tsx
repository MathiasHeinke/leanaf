import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Zap,
  MessageSquare,
  Brain,
  Database,
  Cpu,
  Search,
  HardDrive,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface TraceEvent {
  id: string;
  trace_id: string;
  conversation_id?: string;
  message_id?: string;
  step: string;
  status: 'started' | 'progress' | 'complete' | 'error';
  data: Record<string, any>;
  duration_ms?: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

interface GroupedTrace {
  traceId: string;
  conversationId?: string;
  messageId?: string;
  events: TraceEvent[];
  startTime: string;
  totalDuration?: number;
  status: 'running' | 'completed' | 'error';
}

const STEP_ICONS: Record<string, React.ComponentType<any>> = {
  'handleMessage': MessageSquare,
  'buildAIContext': Brain,
  'RAG Knowledge': Database,
  'Coach Memory': HardDrive,
  'OpenAI Call': Cpu,
  'Stream SSE': Zap,
  'Memory Update': HardDrive,
  'Tool Trigger': Activity,
  'Summary Generation': Brain,
  'Display in UI': Play
};

const STATUS_COLORS = {
  started: 'bg-blue-500',
  progress: 'bg-yellow-500', 
  complete: 'bg-green-500',
  error: 'bg-red-500'
};

export const LiveTraceMonitor = () => {
  const [traces, setTraces] = useState<GroupedTrace[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTraces = async () => {
    try {
      const { data, error } = await supabase
        .from('coach_trace_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      // Group events by trace_id
      const groupedTraces = new Map<string, GroupedTrace>();
      
      data?.forEach((event: any) => {
        if (!groupedTraces.has(event.trace_id)) {
          groupedTraces.set(event.trace_id, {
            traceId: event.trace_id,
            conversationId: event.conversation_id,
            messageId: event.message_id,
            events: [],
            startTime: event.created_at,
            status: 'running'
          });
        }
        
        const trace = groupedTraces.get(event.trace_id)!;
        trace.events.push(event);
        
        // Update trace status based on events
        const hasError = trace.events.some(e => e.status === 'error');
        const allComplete = trace.events.every(e => e.status === 'complete');
        
        if (hasError) {
          trace.status = 'error';
        } else if (allComplete && trace.events.length > 0) {
          trace.status = 'completed';
        } else {
          trace.status = 'running';
        }
        
        // Calculate total duration
        const completedEvents = trace.events.filter(e => e.duration_ms);
        if (completedEvents.length > 0) {
          trace.totalDuration = completedEvents.reduce((sum, e) => sum + (e.duration_ms || 0), 0);
        }
      });

      const tracesArray = Array.from(groupedTraces.values()).sort((a, b) => 
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
      
      setTraces(tracesArray);
    } catch (error) {
      console.error('Failed to fetch traces:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTraces();

    if (isLive) {
      const interval = setInterval(fetchTraces, 2000); // Poll every 2 seconds
      return () => clearInterval(interval);
    }
  }, [isLive]);

  const filteredTraces = traces.filter(trace => 
    !searchTerm || 
    trace.traceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trace.conversationId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trace.messageId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trace.events.some(e => e.step.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStepIcon = (step: string) => {
    const IconComponent = STEP_ICONS[step] || Activity;
    return <IconComponent className="w-4 h-4" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'progress': return <Activity className="w-4 h-4 text-yellow-500 animate-spin" />;
      default: return <AlertCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTraceStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'error': return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      default: return <Badge className="bg-blue-100 text-blue-800">Running</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Live Pipeline Monitor
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={isLive ? "default" : "outline"}
                size="sm"
                onClick={() => setIsLive(!isLive)}
              >
                {isLive ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                {isLive ? 'Live' : 'Paused'}
              </Button>
              <Button variant="outline" size="sm" onClick={fetchTraces}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by trace ID, conversation, message, or step..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredTraces.length} traces
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Traces */}
      <ScrollArea className="h-[600px]">
        <div className="grid grid-cols-1 gap-4">
          {filteredTraces.map((trace) => (
            <Card key={trace.traceId} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-mono">
                      {trace.traceId}
                    </CardTitle>
                    {getTraceStatusBadge(trace.status)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(trace.startTime), 'HH:mm:ss')}
                  </div>
                </div>
                {trace.conversationId && (
                  <div className="text-xs text-muted-foreground">
                    Conversation: {trace.conversationId} | Message: {trace.messageId}
                  </div>
                )}
                {trace.totalDuration && (
                  <div className="text-xs text-muted-foreground">
                    Total Duration: {trace.totalDuration}ms
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trace.events
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                    .map((event, index) => (
                    <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {getStepIcon(event.step)}
                        <span className="text-sm font-medium truncate">{event.step}</span>
                        {getStatusIcon(event.status)}
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {event.duration_ms && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {event.duration_ms}ms
                          </span>
                        )}
                        <span>{format(new Date(event.created_at), 'HH:mm:ss.SSS')}</span>
                      </div>
                      
                      {/* Progress indicator */}
                      {trace.events.length > 1 && (
                        <div className="w-16">
                          <Progress 
                            value={((index + 1) / trace.events.length) * 100} 
                            className="h-1"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Error details */}
                  {trace.status === 'error' && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <div className="text-sm text-red-800 dark:text-red-300">
                        {trace.events.find(e => e.error_message)?.error_message || 'Unknown error'}
                      </div>
                    </div>
                  )}
                  
                  {/* Additional data preview */}
                  {trace.events.some(e => Object.keys(e.data || {}).length > 0) && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Show Event Data
                      </summary>
                      <div className="mt-2 space-y-1">
                        {trace.events.map((event) => (
                          event.data && Object.keys(event.data).length > 0 && (
                            <div key={event.id} className="p-2 bg-muted rounded">
                              <div className="font-medium">{event.step}:</div>
                              <pre className="text-xs text-muted-foreground overflow-auto">
                                {JSON.stringify(event.data, null, 2)}
                              </pre>
                            </div>
                          )
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredTraces.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-muted-foreground">
                  {searchTerm ? 'No traces match your search' : 'No trace events found'}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};