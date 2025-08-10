import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import MermaidChart from '@/components/MermaidChart';
import TraceGantt from '@/components/TraceGantt';
import { TelemetryDashboard } from '@/components/TelemetryDashboard';
import { AlertCircle, Clock, CheckCircle, XCircle, BarChart3 } from 'lucide-react';

interface TraceEvent {
  id: number;
  trace_id: string;
  ts: string;
  stage: string;
  data: any;
}

export default function TraceDebug() {
  const { traceId } = useParams();
  const [inputTraceId, setInputTraceId] = useState(traceId || '');
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TraceEvent | null>(null);
  const [activeTab, setActiveTab] = useState<'trace' | 'telemetry'>('trace');

  const fetchTrace = async (id: string) => {
    if (!id.trim()) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('coach_traces')
        .select('*')
        .eq('trace_id', id)
        .order('ts', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching trace:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (traceId) {
      fetchTrace(traceId);
    }
  }, [traceId]);

  const generateMermaidChart = () => {
    if (events.length === 0) return '';

    const stageColors: { [key: string]: string } = {
      A_received: 'blue',
      B_context_ready: 'yellow', 
      C_openai_call: 'orange',
      D_delta: 'purple',
      E_error: 'red',
      F_streaming_done: 'green',
      F_response_ready: 'green',
      G_complete: 'darkgreen'
    };

    const nodes = events.map((event, i) => {
      const color = stageColors[event.stage] || 'gray';
      const hasError = event.stage.includes('error') || event.data?.error;
      const nodeColor = hasError ? 'red' : color;
      return `    ${event.stage}${i}["${event.stage}"]:::${nodeColor}`;
    });

    const links = events.slice(1).map((_, i) => {
      const current = events[i];
      const next = events[i + 1];
      return `    ${current.stage}${i} --> ${next.stage}${i + 1}`;
    });

    const classDefinitions = [
      'classDef blue fill:#3b82f6,stroke:#1d4ed8,color:#fff',
      'classDef yellow fill:#eab308,stroke:#ca8a04,color:#000',
      'classDef orange fill:#f97316,stroke:#ea580c,color:#fff',
      'classDef purple fill:#a855f7,stroke:#9333ea,color:#fff',
      'classDef green fill:#22c55e,stroke:#16a34a,color:#fff',
      'classDef darkgreen fill:#15803d,stroke:#166534,color:#fff',
      'classDef red fill:#ef4444,stroke:#dc2626,color:#fff',
      'classDef gray fill:#6b7280,stroke:#4b5563,color:#fff'
    ];

    return `graph TD\n${nodes.join('\n')}\n${links.join('\n')}\n\n${classDefinitions.join('\n')}`;
  };

  const getStageIcon = (stage: string) => {
    if (stage.includes('error')) return <XCircle className="h-4 w-4 text-destructive" />;
    if (stage.includes('complete') || stage.includes('done')) return <CheckCircle className="h-4 w-4 text-success" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const getStageVariant = (stage: string) => {
    if (stage.includes('error')) return 'destructive';
    if (stage.includes('complete') || stage.includes('done')) return 'default';
    return 'secondary';
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Request Trace Debug & Telemetry
            </div>
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'trace' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('trace')}
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Trace
              </Button>
              <Button
                variant={activeTab === 'telemetry' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('telemetry')}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Telemetry
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            {activeTab === 'trace' 
              ? 'Visualize and debug the complete journey of a coach request'
              : 'Real-time performance metrics and health monitoring'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeTab === 'trace' && (
            <div className="flex gap-4">
              <Input
                placeholder="Enter trace ID (e.g. t_abc123def)"
                value={inputTraceId}
                onChange={(e) => setInputTraceId(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={() => fetchTrace(inputTraceId)}
                disabled={loading || !inputTraceId.trim()}
              >
                {loading ? 'Loading...' : 'Load Trace'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {activeTab === 'telemetry' && <TelemetryDashboard />}

      {activeTab === 'trace' && events.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Gantt Timeline</CardTitle>
              <CardDescription>
                Performance breakdown by stage with timing visualization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TraceGantt events={events} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Flow Visualization</CardTitle>
              <CardDescription>
                Request flow from A (received) to G (complete)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-card rounded-lg p-4 border">
                <MermaidChart 
                  chart={generateMermaidChart()} 
                  className="w-full overflow-auto"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
                <CardDescription>
                  Chronological list of trace events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {events.map((event, i) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedEvent(event)}
                    >
                      {getStageIcon(event.stage)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={getStageVariant(event.stage)}>
                            {event.stage}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(event.ts).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
                <CardDescription>
                  {selectedEvent ? `Stage: ${selectedEvent.stage}` : 'Click an event to see details'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedEvent ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Timestamp</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(selectedEvent.ts).toLocaleString()}
                      </p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="font-medium mb-2">Event Data</h4>
                      <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
                        {JSON.stringify(selectedEvent.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Select an event from the timeline to view its details
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {activeTab === 'trace' && events.length === 0 && !loading && inputTraceId && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No trace events found for ID: {inputTraceId}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}