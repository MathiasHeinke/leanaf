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
  stage: string;
  data: Record<string, any>;
  ts: string;
}

interface GroupedTrace {
  traceId: string;
  events: TraceEvent[];
  startTime: string;
  status: 'running' | 'completed' | 'error';
  totalSteps: number;
  completedSteps: number;
  errorSteps: number;
  userMessage?: string;
  coachResponse?: string;
  fullPrompt?: string;
  ragContext?: string;
  contextData?: {
    sources: string[];
    size: number;
    coach_data?: any;
    profile_accessed?: boolean;
    meal_data_accessed?: boolean;
  };
  performanceGrade?: 'A' | 'B' | 'C' | 'D' | 'F';
  responsePreview?: string;
  ragHitRate?: number;
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
  // Enhanced telemetry stages
  'T_request_start': 'Anfrage Start',
  'T_context_built': 'Kontext aufgebaut',
  'T_prompt_analysis': 'Prompt Analyse',
  'T_openai_request': 'OpenAI Anfrage',
  'T_first_token': 'Erstes Token',
  'T_stream_complete': 'Stream abgeschlossen',
  'T_completion': 'Vervollständigung',
  'E_error': 'Fehler aufgetreten',
  'E_rag_search': 'RAG Suche',
  // Legacy stages
  'A_received': 'Anfrage erhalten',
  'B_context_ready': 'Kontext bereit',
  'C_openai_call': 'OpenAI Aufruf',
  'D_delta': 'Streaming',
  'F_response_ready': 'Antwort bereit',
  'F_streaming_done': 'Streaming beendet',
  'G_complete': 'Abgeschlossen',
  'token_budget_check': 'Token Budget Check',
  'test_write': 'Test Schreibvorgang'
};

const STATUS_COLORS = {
  started: 'text-blue-500',
  progress: 'text-yellow-500', 
  complete: 'text-green-500',
  error: 'text-red-500'
};

const PRIORITY_STEPS = [
  'T_request_start', 'T_context_built', 'T_prompt_analysis',
  'T_openai_request', 'T_first_token', 'T_stream_complete', 'T_completion',
  'A_received', 'B_context_ready', 'C_openai_call', 
  'D_delta', 'F_response_ready', 'G_complete', 'E_error'
];

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
        .from('coach_traces')
        .select('*')
        .order('ts', { ascending: false })
        .limit(300);

      if (error) throw error;

      // Group events by trace_id
      const traceMap = new Map<string, TraceEvent[]>();
      
      data?.forEach((event: any) => {
        if (!traceMap.has(event.trace_id)) {
          traceMap.set(event.trace_id, []);
        }
        traceMap.get(event.trace_id)!.push(event);
      });

      // Convert to GroupedTrace
      const groupedTraces = new Map<string, GroupedTrace>();
      
      traceMap.forEach((events, traceId) => {
        events.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
        
        const firstEvent = events[0];
        const errorSteps = events.filter(e => e.stage.startsWith('E_')).length;
        const completedSteps = events.filter(e => e.stage === 'T_completion' || e.stage === 'T_stream_complete').length;
        const hasCompleteStep = events.some(e => e.stage === 'T_completion' || e.stage === 'T_stream_complete');
        
        // Determine overall trace status
        let traceStatus: 'running' | 'completed' | 'error' = 'running';
        if (errorSteps > 0) {
          traceStatus = 'error';
        } else if (hasCompleteStep) {
          traceStatus = 'completed';
        }
        
        // Extract content for easy viewing from both naming conventions
        const requestEvent = events.find(e => e.stage === 'T_request_start' || e.stage === 'A_received');
        const contextEvent = events.find(e => e.stage === 'T_context_built' || e.stage === 'B_context_ready');
        const promptEvent = events.find(e => e.stage === 'T_prompt_analysis');
        const completionEvent = events.find(e => e.stage === 'T_completion' || e.stage === 'T_stream_complete' || e.stage === 'G_complete');
        const ragEvent = events.find(e => e.stage === 'E_rag_search');

        // Extract user message from various possible locations
        const userMessage = requestEvent?.data?.user_message || 
                          requestEvent?.data?.message ||
                          promptEvent?.data?.user_message ||
                          events.find(e => e.data?.user_message)?.data?.user_message;

        // Extract coach response from various possible locations
        const coachResponse = completionEvent?.data?.coach_response || 
                            completionEvent?.data?.response_preview ||
                            completionEvent?.data?.content ||
                            events.find(e => e.data?.coach_response)?.data?.coach_response;

        // Extract full prompt from various possible locations
        const fullPrompt = promptEvent?.data?.full_prompt_preview || 
                         contextEvent?.data?.openai_request_body ||
                         contextEvent?.data?.system_message ||
                         events.find(e => e.data?.full_prompt_preview)?.data?.full_prompt_preview;

         // Extract context data - use actual DB structure
        const contextData = contextEvent?.data ? {
          sources: contextEvent.data.context_source ? [
            contextEvent.data.context_source === 'coaches_table' ? 'Coach-Daten' : contextEvent.data.context_source
          ] : [],
          size: contextEvent.data.context_size || 0,
          coach_data: contextEvent.data.coach_data,
          profile_accessed: !!contextEvent.data.context_source,
          meal_data_accessed: false
        } : undefined;

        // Calculate performance grade
        const firstTokenTime = events.find(e => e.stage === 'T_first_token')?.data?.firstToken_ms;
        const totalTime = completionEvent?.data?.fullStream_ms || completionEvent?.data?.duration_ms;
        let performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
        if (firstTokenTime && totalTime) {
          if (firstTokenTime < 1000 && totalTime < 5000) performanceGrade = 'A';
          else if (firstTokenTime < 2000 && totalTime < 10000) performanceGrade = 'B';
          else if (firstTokenTime < 3000 && totalTime < 15000) performanceGrade = 'C';
          else if (firstTokenTime < 5000 && totalTime < 20000) performanceGrade = 'D';
        }

        // Create response preview
        const responsePreview = coachResponse ? 
          coachResponse.length > 100 ? coachResponse.substring(0, 100) + '...' : coachResponse 
          : undefined;

        groupedTraces.set(traceId, {
          traceId,
          events,
          startTime: firstEvent.ts,
          status: traceStatus,
          totalSteps: events.length,
          completedSteps: completedSteps,
          errorSteps: errorSteps,
          userMessage,
          coachResponse,
          fullPrompt,
          ragContext: ragEvent?.data?.context_length ? `${ragEvent.data.results_count} results, ${ragEvent.data.context_length} chars` : undefined,
          contextData,
          performanceGrade,
          responsePreview,
          ragHitRate: ragEvent?.data?.rag_hit_rate
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
      .channel('coach_traces_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'coach_traces'
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

      // Call the streaming coach engine for live telemetry
      const response = await supabase.functions.invoke('streaming-coach-engine', {
        body: {
          userId: 'test-user-admin',
          coachId: selectedCoach,
          message: testMessage,
          conversationHistory: []
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

  const getStatusIcon = (stage: string, isRunning?: boolean) => {
    if (stage.startsWith('E_')) return <XCircle className="w-4 h-4 text-red-500" />;
    if (stage === 'T_completion' || stage === 'T_stream_complete') return <CheckCircle className="w-4 h-4 text-green-500" />;
    return isRunning ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin" /> : <Clock className="w-4 h-4 text-blue-500" />;
  };

  const getTraceStatusBadge = (trace: GroupedTrace) => {
    const isRunning = trace.status === 'running';
    const hasLongRunningSteps = trace.events.some(e => 
      !e.stage.startsWith('E_') && !(e.stage === 'T_completion' || e.stage === 'T_stream_complete') && 
      Date.now() - new Date(e.ts).getTime() > 10000
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
    const hasRequestPayload = event.data?.openai_request_body || event.data?.request_payload;
    const hasError = event.stage.startsWith('E_') || event.data?.error_message;
    const hasGeneralData = Object.keys(event.data || {}).length > 0;
    const hasContextData = event.stage === 'T_context_built' && event.data;
    const hasCoachResponse = event.stage === 'T_stream_complete' && event.data?.coach_response;

    return (
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="response" disabled={!hasCoachResponse}>Antwort</TabsTrigger>
          <TabsTrigger value="context" disabled={!hasContextData}>Kontext</TabsTrigger>
          <TabsTrigger value="data" disabled={!hasGeneralData}>Daten</TabsTrigger>
          <TabsTrigger value="raw">Raw JSON</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-3">
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Status</div>
              <div className="flex items-center gap-2">
                {getStatusIcon(event.stage)}
                <span className="capitalize">{event.stage.startsWith('E_') ? 'Error' : event.stage.startsWith('T_') ? 'Complete' : 'Running'}</span>
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Dauer</div>
              <div>{formatDuration(event.data?.duration_ms || event.data?.firstToken_ms || event.data?.fullStream_ms)}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Zeitstempel</div>
              <div className="text-xs font-mono">{format(new Date(event.ts), 'HH:mm:ss.SSS')}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Event ID</div>
              <div className="text-xs font-mono">{String(event.id).substring(0, 8)}...</div>
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
                  {event.data?.error_message || event.data?.error || 'Error stage detected'}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="response" className="space-y-3">
          {hasCoachResponse ? (
            <div className="space-y-3">
              <div className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Coach Antwort
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => copyToClipboard(event.data.coach_response, 'Coach Antwort')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {event.data.coach_response}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="font-medium">Tokens:</span> {event.data.completion_tokens || '—'}
                </div>
                <div>
                  <span className="font-medium">Kosten:</span> ${(event.data.cost_usd || 0).toFixed(4)}
                </div>
                <div>
                  <span className="font-medium">Dauer:</span> {formatDuration(event.data.fullStream_ms)}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Keine Coach-Antwort verfügbar</div>
          )}
        </TabsContent>

        <TabsContent value="context" className="space-y-3">
          {hasContextData ? (
            <div className="space-y-3">
              <div className="text-sm font-medium flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Kontext & Datenquellen
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">Datenquellen</div>
                  <div className="space-y-1">
                    {event.data.user_profile && (
                      <Badge variant="secondary" className="text-xs">
                        <Database className="w-3 h-3 mr-1" />
                        User Profile
                      </Badge>
                    )}
                    {event.data.meal_data && (
                      <Badge variant="secondary" className="text-xs">
                        <Database className="w-3 h-3 mr-1" />
                        Meal Data
                      </Badge>
                    )}
                    {event.data.coach_data && (
                      <Badge variant="secondary" className="text-xs">
                        <Database className="w-3 h-3 mr-1" />
                        Coach Data
                      </Badge>
                    )}
                    {event.data.context_source && (
                      <Badge variant="secondary" className="text-xs">
                        <Brain className="w-3 h-3 mr-1" />
                        {event.data.context_source}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">Kontext Stats</div>
                  <div className="space-y-1 text-xs">
                    <div>Größe: {event.data.context_size || '—'} Zeichen</div>
                    <div>Coach: {event.data.coach_id || '—'}</div>
                    <div>User ID: {event.data.user_id || '—'}</div>
                  </div>
                </div>
              </div>

              {event.data.context_preview && (
                <div>
                  <div className="text-xs font-medium mb-2">Kontext Vorschau</div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <pre className="text-xs overflow-auto max-h-32">
                      {event.data.context_preview}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Keine Kontext-Daten verfügbar</div>
          )}
        </TabsContent>

        <TabsContent value="data" className="space-y-3">
          <div className="p-3 bg-muted/30 rounded-lg">
            <pre className="text-xs overflow-auto max-h-64">
              {JSON.stringify(event.data, null, 2)}
            </pre>
          </div>
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-semibold">
                        {trace.traceId === currentTraceId && '🎯 '}
                        {trace.traceId.substring(0, 12)}...
                      </div>
                      {getTraceStatusBadge(trace)}
                      {trace.performanceGrade && (
                        <Badge variant={trace.performanceGrade === 'A' ? 'default' : trace.performanceGrade === 'B' ? 'secondary' : 'destructive'} className="text-xs">
                          Grade {trace.performanceGrade}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(trace.startTime), 'HH:mm:ss')}
                    </div>
                  </div>

                  {/* Enhanced Key Insights Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Request Summary</div>
                      <div className="text-xs font-mono truncate">
                        {trace.userMessage || 'Nicht verfügbar'}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Response Preview</div>
                      <div className="text-xs truncate">
                        {trace.responsePreview || 'Noch nicht verfügbar'}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Datenquellen</div>
                      <div className="flex gap-1 flex-wrap">
                        {trace.contextData?.profile_accessed && (
                          <Badge variant="outline" className="text-xs h-5">
                            Profile
                          </Badge>
                        )}
                        {trace.contextData?.meal_data_accessed && (
                          <Badge variant="outline" className="text-xs h-5">
                            Meals
                          </Badge>
                        )}
                        {trace.ragContext && (
                          <Badge variant="outline" className="text-xs h-5">
                            RAG
                          </Badge>
                        )}
                        {!trace.contextData?.profile_accessed && !trace.contextData?.meal_data_accessed && !trace.ragContext && (
                          <span className="text-xs text-muted-foreground">Keine</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Pipeline Progress</div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {PRIORITY_STEPS.slice(0, 8).map(step => {
                            const hasStep = trace.events.some(e => e.stage === step);
                            return (
                              <div
                                key={step}
                                className={`w-2 h-2 rounded-full ${
                                  hasStep 
                                    ? step.startsWith('E_') 
                                      ? 'bg-red-500' 
                                      : 'bg-green-500'
                                    : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                                title={STEP_NAMES[step] || step}
                              />
                            );
                          })}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {trace.completedSteps}/{trace.totalSteps}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
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
                          .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
                          .map((event) => (
                          <Accordion key={event.id} type="single" collapsible>
                            <AccordionItem value={event.id}>
                              <AccordionTrigger className="py-2">
                                <div className="flex items-center gap-3 w-full">
                                  <div className="flex items-center gap-2">
                                    {getStepIcon(event.stage)}
                                    <span className="text-sm font-medium">
                                      {STEP_NAMES[event.stage] || event.stage}
                                    </span>
                                    {getStatusIcon(event.stage, trace.status === 'running')}
                                  </div>
                                  
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground ml-auto">
                                    {(event.data?.duration_ms || event.data?.firstToken_ms || event.data?.fullStream_ms) && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDuration(event.data?.duration_ms || event.data?.firstToken_ms || event.data?.fullStream_ms)}
                                      </span>
                                    )}
                                    <span>{format(new Date(event.ts), 'HH:mm:ss.SSS')}</span>
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
                      {getStepIcon(event.stage)}
                      <span>{STEP_NAMES[event.stage] || event.stage}</span>
                      {getStatusIcon(event.stage, trace.status === 'running')}
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