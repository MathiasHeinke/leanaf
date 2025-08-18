import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Bug, Terminal, Database, Clock, X, RefreshCw } from 'lucide-react';
import { UserChatDebugger } from '@/components/debug/UserChatDebugger';
import { RequestInspector } from '@/components/debug/RequestInspector';
import { useTraceFeed } from '@/hooks/useTraceFeed';
import { TraceBundle } from '@/lib/traceTypes';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import type { DebugStep } from '@/components/debug/UserChatDebugger';
import { useAuth } from '@/hooks/useAuth';

interface AresChatDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  debugSteps: DebugStep[];
  lastRequest: any | null;
  lastResponse: any | null;
  onClearSteps: () => void;
}

export function AresChatDebugPanel({ 
  isOpen, 
  onClose, 
  debugSteps, 
  lastRequest, 
  lastResponse, 
  onClearSteps 
}: AresChatDebugPanelProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('steps');
  
  // Trace feed for live updates
  const { bundles, isLoading: tracesLoading, refresh: refreshTraces } = useTraceFeed({
    userId: user?.id,
    limit: 20
  });

  const [selectedTrace, setSelectedTrace] = useState<TraceBundle | null>(null);

  useEffect(() => {
    if (isOpen) {
      refreshTraces();
    }
  }, [isOpen, refreshTraces]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl h-[90vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-red-500" />
            <CardTitle>ARES Debug Console</CardTitle>
            <Badge variant="secondary" className="text-xs">
              Live Debug Mode
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClearSteps}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Clear
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="steps" className="gap-2">
                <Terminal className="h-4 w-4" />
                Live Steps ({debugSteps.length})
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-2">
                <Database className="h-4 w-4" />
                Request Inspector
              </TabsTrigger>
              <TabsTrigger value="traces" className="gap-2">
                <Clock className="h-4 w-4" />
                Trace Overview ({bundles.length})
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="steps" className="h-full">
                <UserChatDebugger 
                  steps={debugSteps} 
                  isVisible={true}
                  onToggle={() => {}}
                  onClear={onClearSteps}
                />
              </TabsContent>

              <TabsContent value="requests" className="h-full">
                <RequestInspector request={lastRequest} response={lastResponse} />
              </TabsContent>

              <TabsContent value="traces" className="h-full overflow-hidden">
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Recent Traces</h3>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={refreshTraces}
                      disabled={tracesLoading}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      {tracesLoading ? 'Loading...' : 'Refresh'}
                    </Button>
                  </div>

                  <div className="flex-1 overflow-hidden flex gap-4">
                    {/* Trace List */}
                    <div className="w-1/3">
                      <ScrollArea className="h-full">
                        <div className="space-y-2">
                          {bundles.map((bundle) => (
                            <Card 
                              key={bundle.traceId}
                              className={`p-3 cursor-pointer transition-colors hover:bg-muted ${
                                selectedTrace?.traceId === bundle.traceId ? 'ring-2 ring-primary' : ''
                              }`}
                              onClick={() => setSelectedTrace(bundle)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                   <div className="flex items-center gap-2 mb-1">
                                    <Badge 
                                      variant={bundle.agg.status === 'green' ? 'default' : 
                                               bundle.agg.status === 'red' ? 'destructive' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {bundle.agg.status}
                                    </Badge>
                                    {bundle.agg.hasError && (
                                      <Badge variant="destructive" className="text-xs">
                                        Error
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm font-medium truncate">
                                    {bundle.traceId.slice(-8)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(bundle.startedAt, { addSuffix: true, locale: de })}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {bundle.agg.maxLatencyMs}ms max
                                  </div>
                                </div>
                              </div>
                            </Card>
                          ))}
                          {bundles.length === 0 && !tracesLoading && (
                            <div className="text-center py-8 text-muted-foreground">
                              No traces available
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Trace Detail */}
                    <div className="flex-1">
                      {selectedTrace ? (
                        <Card className="h-full">
                          <CardHeader>
                            <CardTitle className="text-lg">
                              Trace {selectedTrace.traceId.slice(-8)}
                            </CardTitle>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>Coach: {selectedTrace.coachId}</span>
                              <Separator orientation="vertical" className="h-4" />
                              <span>User: {selectedTrace.userId?.slice(-8)}</span>
                              <Separator orientation="vertical" className="h-4" />
                              <span>{selectedTrace.stages.length} stages</span>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="h-[400px]">
                              <div className="space-y-3">
                                {selectedTrace.stages.map((stage, idx) => (
                                  <div key={idx} className="flex items-start gap-3 p-3 bg-muted/30 rounded">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                      <span className="text-xs font-medium">{idx + 1}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-sm">{stage.stage}</span>
                                        {stage.handler && (
                                          <Badge variant="outline" className="text-xs">
                                            {stage.handler}
                                          </Badge>
                                        )}
                                        <Badge 
                                          variant={stage.status === 'OK' ? 'default' : 
                                                   stage.status === 'ERROR' ? 'destructive' : 'secondary'}
                                          className="text-xs"
                                        >
                                          {stage.status}
                                        </Badge>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {stage.latency_ms}ms • {formatDistanceToNow(stage.at, { addSuffix: true, locale: de })}
                                      </div>
                                      {stage.row.error_message && (
                                        <div className="text-xs text-red-600 mt-1 p-2 bg-red-50 rounded">
                                          {stage.row.error_message}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Select a trace to view details</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}