import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Loader2,
  Copy,
  Eye,
  RotateCcw,
  ChevronDown,
  Layers,
  Code,
  AlertTriangle
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
  totalSteps: number;
  completedSteps: number;
  errorSteps: number;
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
  'error': XCircle,
  'config_check': Database,
  'validation': AlertCircle
};

const STEP_NAMES: Record<string, string> = {
  'message_received': 'Nachricht empfangen',
  'config_check': 'Konfiguration prüfen',
  'validation': 'Parameter validiert',
  'buildAIContext': 'KI-Kontext aufbauen',
  'openai_call': 'OpenAI Anfrage',
  'stream': 'Antwort streamen',
  'complete': 'Verarbeitung abgeschlossen',
  'error': 'Fehler aufgetreten'
};

const STATUS_COLORS = {
  started: 'text-blue-500',
  progress: 'text-yellow-500', 
  complete: 'text-green-500',
  error: 'text-red-500'
};

const PRIORITY_STEPS = ['openai_call', 'buildAIContext', 'stream', 'error'];

export const LiveTraceMonitor = () => {
  const [traces, setTraces] = useState<GroupedTrace[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoach, setSelectedCoach] = useState<string>('lucy');
  const [testMessage, setTestMessage] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [currentTraceId, setCurrentTraceId] = useState<string | null>(null);
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTraces = async () => {
    try {
      const { data, error } = await supabase
        .from('coach_trace_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (error) throw error;

      // Step 1: Group events by trace_id AND step to get latest status per step
      const traceStepMap = new Map<string, Map<string, TraceEvent>>();
      
      data?.forEach((event: any) => {
        const traceKey = event.trace_id;
        
        if (!traceStepMap.has(traceKey)) {
          traceStepMap.set(traceKey, new Map());
        }
        
        const stepMap = traceStepMap.get(traceKey)!;
        const existingEvent = stepMap.get(event.step);
        
        // Keep the event with highest priority status (complete > error > progress > started)
        const statusPriority = { complete: 4, error: 3, progress: 2, started: 1 };
        const currentPriority = statusPriority[event.status as keyof typeof statusPriority] || 0;
        const existingPriority = existingEvent ? statusPriority[existingEvent.status as keyof typeof statusPriority] || 0 : 0;
        
        if (!existingEvent || currentPriority > existingPriority || 
            (currentPriority === existingPriority && new Date(event.created_at) > new Date(existingEvent.created_at))) {
          stepMap.set(event.step, event);
        }
      });

      // Step 2: Convert to GroupedTrace with correct status per step
      const groupedTraces = new Map<string, GroupedTrace>();
      
      traceStepMap.forEach((stepMap, traceId) => {
        const events = Array.from(stepMap.values()).sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        const firstEvent = events[0];
        const errorSteps = events.filter(e => e.status === 'error').length;
        const completeSteps = events.filter(e => e.status === 'complete').length;
        const hasCompleteStep = events.some(e => e.step === 'complete' && e.status === 'complete');
        
        // Determine overall trace status
        let traceStatus: 'running' | 'completed' | 'error' = 'running';
        if (errorSteps > 0) {
          traceStatus = 'error';
        } else if (hasCompleteStep) {
          traceStatus = 'completed';
        }
        
        const totalDuration = events
          .filter(e => e.duration_ms)
          .reduce((sum, e) => sum + (e.duration_ms || 0), 0);

        groupedTraces.set(traceId, {
          traceId,
          conversationId: firstEvent.conversation_id,
          messageId: firstEvent.message_id,
          events,
          startTime: firstEvent.created_at,
          status: traceStatus,
          totalSteps: events.length,
          completedSteps: completeSteps,
          errorSteps: errorSteps,
          totalDuration: totalDuration || undefined
        });
      });

      const tracesArray = Array.from(groupedTraces.values()).sort((a, b) => 
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
      
      setTraces(tracesArray);
    } catch (error) {
      console.error('Failed to fetch traces:', error);
      toast({
        title: "Fehler beim Laden",
        description: "Trace-Events konnten nicht geladen werden.",
        variant: "destructive"
      });
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
        (payload) => {
          console.log('New trace event received:', payload);
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
      setExpandedTrace(traceId);

      // Call the unified coach engine
      const response = await supabase.functions.invoke('enhanced-coach-non-streaming', {
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
        description: `Nachricht an ${COACHES.find(c => c.id === selectedCoach)?.name} gesendet. Pipeline wird live verfolgt.`
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

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Kopiert",
        description: `${label} wurde in die Zwischenablage kopiert.`
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Kopieren fehlgeschlagen.",
        variant: "destructive"
      });
    }
  };

  const getStepIcon = (step: string) => {
    const IconComponent = STEP_ICONS[step] || Activity;
    return <IconComponent className="w-4 h-4" />;
  };

  const getStatusIcon = (status: string, isRunning?: boolean) => {
    switch (status) {
      case 'complete': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'progress': 
      case 'started': return isRunning ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin" /> : <Clock className="w-4 h-4 text-blue-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTraceStatusBadge = (trace: GroupedTrace) => {
    const isRunning = trace.status === 'running';
    const hasLongRunningSteps = trace.events.some(e => 
      e.status === 'started' && 
      Date.now() - new Date(e.created_at).getTime() > 10000
    );

    switch (trace.status) {
      case 'completed': 
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          ✅ Abgeschlossen ({trace.completedSteps}/{trace.totalSteps})
        </Badge>;
      case 'error': 
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          ❌ Fehler ({trace.errorSteps} Fehler)
        </Badge>;
      default: 
        return <Badge className={`${isRunning ? 'animate-pulse' : ''} ${hasLongRunningSteps ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}`}>
          {hasLongRunningSteps ? '⚠️ Langsam' : '🔄 Läuft'} ({trace.completedSteps}/{trace.totalSteps})
        </Badge>;
    }
  };

  const formatDuration = (ms?: number): string => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const renderEventDetails = (event: TraceEvent) => {
    const hasInput = event.data?.input;
    const hasOutput = event.data?.output;
    const hasRequestPayload = event.data?.request_payload;
    const hasError = event.error_message;
    const hasGeneralData = Object.keys(event.data || {}).length > 0;

    return (
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="data" disabled={!hasGeneralData}>Daten</TabsTrigger>
          <TabsTrigger value="payload" disabled={!hasRequestPayload}>Request</TabsTrigger>
          <TabsTrigger value="raw">Raw JSON</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-3">
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Status</div>
              <div className="flex items-center gap-2">
                {getStatusIcon(event.status)}
                <span className="capitalize">{event.status}</span>
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Dauer</div>
              <div>{formatDuration(event.duration_ms)}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Zeitstempel</div>
              <div className="text-xs font-mono">{format(new Date(event.created_at), 'HH:mm:ss.SSS')}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Event ID</div>
              <div className="text-xs font-mono">{event.id.substring(0, 8)}...</div>
            </div>
          </div>

          {hasInput && (
            <div className="space-y-2">
              <div className="text-sm font-medium flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Input-Parameter
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <pre className="text-xs overflow-auto max-h-32">
                  {JSON.stringify(event.data.input, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {hasOutput && (
            <div className="space-y-2">
              <div className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Output-Daten
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <pre className="text-xs overflow-auto max-h-32">
                  {JSON.stringify(event.data.output, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {hasError && (
            <div className="space-y-2">
              <div className="text-sm font-medium flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-4 h-4" />
                Fehler-Details
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <div className="text-sm text-red-800 dark:text-red-300">
                  {event.error_message}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="data" className="space-y-3">
          <div className="p-3 bg-muted/30 rounded-lg">
            <pre className="text-xs overflow-auto max-h-64">
              {JSON.stringify(event.data, null, 2)}
            </pre>
          </div>
        </TabsContent>

        <TabsContent value="payload" className="space-y-3">
          {hasRequestPayload ? (
            <div className="space-y-3">
              <div className="text-sm font-medium">OpenAI Request Payload</div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <pre className="text-xs overflow-auto max-h-64">
                  {JSON.stringify(event.data.request_payload, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Keine Request-Daten verfügbar</div>
          )}
        </TabsContent>

        <TabsContent value="raw" className="space-y-3">
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => copyToClipboard(JSON.stringify(event, null, 2), 'Raw Event JSON')}
            >
              <Copy className="w-4 h-4 mr-1" />
              Kopieren
            </Button>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <pre className="text-xs overflow-auto max-h-64">
              {JSON.stringify(event, null, 2)}
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    );
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
      {/* Enhanced Test Message Sender */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5" />
            Pro Live Coach Pipeline Monitor
            <Badge variant="outline">Observability v2.0</Badge>
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
                  placeholder="z.B. Erstelle mir einen Trainingsplan für 3 Tage"
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
            <div className="text-sm text-muted-foreground flex items-center gap-4">
              <span>{traces.length} Traces</span>
              <span>{traces.filter(t => t.status === 'running').length} aktiv</span>
              <span>{traces.filter(t => t.status === 'error').length} Fehler</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchTraces}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Aktualisieren
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Live Traces with Accordion */}
      <ScrollArea className="h-[700px]">
        <div className="space-y-4">
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
                    {getTraceStatusBadge(trace)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {trace.totalDuration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(trace.totalDuration)}
                      </span>
                    )}
                    <span>{format(new Date(trace.startTime), 'HH:mm:ss')}</span>
                  </div>
                </div>
                {trace.messageId && (
                  <div className="text-xs text-muted-foreground">
                    Message: {trace.messageId}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <Accordion 
                  type="single" 
                  collapsible 
                  value={expandedTrace === trace.traceId ? 'steps' : undefined}
                  onValueChange={(value) => setExpandedTrace(value ? trace.traceId : null)}
                >
                  <AccordionItem value="steps">
                    <AccordionTrigger className="text-sm">
                      Pipeline Steps ({trace.events.length}) - Details anzeigen
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        {trace.events
                          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                          .map((event) => (
                          <Accordion key={event.id} type="single" collapsible>
                            <AccordionItem value={event.id}>
                              <AccordionTrigger className="py-2">
                                <div className="flex items-center gap-3 w-full">
                                  <div className="flex items-center gap-2">
                                    {getStepIcon(event.step)}
                                    <span className="text-sm font-medium">
                                      {STEP_NAMES[event.step] || event.step}
                                    </span>
                                    {getStatusIcon(event.status, trace.status === 'running')}
                                  </div>
                                  
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground ml-auto">
                                    {event.duration_ms && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDuration(event.duration_ms)}
                                      </span>
                                    )}
                                    <span>{format(new Date(event.created_at), 'HH:mm:ss.SSS')}</span>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="pl-6 pr-2">
                                  {renderEventDetails(event)}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Quick Overview ohne Aufklappen */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {trace.events.slice(0, 6).map((event) => (
                    <div 
                      key={event.id} 
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-muted/50"
                    >
                      {getStepIcon(event.step)}
                      <span>{STEP_NAMES[event.step] || event.step}</span>
                      {getStatusIcon(event.status, trace.status === 'running')}
                    </div>
                  ))}
                  {trace.events.length > 6 && (
                    <div className="text-xs text-muted-foreground px-2 py-1">
                      +{trace.events.length - 6} weitere
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {sortedTraces.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-muted-foreground">
                  Noch keine Trace-Events gefunden. Sende eine Test-Nachricht oben um die Pipeline live zu verfolgen!
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};