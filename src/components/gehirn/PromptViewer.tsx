import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { JsonPanel } from '@/components/gehirn/JsonPanel';
import { Copy, ExternalLink, Eye, Brain, User, Database, Lightbulb, AlertTriangle, Zap, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { safeStringify } from '@/utils/safeJsonHelpers';

export interface PromptData {
  traceId?: string;
  finalPrompt?: {
    system: string;
    user: string;
    full: string;
  };
  persona?: {
    coach_id: string;
    name: string;
    voice: string;
    style_rules: string[];
    specializations: string[];
  };
  injectedContext?: {
    user_profile: any;
    daily_context: any;
    conversation_memory: string;
    recent_summaries: string[];
  };
  ragSources?: Array<{
    content: string;
    score: number;
    title: string;
    source: string;
    chunk_index: number;
  }>;
  intentDetection?: {
    intent: string;
    confidence: number;
    slots: Record<string, any>;
    tool_candidates: string[];
  };
  toolResults?: Array<{
    tool_name: string;
    input: any;
    output: any;
    success: boolean;
  }>;
  telemetryData?: {
    firstToken_ms?: number;
    fullStream_ms?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    cost_usd?: number;
    model?: string;
  };
  llmResponse?: {
    raw_response: string;
    choices?: any[];
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };
  apiErrors?: Array<{
    type: 'rate_limit' | 'context_length' | 'invalid_request' | 'internal_error' | 'unknown';
    message: string;
    details?: any;
    timestamp?: number;
    retryAfter?: number;
  }>;
  performance?: {
    requestDuration?: number;
    firstTokenMs?: number;
    totalLatency?: number;
    tokenThroughput?: number;
    modelDowngrades?: string[];
    fallbackChain?: string[];
  };
  // Fallback data when TraceId doesn't exist in DB
  fallbackMetadata?: {
    coachId?: string;
    model?: string;
    pipeline?: string;
    fallback?: boolean;
    retryCount?: number;
    processingTime?: number;
    source?: 'v1' | 'v2' | 'debug' | 'orchestrator';
    downgraded?: boolean;
    error?: string;
    rawResponse?: any;
    apiErrors?: any[];
  };
}

interface PromptViewerProps {
  data: PromptData | null;
  onClose?: () => void;
  className?: string;
}

export function PromptViewer({ data, onClose, className }: PromptViewerProps) {
  const [activeTab, setActiveTab] = useState('prompt');

  // Handle no data case
  if (!data) {
    return (
      <Card className={`w-full h-full bg-background ${className}`}>
        <CardContent className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
              <p className="text-muted-foreground text-sm mb-4">
                This trace ID doesn't exist in the database or no debug data was provided.
              </p>
              {onClose && (
                <Button onClick={onClose} variant="outline">
                  Close
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const exportToPlayground = () => {
    if (!data.finalPrompt) return;
    
    const playgroundUrl = `https://platform.openai.com/playground?mode=chat&messages=%5B%7B%22role%22%3A%22system%22%2C%22content%22%3A%22${encodeURIComponent(data.finalPrompt.system)}%22%7D%2C%7B%22role%22%3A%22user%22%2C%22content%22%3A%22${encodeURIComponent(data.finalPrompt.user)}%22%7D%5D`;
    window.open(playgroundUrl, '_blank');
  };

  return (
    <Card className={`w-full h-full bg-background ${className}`}>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4 px-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            Prompt Analysis
          </CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {data.traceId ? (
              <>
                Trace ID: <code className="bg-muted px-1 py-0.5 rounded text-xs">{data.traceId}</code>
              </>
            ) : data.fallbackMetadata ? (
              "Using fallback metadata (no trace data in DB)"
            ) : (
              "Debug data from response"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {data.finalPrompt && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportToPlayground}
              className="gap-2 hidden sm:flex"
            >
              <ExternalLink className="h-4 w-4" />
              Playground
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="px-2">
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 h-[calc(100%-80px)] overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
          <div className="overflow-x-auto mb-4">
            <TabsList className="grid w-full grid-cols-4 sm:grid-cols-8 min-w-[600px] sm:min-w-0">
              <TabsTrigger value="prompt" className="gap-1 text-xs px-2 py-2">
                <Brain className="h-3 w-3" />
                <span className="hidden sm:inline">Prompt</span>
                <span className="sm:hidden">P</span>
              </TabsTrigger>
              <TabsTrigger value="persona" className="gap-1 text-xs px-2 py-2">
                <User className="h-3 w-3" />
                <span className="hidden sm:inline">Persona</span>
                <span className="sm:hidden">Pe</span>
              </TabsTrigger>
              <TabsTrigger value="context" className="gap-1 text-xs px-2 py-2">
                <Database className="h-3 w-3" />
                <span className="hidden sm:inline">Context</span>
                <span className="sm:hidden">C</span>
              </TabsTrigger>
              <TabsTrigger value="rag" className="gap-1 text-xs px-2 py-2">
                <Lightbulb className="h-3 w-3" />
                <span className="hidden sm:inline">RAG</span>
                <span className="sm:hidden">R</span>
              </TabsTrigger>
              <TabsTrigger value="intent" className="gap-1 text-xs px-2 py-2">
                <Brain className="h-3 w-3" />
                <span className="hidden sm:inline">Intent</span>
                <span className="sm:hidden">I</span>
              </TabsTrigger>
              <TabsTrigger value="response" className="gap-1 text-xs px-2 py-2">
                <ExternalLink className="h-3 w-3" />
                <span className="hidden sm:inline">Response</span>
                <span className="sm:hidden">Res</span>
              </TabsTrigger>
              <TabsTrigger value="errors" className="gap-1 text-xs px-2 py-2">
                <AlertTriangle className="h-3 w-3" />
                <span className="hidden sm:inline">Errors</span>
                <span className="sm:hidden">E</span>
              </TabsTrigger>
              <TabsTrigger value="performance" className="gap-1 text-xs px-2 py-2">
                <Activity className="h-3 w-3" />
                <span className="hidden sm:inline">Performance</span>
                <span className="sm:hidden">Perf</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="prompt" className="space-y-4 h-full mt-0" data-state={activeTab === 'prompt' ? 'active' : 'inactive'}>
              {data.finalPrompt ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-base sm:text-lg font-semibold">Complete Prompt Sent to LLM</h3>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => copyToClipboard(data.finalPrompt!.full, 'Full prompt')}
                      className="gap-2 w-full sm:w-auto"
                    >
                      <Copy className="h-4 w-4" />
                      Copy All
                    </Button>
                  </div>

                  <div className="grid gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-orange-600 text-sm sm:text-base">System Prompt</h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyToClipboard(data.finalPrompt!.system, 'System prompt')}
                          className="px-2"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <ScrollArea className="h-48 w-full rounded-md border p-3">
                        <pre className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                          {data.finalPrompt.system}
                        </pre>
                      </ScrollArea>
                    </div>

                    <Separator />

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-blue-600 text-sm sm:text-base">User Prompt</h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyToClipboard(data.finalPrompt!.user, 'User prompt')}
                          className="px-2"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <ScrollArea className="h-32 w-full rounded-md border p-3">
                        <pre className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                          {data.finalPrompt.user}
                        </pre>
                      </ScrollArea>
                    </div>
                  </div>

                  {(data.telemetryData || data.fallbackMetadata) && (
                    <div className="flex flex-wrap gap-2 pt-4">
                      {data.telemetryData?.prompt_tokens && (
                        <Badge variant="secondary" className="text-xs">
                          {data.telemetryData.prompt_tokens} prompt tokens
                        </Badge>
                      )}
                      {data.telemetryData?.completion_tokens && (
                        <Badge variant="secondary" className="text-xs">
                          {data.telemetryData.completion_tokens} completion tokens
                        </Badge>
                      )}
                      {data.telemetryData?.cost_usd && (
                        <Badge variant="secondary" className="text-xs">
                          ${data.telemetryData.cost_usd.toFixed(4)}
                        </Badge>
                      )}
                      {(data.telemetryData?.model || data.fallbackMetadata?.model) && (
                        <Badge variant="secondary" className="text-xs">
                          {data.telemetryData?.model || data.fallbackMetadata?.model}
                        </Badge>
                      )}
                      {data.fallbackMetadata?.processingTime && (
                        <Badge variant="secondary" className="text-xs">
                          {data.fallbackMetadata.processingTime}ms
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ) : data.fallbackMetadata ? (
                <div className="space-y-4">
                  <div className="text-center py-6">
                    <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <h3 className="text-lg font-semibold mb-2">No Prompt Data Available</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      This trace wasn't found in the database, but here's the available metadata:
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {data.fallbackMetadata.coachId && (
                        <Badge variant="outline">{data.fallbackMetadata.coachId}</Badge>
                      )}
                      {data.fallbackMetadata.model && (
                        <Badge variant="outline">{data.fallbackMetadata.model}</Badge>
                      )}
                      {data.fallbackMetadata.source && (
                        <Badge variant={data.fallbackMetadata.source === 'v1' ? 'destructive' : 'secondary'}>
                          {data.fallbackMetadata.source}
                        </Badge>
                      )}
                      {data.fallbackMetadata.fallback && (
                        <Badge variant="secondary">Fallback</Badge>
                      )}
                      {data.fallbackMetadata.downgraded && (
                        <Badge variant="secondary">Downgraded</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No prompt data available for this trace</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="persona" className="space-y-4 mt-0" data-state={activeTab === 'persona' ? 'active' : 'inactive'}>
            {data.persona ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Coach Info</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{data.persona.coach_id}</Badge>
                        <span className="text-sm font-medium">{data.persona.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Voice: <span className="font-medium">{data.persona.voice}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Specializations</h4>
                    <div className="flex flex-wrap gap-1">
                      {data.persona.specializations?.map((spec, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Style Rules</h4>
                  <ScrollArea className="h-32 w-full rounded-md border p-4">
                    <ul className="space-y-1 text-sm">
                      {data.persona.style_rules?.map((rule, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-muted-foreground">•</span>
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No persona data available for this trace
              </div>
            )}
          </TabsContent>

          <TabsContent value="context" className="space-y-4">
            {data.injectedContext ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">User Profile</h4>
                    <JsonPanel data={data.injectedContext.user_profile} maxHeight={200} />
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Daily Context</h4>
                    <JsonPanel data={data.injectedContext.daily_context} maxHeight={200} />
                  </div>
                </div>

                {data.injectedContext.conversation_memory && (
                  <div>
                    <h4 className="font-medium mb-2">Conversation Memory</h4>
                    <ScrollArea className="h-32 w-full rounded-md border p-4">
                      <pre className="text-sm leading-relaxed whitespace-pre-wrap">
                        {data.injectedContext.conversation_memory}
                      </pre>
                    </ScrollArea>
                  </div>
                )}

                {data.injectedContext.recent_summaries?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Recent Summaries</h4>
                    <div className="space-y-2">
                      {data.injectedContext.recent_summaries.map((summary, idx) => (
                        <div key={idx} className="text-sm p-2 bg-muted rounded">
                          {summary}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No context data available for this trace
              </div>
            )}
          </TabsContent>

          <TabsContent value="rag" className="space-y-4">
            {data.ragSources && data.ragSources.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Retrieved Knowledge Sources</h3>
                {data.ragSources.map((source, idx) => (
                  <Card key={idx} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{source.title}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{source.source}</span>
                          <span>•</span>
                          <span>Chunk {source.chunk_index}</span>
                        </div>
                      </div>
                      <Badge variant={source.score > 0.8 ? 'default' : source.score > 0.6 ? 'secondary' : 'outline'}>
                        {(source.score * 100).toFixed(1)}% match
                      </Badge>
                    </div>
                    <ScrollArea className="h-24 w-full">
                      <p className="text-sm leading-relaxed">
                        {source.content.substring(0, 300)}
                        {source.content.length > 300 && '...'}
                      </p>
                    </ScrollArea>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No RAG sources were used for this trace
              </div>
            )}
          </TabsContent>

          <TabsContent value="intent" className="space-y-4">
            {data.intentDetection || data.toolResults ? (
              <div className="space-y-6">
                {data.intentDetection && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Intent Detection</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Detected Intent</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="default">{data.intentDetection.intent}</Badge>
                          <Badge variant="outline">
                            {(data.intentDetection.confidence * 100).toFixed(1)}% confidence
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Tool Candidates</h4>
                        <div className="flex flex-wrap gap-1">
                          {data.intentDetection.tool_candidates?.map((tool, idx) => (
                            <Badge key={idx} variant="secondary">{tool}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    {Object.keys(data.intentDetection.slots).length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Extracted Slots</h4>
                        <JsonPanel data={data.intentDetection.slots} maxHeight={150} />
                      </div>
                    )}
                  </div>
                )}

                {data.toolResults && data.toolResults.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Tool Executions</h3>
                    <div className="space-y-3">
                      {data.toolResults.map((tool, idx) => (
                        <Card key={idx} className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{tool.tool_name}</h4>
                            <Badge variant={tool.success ? 'default' : 'destructive'}>
                              {tool.success ? 'Success' : 'Failed'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h5 className="text-sm font-medium mb-1">Input</h5>
                              <JsonPanel data={tool.input} maxHeight={100} />
                            </div>
                            <div>
                              <h5 className="text-sm font-medium mb-1">Output</h5>
                              <JsonPanel data={tool.output} maxHeight={100} />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No intent or tool data available for this trace
              </div>
            )}
          </TabsContent>

          <TabsContent value="response" className="space-y-4 mt-0" data-state={activeTab === 'response' ? 'active' : 'inactive'}>
            {data.llmResponse || data.fallbackMetadata?.rawResponse ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-base sm:text-lg font-semibold">Raw LLM Response</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => copyToClipboard(
                      data.llmResponse?.raw_response || safeStringify(data.fallbackMetadata?.rawResponse, 'No response data'), 
                      'LLM response'
                    )}
                    className="gap-2 w-full sm:w-auto"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Response
                  </Button>
                </div>

                <div>
                  <h4 className="font-medium mb-2 text-sm sm:text-base">Generated Content</h4>
                  <ScrollArea className="h-64 w-full rounded-md border p-3">
                    <pre className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                      {data.llmResponse?.raw_response || safeStringify(data.fallbackMetadata?.rawResponse, 'No response data available')}
                    </pre>
                  </ScrollArea>
                </div>

                {data.llmResponse?.usage && (
                  <div>
                    <h4 className="font-medium mb-2 text-sm sm:text-base">Token Usage</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {data.llmResponse.usage.prompt_tokens} prompt tokens
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {data.llmResponse.usage.completion_tokens} completion tokens
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {data.llmResponse.usage.total_tokens} total tokens
                      </Badge>
                    </div>
                  </div>
                )}

                {data.llmResponse?.choices && (
                  <div>
                    <h4 className="font-medium mb-2 text-sm sm:text-base">API Response Structure</h4>
                    <JsonPanel data={data.llmResponse.choices} maxHeight={200} />
                  </div>
                )}

                {data.fallbackMetadata?.rawResponse && !data.llmResponse && (
                  <div>
                    <h4 className="font-medium mb-2 text-sm sm:text-base">Fallback Response Data</h4>
                    <JsonPanel data={data.fallbackMetadata.rawResponse} maxHeight={200} />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ExternalLink className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No response data available for this trace</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="errors" className="space-y-4 mt-0" data-state={activeTab === 'errors' ? 'active' : 'inactive'}>
            {(data.apiErrors && data.apiErrors.length > 0) || (data.fallbackMetadata?.apiErrors && data.fallbackMetadata.apiErrors.length > 0) || data.fallbackMetadata?.error ? (
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-destructive">API Errors & Issues</h3>
                
                {/* Fallback error */}
                {data.fallbackMetadata?.error && (
                  <Card className="p-3 sm:p-4 border-destructive/20">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge variant="destructive" className="text-xs">SYSTEM ERROR</Badge>
                        </div>
                        <p className="text-xs sm:text-sm font-medium mb-2 break-words">{data.fallbackMetadata.error}</p>
                      </div>
                    </div>
                  </Card>
                )}

                {/* API Errors from trace data */}
                {data.apiErrors?.map((error, idx) => (
                  <Card key={`trace-${idx}`} className="p-3 sm:p-4 border-destructive/20">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge variant="destructive" className="text-xs">{error.type.replace('_', ' ').toUpperCase()}</Badge>
                          {error.timestamp && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(error.timestamp).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm font-medium mb-2 break-words">{error.message}</p>
                        {error.retryAfter && (
                          <div className="text-xs text-muted-foreground">
                            Retry after: {error.retryAfter}s
                          </div>
                        )}
                        {error.details && (
                          <div className="mt-2">
                            <JsonPanel data={error.details} maxHeight={100} />
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}

                {/* Fallback API Errors */}
                {data.fallbackMetadata?.apiErrors?.map((error, idx) => (
                  <Card key={`fallback-${idx}`} className="p-3 sm:p-4 border-destructive/20">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge variant="destructive" className="text-xs">API ERROR</Badge>
                        </div>
                        <div className="text-xs sm:text-sm">
                          <JsonPanel data={error} maxHeight={100} />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No API errors recorded for this trace</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="performance" className="space-y-4 mt-0" data-state={activeTab === 'performance' ? 'active' : 'inactive'}>
            {data.performance || data.telemetryData || data.fallbackMetadata?.processingTime ? (
              <div className="space-y-6">
                <h3 className="text-base sm:text-lg font-semibold">Performance Analysis</h3>
                
                {/* Performance Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {data.performance?.requestDuration && (
                    <div className="text-center p-2 sm:p-3 bg-muted rounded-lg">
                      <div className="text-lg sm:text-2xl font-bold text-primary">
                        {data.performance.requestDuration}ms
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Request Duration</div>
                    </div>
                  )}
                  {data.performance?.firstTokenMs && (
                    <div className="text-center p-2 sm:p-3 bg-muted rounded-lg">
                      <div className="text-lg sm:text-2xl font-bold text-primary">
                        {data.performance.firstTokenMs}ms
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground">First Token</div>
                    </div>
                  )}
                  {data.telemetryData?.firstToken_ms && (
                    <div className="text-center p-2 sm:p-3 bg-muted rounded-lg">
                      <div className="text-lg sm:text-2xl font-bold text-primary">
                        {data.telemetryData.firstToken_ms}ms
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground">First Token</div>
                    </div>
                  )}
                  {data.fallbackMetadata?.processingTime && (
                    <div className="text-center p-2 sm:p-3 bg-muted rounded-lg">
                      <div className="text-lg sm:text-2xl font-bold text-primary">
                        {data.fallbackMetadata.processingTime}ms
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Processing Time</div>
                    </div>
                  )}
                  {data.performance?.tokenThroughput && (
                    <div className="text-center p-2 sm:p-3 bg-muted rounded-lg">
                      <div className="text-lg sm:text-2xl font-bold text-primary">
                        {data.performance.tokenThroughput.toFixed(1)}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Tokens/sec</div>
                    </div>
                  )}
                </div>

                {/* Model Downgrade Chain */}
                {data.performance?.modelDowngrades && data.performance.modelDowngrades.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      Model Downgrade Chain
                    </h4>
                    <div className="flex items-center gap-2">
                      {data.performance.modelDowngrades.map((model, idx) => (
                        <React.Fragment key={idx}>
                          <Badge variant={idx === 0 ? "destructive" : "secondary"}>
                            {model}
                          </Badge>
                          {idx < data.performance!.modelDowngrades!.length - 1 && (
                            <span className="text-muted-foreground">→</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fallback Chain */}
                {data.performance?.fallbackChain && data.performance.fallbackChain.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Fallback Chain
                    </h4>
                    <div className="flex items-center gap-2">
                      {data.performance.fallbackChain.map((step, idx) => (
                        <React.Fragment key={idx}>
                          <Badge variant="outline">
                            {step}
                          </Badge>
                          {idx < data.performance!.fallbackChain!.length - 1 && (
                            <span className="text-muted-foreground">→</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cost Analysis */}
                {data.telemetryData?.cost_usd && (
                  <div className="p-4 bg-muted/20 rounded-lg">
                    <h4 className="font-medium mb-2">Cost Analysis</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>Total Cost: <span className="font-mono">${data.telemetryData.cost_usd.toFixed(6)}</span></div>
                      <div>Model: <span className="font-mono">{data.telemetryData.model}</span></div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No performance data available for this trace</p>
              </div>
            )}
          </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}