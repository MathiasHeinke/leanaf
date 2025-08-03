import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Send,
  RefreshCw,
  PlayCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

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

const COACHES = [
  { id: 'lucy', name: 'Lucy - Ernährungscoach' },
  { id: 'sascha', name: 'Sascha - Fitness & Krafttraining' },
  { id: 'kai', name: 'Kai - KI-Coach' },
  { id: 'markus', name: 'Markus Rühl - Bodybuilding' },
  { id: 'dr-vita', name: 'Dr. Vita Femina - Frauengesundheit' }
];

const STEP_ICONS: Record<string, React.ComponentType<any>> = {
  'message_received': MessageSquare,
  'buildAIContext': Brain,
  'openai_call': Cpu,
  'stream': Zap,
  'complete': CheckCircle,
  'error': XCircle
};

const STEP_NAMES: Record<string, string> = {
  'message_received': 'Nachricht empfangen',
  'buildAIContext': 'KI-Kontext aufbauen',
  'openai_call': 'OpenAI Anfrage',
  'stream': 'Antwort streamen',
  'complete': 'Verarbeitung abgeschlossen',
  'error': 'Fehler'
};

const STATUS_COLORS = {
  started: 'text-blue-500',
  progress: 'text-yellow-500', 
  complete: 'text-green-500',
  error: 'text-red-500'
};

export const LiveTraceMonitor = () => {
  const [traces, setTraces] = useState<GroupedTrace[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoach, setSelectedCoach] = useState<string>('lucy');
  const [testMessage, setTestMessage] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [currentTraceId, setCurrentTraceId] = useState<string | null>(null);
  const { toast } = useToast();

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
        const hasComplete = trace.events.some(e => e.step === 'complete' && e.status === 'complete');
        
        if (hasError) {
          trace.status = 'error';
        } else if (hasComplete) {
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

  // Set up realtime subscription
  useEffect(() => {
    fetchTraces();

    const channel = supabase
      .channel('coach_trace_events_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'coach_trace_events'
        },
        () => {
          fetchTraces(); // Refetch when new events arrive
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sendTestMessage = async () => {
    if (!testMessage.trim()) {
      toast({
        title: "Nachricht erforderlich",
        description: "Bitte gib eine Test-Nachricht ein.",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    try {
      const messageId = `msg_${Date.now()}`;
      const traceId = `trace_${Date.now()}`;
      setCurrentTraceId(traceId);

      // Call the unified coach engine
      const response = await supabase.functions.invoke('unified-coach-engine', {
        body: {
          userId: 'test-user-admin',
          coachId: selectedCoach,
          message: testMessage,
          messageId,
          traceId,
          enableStreaming: true,
          enableRag: false
        }
      });

      if (response.error) {
        throw response.error;
      }

      toast({
        title: "Test-Nachricht gesendet",
        description: `Nachricht an ${COACHES.find(c => c.id === selectedCoach)?.name} gesendet. Verfolge die Pipeline unten.`
      });

      setTestMessage('');
    } catch (error: any) {
      console.error('Error sending test message:', error);
      toast({
        title: "Fehler beim Senden",
        description: error.message || "Die Test-Nachricht konnte nicht gesendet werden.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const getStepIcon = (step: string) => {
    const IconComponent = STEP_ICONS[step] || Activity;
    return <IconComponent className="w-4 h-4" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'progress': 
      case 'started': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <AlertCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTraceStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Abgeschlossen</Badge>;
      case 'error': return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Fehler</Badge>;
      default: return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Läuft</Badge>;
    }
  };

  // Filter to show current trace first
  const sortedTraces = currentTraceId 
    ? traces.sort((a, b) => {
        if (a.traceId === currentTraceId) return -1;
        if (b.traceId === currentTraceId) return 1;
        return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
      })
    : traces;

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
      {/* Test Message Sender */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5" />
            Live Coach Pipeline Monitor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Coach auswählen</label>
              <Select value={selectedCoach} onValueChange={setSelectedCoach}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COACHES.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">Test-Nachricht</label>
              <div className="flex gap-2">
                <Input
                  placeholder="z.B. Wie kann ich besser schlafen?"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isSending && sendTestMessage()}
                  disabled={isSending}
                />
                <Button 
                  onClick={sendTestMessage} 
                  disabled={isSending || !testMessage.trim()}
                  size="sm"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send & Monitor
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {traces.length} Traces gefunden
            </div>
            <Button variant="outline" size="sm" onClick={fetchTraces}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Aktualisieren
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Traces */}
      <ScrollArea className="h-[600px]">
        <div className="grid grid-cols-1 gap-4">
          {sortedTraces.map((trace) => (
            <Card 
              key={trace.traceId} 
              className={`relative ${
                trace.traceId === currentTraceId ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-mono">
                      {trace.traceId === currentTraceId && '🎯 '}
                      {trace.traceId}
                    </CardTitle>
                    {getTraceStatusBadge(trace.status)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(trace.startTime), 'HH:mm:ss')}
                  </div>
                </div>
                {trace.messageId && (
                  <div className="text-xs text-muted-foreground">
                    Message: {trace.messageId}
                  </div>
                )}
                {trace.totalDuration && (
                  <div className="text-xs text-muted-foreground">
                    Gesamt: {trace.totalDuration}ms
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trace.events
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                    .map((event, index) => (
                    <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {getStepIcon(event.step)}
                        <span className="text-sm font-medium">
                          {STEP_NAMES[event.step] || event.step}
                        </span>
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
                    </div>
                  ))}
                  
                  {/* Error details */}
                  {trace.status === 'error' && (
                    <div className="mt-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <div className="text-sm text-red-800 dark:text-red-300">
                        {trace.events.find(e => e.error_message)?.error_message || 'Unknown error'}
                      </div>
                    </div>
                  )}
                  
                  {/* Additional data preview */}
                  {trace.events.some(e => Object.keys(e.data || {}).length > 0) && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Event-Daten anzeigen
                      </summary>
                      <div className="mt-2 space-y-1">
                        {trace.events.map((event) => (
                          event.data && Object.keys(event.data).length > 0 && (
                            <div key={event.id} className="p-2 bg-muted rounded">
                              <div className="font-medium">{STEP_NAMES[event.step] || event.step}:</div>
                              <pre className="text-xs text-muted-foreground overflow-auto max-h-32">
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
          
          {sortedTraces.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-muted-foreground">
                  Noch keine Trace-Events gefunden. Sende eine Test-Nachricht oben!
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};