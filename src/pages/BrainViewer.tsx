import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, RefreshCw, ChevronLeft, Brain, MessageSquare, Code, Zap, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

type TraceListItem = {
  trace_id: string;
  user_id: string;
  coach_id: string;
  status: string;
  created_at: string;
  duration_ms: number | null;
  input_text: string | null;
  error: any;
};

type TraceDetail = {
  trace_id: string;
  user_id: string;
  coach_id: string;
  status: string;
  created_at: string;
  duration_ms: number | null;
  input_text: string | null;
  images: any;
  context: any;
  persona: any;
  rag_sources: any;
  system_prompt: string | null;
  complete_prompt: string | null;
  llm_input: any;
  llm_output: any;
  error: any;
};

type TraceStep = {
  id: number;
  trace_id: string;
  stage: string;
  ts: string;
  details: any;
};

export function BrainViewerPage() {
  const [traces, setTraces] = useState<TraceListItem[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<TraceDetail | null>(null);
  const [traceSteps, setTraceSteps] = useState<TraceStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const limit = 20;

  const fetchTraces = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-get-traces', {
        body: { 
          limit, 
          offset: page * limit,
          status: statusFilter || undefined
        }
      });

      if (error) {
        console.error('Error fetching traces:', error);
        return;
      }

      setTraces(data.traces || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTraceDetail = async (traceId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-get-traces', {
        body: { traceId }
      });

      if (error) {
        console.error('Error fetching trace detail:', error);
        return;
      }

      setSelectedTrace(data.trace);
      setTraceSteps(data.steps || []);
    } catch (err) {
      console.error('Fetch detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTraces();
  }, [page, statusFilter]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'default',
      failed: 'destructive',
      started: 'secondary',
      context_loaded: 'outline',
      prompt_built: 'outline',
      llm_called: 'secondary',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const formatJson = (obj: any) => {
    if (!obj) return 'null';
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  // Detail View
  if (selectedTrace) {
    return (
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => setSelectedTrace(null)}>
            <ChevronLeft className="h-4 w-4 mr-2" /> Zurück
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6" /> Trace Detail
            </h1>
            <p className="text-sm text-muted-foreground font-mono">{selectedTrace.trace_id}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => copyToClipboard(selectedTrace.trace_id)}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Status</p>
              <div className="flex items-center gap-2 mt-1">
                {getStatusIcon(selectedTrace.status)}
                {getStatusBadge(selectedTrace.status)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Erstellt</p>
              <p className="font-medium text-sm">
                {format(new Date(selectedTrace.created_at), 'dd.MM.yyyy HH:mm:ss', { locale: de })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Dauer</p>
              <p className="font-medium text-sm">
                {selectedTrace.duration_ms ? `${selectedTrace.duration_ms}ms` : '-'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Coach</p>
              <p className="font-medium text-sm">{selectedTrace.coach_id}</p>
            </CardContent>
          </Card>
        </div>

        {/* User Input */}
        {selectedTrace.input_text && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" /> User Input
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{selectedTrace.input_text}</p>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="system_prompt" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="system_prompt">System Prompt</TabsTrigger>
            <TabsTrigger value="llm_io">LLM I/O</TabsTrigger>
            <TabsTrigger value="context">Context</TabsTrigger>
            <TabsTrigger value="rag">RAG</TabsTrigger>
            <TabsTrigger value="steps">Steps ({traceSteps.length})</TabsTrigger>
            <TabsTrigger value="error">Error</TabsTrigger>
          </TabsList>

          <TabsContent value="system_prompt" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">System Prompt</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(selectedTrace.system_prompt || '')}>
                  <Copy className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <pre className="text-xs whitespace-pre-wrap bg-muted p-4 rounded-lg">
                    {selectedTrace.system_prompt || 'Kein System Prompt verfügbar'}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="llm_io" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">LLM Input</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(formatJson(selectedTrace.llm_input))}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <pre className="text-xs whitespace-pre-wrap bg-muted p-4 rounded-lg">
                      {formatJson(selectedTrace.llm_input)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">LLM Output</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(formatJson(selectedTrace.llm_output))}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <pre className="text-xs whitespace-pre-wrap bg-muted p-4 rounded-lg">
                      {formatJson(selectedTrace.llm_output)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="context" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Context</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <pre className="text-xs whitespace-pre-wrap bg-muted p-4 rounded-lg">
                      {formatJson(selectedTrace.context)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Persona</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <pre className="text-xs whitespace-pre-wrap bg-muted p-4 rounded-lg">
                      {formatJson(selectedTrace.persona)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="rag" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">RAG Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <pre className="text-xs whitespace-pre-wrap bg-muted p-4 rounded-lg">
                    {formatJson(selectedTrace.rag_sources)}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="steps" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5" /> Trace Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                {traceSteps.length === 0 ? (
                  <p className="text-muted-foreground">Keine Steps vorhanden</p>
                ) : (
                  <div className="space-y-2">
                    {traceSteps.map((step, idx) => (
                      <div key={step.id || idx} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{step.stage}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(step.ts), 'HH:mm:ss.SSS')}
                          </span>
                        </div>
                        {step.details && (
                          <pre className="text-xs whitespace-pre-wrap bg-muted p-2 rounded">
                            {formatJson(step.details)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="error" className="mt-4">
            <Card className={selectedTrace.error ? 'border-red-500' : ''}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className={`h-5 w-5 ${selectedTrace.error ? 'text-red-500' : 'text-muted-foreground'}`} />
                  Error
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedTrace.error ? (
                  <pre className="text-xs whitespace-pre-wrap bg-red-50 dark:bg-red-950 p-4 rounded-lg text-red-900 dark:text-red-100">
                    {formatJson(selectedTrace.error)}
                  </pre>
                ) : (
                  <p className="text-muted-foreground">Keine Fehler</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // List View
  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6" /> ARES Brain Viewer
        </h1>
        <Button onClick={fetchTraces} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Alle Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="started">Started</SelectItem>
                <SelectItem value="context_loaded">Context Loaded</SelectItem>
                <SelectItem value="prompt_built">Prompt Built</SelectItem>
                <SelectItem value="llm_called">LLM Called</SelectItem>
              </SelectContent>
            </Select>
            <Input 
              placeholder="Suchen..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Traces List */}
      <Card>
        <CardContent className="pt-4">
          {loading && traces.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : traces.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Keine Traces gefunden</p>
          ) : (
            <div className="space-y-2">
              {traces
                .filter(t => !searchQuery || 
                  t.trace_id.includes(searchQuery) || 
                  t.input_text?.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((trace) => (
                <div
                  key={trace.trace_id}
                  className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => fetchTraceDetail(trace.trace_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(trace.status)}
                      <div>
                        <p className="font-mono text-sm">{trace.trace_id.slice(0, 20)}...</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(trace.created_at), 'dd.MM.yyyy HH:mm:ss', { locale: de })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {trace.duration_ms && (
                        <span className="text-sm text-muted-foreground">{trace.duration_ms}ms</span>
                      )}
                      {getStatusBadge(trace.status)}
                    </div>
                  </div>
                  {trace.input_text && (
                    <p className="text-sm text-muted-foreground mt-2 truncate">
                      {trace.input_text.slice(0, 100)}...
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Zeige {page * limit + 1}-{Math.min((page + 1) * limit, total)} von {total}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  Zurück
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={(page + 1) * limit >= total}
                  onClick={() => setPage(p => p + 1)}
                >
                  Weiter
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default BrainViewerPage;
