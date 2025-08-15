import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { JsonPanel } from '@/components/gehirn/JsonPanel';
import { Copy, ExternalLink, Eye, Brain, User, Database, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

export interface PromptData {
  traceId: string;
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
}

interface PromptViewerProps {
  data: PromptData;
  onClose?: () => void;
}

export function PromptViewer({ data, onClose }: PromptViewerProps) {
  const [activeTab, setActiveTab] = useState('prompt');

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
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Prompt Analysis
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Trace ID: <code className="bg-muted px-1 py-0.5 rounded text-xs">{data.traceId}</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data.finalPrompt && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportToPlayground}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Playground
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="prompt" className="gap-2">
              <Brain className="h-4 w-4" />
              Final Prompt
            </TabsTrigger>
            <TabsTrigger value="persona" className="gap-2">
              <User className="h-4 w-4" />
              Persona
            </TabsTrigger>
            <TabsTrigger value="context" className="gap-2">
              <Database className="h-4 w-4" />
              Context
            </TabsTrigger>
            <TabsTrigger value="rag" className="gap-2">
              <Lightbulb className="h-4 w-4" />
              RAG Sources
            </TabsTrigger>
            <TabsTrigger value="intent" className="gap-2">
              <Brain className="h-4 w-4" />
              Intent & Tools
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prompt" className="space-y-4">
            {data.finalPrompt ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Complete Prompt Sent to LLM</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => copyToClipboard(data.finalPrompt!.full, 'Full prompt')}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy All
                  </Button>
                </div>

                <div className="grid gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-orange-600">System Prompt</h4>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(data.finalPrompt!.system, 'System prompt')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <ScrollArea className="h-48 w-full rounded-md border p-4">
                      <pre className="text-sm leading-relaxed whitespace-pre-wrap">
                        {data.finalPrompt.system}
                      </pre>
                    </ScrollArea>
                  </div>

                  <Separator />

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-blue-600">User Prompt</h4>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(data.finalPrompt!.user, 'User prompt')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <ScrollArea className="h-32 w-full rounded-md border p-4">
                      <pre className="text-sm leading-relaxed whitespace-pre-wrap">
                        {data.finalPrompt.user}
                      </pre>
                    </ScrollArea>
                  </div>
                </div>

                {data.telemetryData && (
                  <div className="flex flex-wrap gap-2 pt-4">
                    <Badge variant="secondary">
                      {data.telemetryData.prompt_tokens} prompt tokens
                    </Badge>
                    <Badge variant="secondary">
                      {data.telemetryData.completion_tokens} completion tokens
                    </Badge>
                    {data.telemetryData.cost_usd && (
                      <Badge variant="secondary">
                        ${data.telemetryData.cost_usd.toFixed(4)}
                      </Badge>
                    )}
                    {data.telemetryData.model && (
                      <Badge variant="secondary">
                        {data.telemetryData.model}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No prompt data available for this trace
              </div>
            )}
          </TabsContent>

          <TabsContent value="persona" className="space-y-4">
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
        </Tabs>
      </CardContent>
    </Card>
  );
}