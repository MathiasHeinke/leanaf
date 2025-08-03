import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { 
  Loader2, 
  Zap, 
  MessageSquare, 
  TestTube, 
  Play, 
  Settings, 
  Activity,
  Cpu,
  Database,
  Brain,
  Clock,
  AlertCircle,
  CheckCircle,
  Radio
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDebugChat } from '@/hooks/useDebugChat';
import { useRobustStreamingChat } from '@/hooks/useRobustStreamingChat';

type EngineType = 'direct' | 'unified' | 'streaming';
type PipelineStage = 'idle' | 'context' | 'memory' | 'rag' | 'openai' | 'streaming' | 'completing' | 'complete' | 'error';

interface ContextConfig {
  enableRAG: boolean;
  enableMemory: boolean;
  enableDailySummary: boolean;
  enableConversationHistory: boolean;
  minimalMode: boolean;
}

interface StreamingConfig {
  enableStreaming: boolean;
  showSSEEvents: boolean;
  timeout: number;
}

interface PipelineStatus {
  stage: PipelineStage;
  progress: number;
  message: string;
  startTime?: number;
  stageStartTime?: number;
}

const EnhancedPipelineDebugger = () => {
  const [message, setMessage] = useState('Wie geht es mir heute?');
  const [selectedEngine, setSelectedEngine] = useState<EngineType>('direct');
  const [selectedModel, setSelectedModel] = useState('gpt-4.1-2025-04-14');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [sseEvents, setSSEEvents] = useState<string[]>([]);
  
  // Context configuration
  const [contextConfig, setContextConfig] = useState<ContextConfig>({
    enableRAG: true,
    enableMemory: true,
    enableDailySummary: true,
    enableConversationHistory: true,
    minimalMode: false
  });

  // Streaming configuration
  const [streamingConfig, setStreamingConfig] = useState<StreamingConfig>({
    enableStreaming: true,
    showSSEEvents: true,
    timeout: 45000
  });

  // Pipeline status
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>({
    stage: 'idle',
    progress: 0,
    message: 'Bereit für Test'
  });

  const { toast } = useToast();
  const { user } = useAuth();
  const { sendDebug, loading: debugLoading } = useDebugChat();
  const { 
    streamingMessage, 
    streamState, 
    startStreaming, 
    stopStreaming 
  } = useRobustStreamingChat();

  const sseLogRef = useRef<HTMLDivElement>(null);

  const openAIModels = [
    { value: 'gpt-4.1-2025-04-14', label: 'GPT-4.1 (2025) - Flagship' },
    { value: 'o3-2025-04-16', label: 'o3 (2025) - Reasoning' },
    { value: 'o4-mini-2025-04-16', label: 'o4-mini (2025) - Fast reasoning' },
    { value: 'gpt-4o', label: 'GPT-4o - Previous flagship' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini - Fast & cheap' }
  ];

  // Update pipeline status
  const updatePipelineStatus = (stage: PipelineStage, progress: number, message: string) => {
    setPipelineStatus(prev => ({
      stage,
      progress,
      message,
      startTime: prev.startTime || Date.now(),
      stageStartTime: Date.now()
    }));
  };

  // Add SSE event to log
  const addSSEEvent = (event: string) => {
    setSSEEvents(prev => [...prev.slice(-19), `${new Date().toLocaleTimeString()}: ${event}`]);
  };

  // Scroll SSE log to bottom
  useEffect(() => {
    if (sseLogRef.current) {
      sseLogRef.current.scrollTop = sseLogRef.current.scrollHeight;
    }
  }, [sseEvents]);

  // Test Direct OpenAI
  const testDirectOpenAI = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setResponse(null);
      setSSEEvents([]);
      
      updatePipelineStatus('openai', 20, 'Verbindung zu OpenAI...');

      const startTime = Date.now();
      const result = await sendDebug({ 
        message, 
        model: selectedModel
      });
      const duration = Date.now() - startTime;

      updatePipelineStatus('complete', 100, `Fertig in ${duration}ms`);

      const enhancedResult = {
        ...result,
        model: selectedModel,
        processingTime: duration,
        engine: 'direct',
        debug: {
          ...result.debug,
          contextConfig: { minimal: true },
          directOpenAI: true
        }
      };

      setResponse(enhancedResult);
      
      toast({
        title: `🤖 Direct OpenAI erfolgreich!`,
        description: `${selectedModel} in ${duration}ms`,
      });

    } catch (error) {
      console.error('Direct OpenAI test failed:', error);
      updatePipelineStatus('error', 0, `Fehler: ${error.message}`);
      setResponse({ 
        error: error.message, 
        model: selectedModel,
        engine: 'direct'
      });
      toast({
        title: "Fehler",
        description: "Direct OpenAI Test fehlgeschlagen",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Test Unified Engine (NON-STREAMING)
  const testUnifiedEngine = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setResponse(null);
      setSSEEvents([]);
      
      updatePipelineStatus('context', 10, 'Lade Context...');

      const headers: Record<string, string> = {
        'x-force-non-streaming': 'true', // Force non-streaming mode
        'x-debug-mode': 'true' // Enable debug mode
      };
      
      // Apply context configuration
      if (contextConfig.minimalMode) {
        headers['x-lite-context'] = 'true';
      }
      if (!contextConfig.enableRAG) {
        headers['x-disable-rag'] = 'true';
      }
      if (!contextConfig.enableMemory) {
        headers['x-disable-memory'] = 'true';
      }
      if (!contextConfig.enableDailySummary) {
        headers['x-disable-daily-summary'] = 'true';
      }
      if (!contextConfig.enableConversationHistory) {
        headers['x-disable-conversation-history'] = 'true';
      }

      updatePipelineStatus('openai', 60, 'Sende an unified-coach-engine...');

      console.log('🔧 DEBUGGER: Sending request to unified-coach-engine with headers:', headers);
      console.log('🔧 DEBUGGER: Request body:', {
        userId: user.id,
        message,
        coachId: 'lucy',
        conversationId: `debug-${Date.now()}`,
        model: selectedModel,
        messageId: `debug-msg-${Date.now()}`
      });

      const { data, error } = await supabase.functions.invoke('unified-coach-engine', {
        body: {
          userId: user.id,
          message,
          coachId: 'lucy',
          conversationId: `debug-${Date.now()}`,
          model: selectedModel,
          messageId: `debug-msg-${Date.now()}`
        },
        headers
      });

      console.log('🔧 DEBUGGER: Response received:', { data, error });

      if (error) throw error;

      updatePipelineStatus('complete', 100, 'Unified Engine erfolgreich');

      setResponse({
        ...data,
        engine: 'unified',
        model: selectedModel,
        debug: {
          ...data.debug,
          contextConfig,
          headers,
          nonStreaming: true
        }
      });
      
      toast({
        title: "🚀 Unified Engine erfolgreich!",
        description: "Pipeline komplett durchlaufen (ohne Streaming)",
      });

    } catch (error) {
      console.error('Unified engine test failed:', error);
      updatePipelineStatus('error', 0, `Fehler: ${error.message}`);
      setResponse({ 
        error: error.message, 
        engine: 'unified'
      });
      toast({
        title: "Fehler",
        description: "Unified Engine Test fehlgeschlagen",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Test Streaming Engine
  const testStreamingEngine = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setResponse(null);
      setSSEEvents([]);
      
      updatePipelineStatus('context', 10, 'Starte Streaming...');
      addSSEEvent('Streaming initiiert');

      // Monitor streaming state
      const monitorInterval = setInterval(() => {
        if (streamState === 'connecting') {
          updatePipelineStatus('context', 20, 'Verbindung wird aufgebaut...');
          addSSEEvent('Verbindung wird aufgebaut');
        } else if (streamState === 'streaming') {
          updatePipelineStatus('streaming', 60, 'Streaming läuft...');
          addSSEEvent('Streaming aktiv');
        } else if (streamState === 'completing') {
          updatePipelineStatus('completing', 90, 'Streaming wird abgeschlossen...');
          addSSEEvent('Streaming wird beendet');
        } else if (streamState === 'idle' && streamingMessage?.content) {
          updatePipelineStatus('complete', 100, 'Streaming abgeschlossen');
          addSSEEvent('Streaming beendet');
          clearInterval(monitorInterval);
        } else if (streamState === 'error') {
          updatePipelineStatus('error', 0, 'Streaming Fehler');
          addSSEEvent('Streaming Fehler aufgetreten');
          clearInterval(monitorInterval);
        }
      }, 500);

      await startStreaming(user.id, message, 'lucy', []);

      // Clean up
      setTimeout(() => {
        clearInterval(monitorInterval);
        setIsLoading(false);
      }, 1000);

      if (streamingMessage) {
        setResponse({
          content: streamingMessage.content,
          engine: 'streaming',
          model: selectedModel,
          debug: {
            streamState,
            contextConfig,
            streaming: true
          }
        });
        
        toast({
          title: "🔄 Streaming erfolgreich!",
          description: "Streaming Engine funktioniert",
        });
      }

    } catch (error) {
      console.error('Streaming engine test failed:', error);
      updatePipelineStatus('error', 0, `Streaming Fehler: ${error.message}`);
      setResponse({ 
        error: error.message, 
        engine: 'streaming'
      });
      toast({
        title: "Fehler",
        description: "Streaming Engine Test fehlgeschlagen",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  // Quick test functions
  const quickTestMinimal = () => {
    setContextConfig({
      enableRAG: false,
      enableMemory: false,
      enableDailySummary: false,
      enableConversationHistory: false,
      minimalMode: true
    });
    setSelectedEngine('direct');
    setTimeout(testDirectOpenAI, 100);
  };

  const quickTestWithPersona = () => {
    setContextConfig({
      enableRAG: false,
      enableMemory: true,
      enableDailySummary: false,
      enableConversationHistory: false,
      minimalMode: false
    });
    setSelectedEngine('unified');
    setTimeout(testUnifiedEngine, 100);
  };

  const quickTestFullPipeline = () => {
    setContextConfig({
      enableRAG: true,
      enableMemory: true,
      enableDailySummary: true,
      enableConversationHistory: true,
      minimalMode: false
    });
    setSelectedEngine('unified');
    setTimeout(testUnifiedEngine, 100);
  };

  const quickTestStreaming = () => {
    setStreamingConfig({
      enableStreaming: true,
      showSSEEvents: true,
      timeout: 45000
    });
    setSelectedEngine('streaming');
    setTimeout(testStreamingEngine, 100);
  };

  // Execute test based on selected engine
  const executeTest = () => {
    switch (selectedEngine) {
      case 'direct':
        testDirectOpenAI();
        break;
      case 'unified':
        testUnifiedEngine();
        break;
      case 'streaming':
        testStreamingEngine();
        break;
    }
  };

  const getStageIcon = (stage: PipelineStage) => {
    switch (stage) {
      case 'context': return <Database className="h-4 w-4" />;
      case 'memory': return <Brain className="h-4 w-4" />;
      case 'rag': return <Settings className="h-4 w-4" />;
      case 'openai': return <Cpu className="h-4 w-4" />;
      case 'streaming': return <Radio className="h-4 w-4" />;
      case 'complete': return <CheckCircle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6 p-2 lg:p-0">
      {/* Engine Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm lg:text-base">
            <Settings className="h-4 w-4 lg:h-5 lg:w-5" />
            Pipeline Engine Selection
          </CardTitle>
          <CardDescription className="text-xs lg:text-sm">
            Wähle welche Engine/Pipeline getestet werden soll
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-4">
            <div className="flex items-center space-x-2 p-2 lg:p-0">
              <input
                type="radio"
                id="direct"
                name="engine"
                value="direct"
                checked={selectedEngine === 'direct'}
                onChange={(e) => setSelectedEngine(e.target.value as EngineType)}
                className="w-3 h-3 lg:w-4 lg:h-4"
              />
              <Label htmlFor="direct" className="text-xs lg:text-sm font-medium cursor-pointer">
                🤖 Direct OpenAI
                <div className="text-xs text-muted-foreground">Direkt ohne Pipeline</div>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2 p-2 lg:p-0">
              <input
                type="radio"
                id="unified"
                name="engine"
                value="unified"
                checked={selectedEngine === 'unified'}
                onChange={(e) => setSelectedEngine(e.target.value as EngineType)}
                className="w-3 h-3 lg:w-4 lg:h-4"
              />
              <Label htmlFor="unified" className="text-xs lg:text-sm font-medium cursor-pointer">
                🔧 Unified Engine
                <div className="text-xs text-muted-foreground">Mit Context Pipeline</div>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2 p-2 lg:p-0">
              <input
                type="radio"
                id="streaming"
                name="engine"
                value="streaming"
                checked={selectedEngine === 'streaming'}
                onChange={(e) => setSelectedEngine(e.target.value as EngineType)}
                className="w-3 h-3 lg:w-4 lg:h-4"
              />
              <Label htmlFor="streaming" className="text-xs lg:text-sm font-medium cursor-pointer">
                🔄 Streaming Engine
                <div className="text-xs text-muted-foreground">Mit SSE Streaming</div>
              </Label>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
            <div className="space-y-2">
              <Label className="text-xs lg:text-sm font-medium">Test Nachricht:</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Nachricht für Pipeline Test..."
                className="text-xs lg:text-sm"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs lg:text-sm font-medium">OpenAI Model:</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="text-xs lg:text-sm">
                  <SelectValue placeholder="Wähle ein Model" />
                </SelectTrigger>
                <SelectContent>
                  {openAIModels.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Context Configuration */}
      {selectedEngine !== 'direct' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm lg:text-base">
              <Brain className="h-4 w-4 lg:h-5 lg:w-5" />
              Context Control Panel
            </CardTitle>
            <CardDescription className="text-xs lg:text-sm">
              Einzelne Context-Komponenten an/ausschalten
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-4">
              <div className="flex items-center space-x-2 p-1">
                <Switch
                  id="minimal"
                  checked={contextConfig.minimalMode}
                  onCheckedChange={(checked) =>
                    setContextConfig(prev => ({ ...prev, minimalMode: checked }))
                  }
                />
                <Label htmlFor="minimal" className="text-xs lg:text-sm cursor-pointer">
                  Minimal Mode
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-1">
                <Switch
                  id="rag"
                  checked={contextConfig.enableRAG}
                  onCheckedChange={(checked) =>
                    setContextConfig(prev => ({ ...prev, enableRAG: checked }))
                  }
                  disabled={contextConfig.minimalMode}
                />
                <Label htmlFor="rag" className="text-xs lg:text-sm cursor-pointer">
                  RAG (Knowledge)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-1">
                <Switch
                  id="memory"
                  checked={contextConfig.enableMemory}
                  onCheckedChange={(checked) =>
                    setContextConfig(prev => ({ ...prev, enableMemory: checked }))
                  }
                  disabled={contextConfig.minimalMode}
                />
                <Label htmlFor="memory" className="text-xs lg:text-sm cursor-pointer">
                  Coach Memory
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-1">
                <Switch
                  id="daily"
                  checked={contextConfig.enableDailySummary}
                  onCheckedChange={(checked) =>
                    setContextConfig(prev => ({ ...prev, enableDailySummary: checked }))
                  }
                  disabled={contextConfig.minimalMode}
                />
                <Label htmlFor="daily" className="text-xs lg:text-sm cursor-pointer">
                  Daily Summary
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-1">
                <Switch
                  id="history"
                  checked={contextConfig.enableConversationHistory}
                  onCheckedChange={(checked) =>
                    setContextConfig(prev => ({ ...prev, enableConversationHistory: checked }))
                  }
                  disabled={contextConfig.minimalMode}
                />
                <Label htmlFor="history" className="text-xs lg:text-sm cursor-pointer">
                  Chat History
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pipeline Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm lg:text-base">
            <Activity className="h-4 w-4 lg:h-5 lg:w-5" />
            Live Pipeline Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 lg:gap-3">
            {getStageIcon(pipelineStatus.stage)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs lg:text-sm font-medium truncate">{pipelineStatus.message}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {pipelineStatus.progress}%
                </span>
              </div>
              <Progress value={pipelineStatus.progress} className="h-1 lg:h-2" />
            </div>
            <Badge 
              variant={pipelineStatus.stage === 'error' ? 'destructive' : 
                      pipelineStatus.stage === 'complete' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {pipelineStatus.stage}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Test Execution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm lg:text-base">
            <TestTube className="h-4 w-4 lg:h-5 lg:w-5" />
            Pipeline Test Execution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 lg:gap-3">
            <Button 
              onClick={executeTest}
              disabled={isLoading || debugLoading}
              className="flex items-center gap-2 text-xs lg:text-sm lg:col-span-4"
              size="sm"
            >
              <Play className="h-3 w-3 lg:h-4 lg:w-4" />
              {(isLoading || debugLoading) && <Loader2 className="h-3 w-3 lg:h-4 lg:w-4 animate-spin" />}
              Test {selectedEngine.charAt(0).toUpperCase() + selectedEngine.slice(1)}
            </Button>
            
            <Button 
              onClick={quickTestMinimal}
              disabled={isLoading || debugLoading}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              🚀 Minimal
            </Button>
            
            <Button 
              onClick={quickTestWithPersona}
              disabled={isLoading || debugLoading}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              🤖 + Persona
            </Button>
            
            <Button 
              onClick={quickTestFullPipeline}
              disabled={isLoading || debugLoading}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              🔧 Full Pipeline
            </Button>
            
            <Button 
              onClick={quickTestStreaming}
              disabled={isLoading || debugLoading}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              🔄 Streaming Test
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SSE Events Log */}
      {selectedEngine === 'streaming' && streamingConfig.showSSEEvents && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm lg:text-base">
              <Radio className="h-4 w-4 lg:h-5 lg:w-5" />
              SSE Events Monitor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              ref={sseLogRef}
              className="bg-muted p-2 lg:p-3 rounded-lg h-24 lg:h-32 overflow-y-auto text-xs font-mono"
            >
              {sseEvents.length === 0 ? (
                <div className="text-muted-foreground">Keine SSE Events bisher...</div>
              ) : (
                sseEvents.map((event, index) => (
                  <div key={index} className="mb-1 break-words">{event}</div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Response Display */}
      {response && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm lg:text-base">
              Pipeline Response - {response.engine?.toUpperCase()} Engine
            </CardTitle>
          </CardHeader>
          <CardContent>
            {response.error ? (
              <div className="text-red-600">
                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge variant="destructive" className="text-xs">Error</Badge>
                  <Badge variant="outline" className="text-xs">{response.engine}</Badge>
                  {response.model && <Badge variant="outline" className="text-xs">{response.model}</Badge>}
                </div>
                <pre className="text-xs lg:text-sm bg-muted p-2 rounded overflow-auto">{response.error}</pre>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="default" className="text-xs">{response.engine} Engine</Badge>
                  {response.model && <Badge variant="outline" className="text-xs">{response.model}</Badge>}
                  {response.processingTime && (
                    <Badge variant="secondary" className="text-xs">
                      {`${response.processingTime}ms`}
                    </Badge>
                  )}
                  {response.debug?.streaming && <Badge variant="default" className="text-xs">Streaming</Badge>}
                  {response.debug?.nonStreaming && <Badge variant="secondary" className="text-xs">Non-Streaming</Badge>}
                  {response.debug?.contextConfig?.minimalMode && <Badge variant="secondary" className="text-xs">Minimal</Badge>}
                </div>
                
                <div className="bg-muted p-3 lg:p-4 rounded-lg">
                  <p className="font-medium text-xs lg:text-sm">AI Response:</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs lg:text-sm">{response.content || response.response}</p>
                </div>
                
                {response.debug && (
                  <details className="mt-4">
                    <summary className="cursor-pointer font-medium text-xs lg:text-sm">Debug Information</summary>
                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-48 lg:max-h-64">
                      {JSON.stringify(response.debug, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedPipelineDebugger;