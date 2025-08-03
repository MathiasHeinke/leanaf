import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Zap, MessageSquare, TestTube, Play } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDebugChat } from '@/hooks/useDebugChat';

const LiteDebugChat = () => {
  const [message, setMessage] = useState('Wie geht es mir heute?');
  const [selectedModel, setSelectedModel] = useState('gpt-4.1-2025-04-14');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [allModelsResults, setAllModelsResults] = useState<any[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const { sendDebug, loading: debugLoading } = useDebugChat();

  const openAIModels = [
    { value: 'gpt-4.1-2025-04-14', label: 'GPT-4.1 (2025) - Flagship' },
    { value: 'gpt-4o', label: 'GPT-4o - Previous flagship' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini - Fast & cheap' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo - Legacy' }
  ];

  const testLiteMode = async () => {
    if (!user?.id) {
      toast({
        title: "Fehler",
        description: "Du musst angemeldet sein",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      setResponse(null);

      const { data, error } = await supabase.functions.invoke('unified-coach-engine', {
        body: {
          userId: user.id,
          message,
          coachId: 'lucy',
          conversationId: `lite-debug-${Date.now()}`
        },
        headers: {
          'x-lite-context': 'true'
        }
      });

      if (error) throw error;

      setResponse(data);
      
      toast({
        title: "🚀 Lite Mode Test erfolgreich!",
        description: "Coach antwortet im Light-Modus",
      });

    } catch (error) {
      console.error('Lite mode test failed:', error);
      setResponse({ error: error.message });
      toast({
        title: "Fehler",
        description: "Lite Mode Test fehlgeschlagen",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testDirectOpenAI = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setResponse(null);

      const startTime = Date.now();
      const result = await sendDebug({ 
        message, 
        coachId: selectedModel // Use selected model as coachId for model testing
      });
      const duration = Date.now() - startTime;

      const enhancedResult = {
        ...result,
        model: selectedModel,
        processingTime: duration,
        debug: {
          ...result.debug,
          selectedModel,
          directOpenAI: true,
          testTimestamp: new Date().toISOString()
        }
      };

      setResponse(enhancedResult);
      
      toast({
        title: `🤖 ${selectedModel} Test erfolgreich!`,
        description: `Antwort in ${duration}ms`,
      });

    } catch (error) {
      console.error('Direct OpenAI test failed:', error);
      setResponse({ 
        error: error.message, 
        model: selectedModel,
        debug: { directOpenAI: true, errorModel: selectedModel }
      });
      toast({
        title: "Fehler",
        description: `${selectedModel} Test fehlgeschlagen`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testAllModels = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setAllModelsResults([]);
      
      const results = [];
      
      for (const model of openAIModels) {
        try {
          const startTime = Date.now();
          const result = await sendDebug({ 
            message, 
            coachId: model.value 
          });
          const duration = Date.now() - startTime;
          
          results.push({
            model: model.value,
            label: model.label,
            success: true,
            duration,
            content: result.content || result.response,
            debug: result.debug
          });
        } catch (error) {
          results.push({
            model: model.value,
            label: model.label,
            success: false,
            error: error.message,
            duration: 0
          });
        }
      }
      
      setAllModelsResults(results);
      
      toast({
        title: "🧪 All Models Test complete!",
        description: `${results.filter(r => r.success).length}/${results.length} models successful`,
      });

    } catch (error) {
      console.error('All models test failed:', error);
      toast({
        title: "Fehler",
        description: "All Models Test fehlgeschlagen",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* OpenAI Model Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            OpenAI Model Testing
          </CardTitle>
          <CardDescription>
            Test different OpenAI models directly via debug-direct-chat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Test Nachricht:</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Nachricht an OpenAI..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">OpenAI Model:</label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="mt-1">
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button 
              onClick={testDirectOpenAI}
              disabled={isLoading || debugLoading}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {(isLoading || debugLoading) && <Loader2 className="h-4 w-4 animate-spin" />}
              Test {selectedModel}
            </Button>
            
            <Button 
              onClick={testAllModels}
              disabled={isLoading || debugLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <TestTube className="h-4 w-4" />
              {(isLoading || debugLoading) && <Loader2 className="h-4 w-4 animate-spin" />}
              Test All Models
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Legacy Lite/Full Mode Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Legacy: Lite vs Full Mode
          </CardTitle>
          <CardDescription>
            Test unified-coach-engine pipeline (kann nicht funktionieren bis deployment)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button 
              onClick={testLiteMode}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Lite Mode (unter 1s)
            </Button>
            
            <Button 
              onClick={() => toast({ title: "Info", description: "Full Mode entfernt - nutze Direct OpenAI Tests oben" })}
              disabled={true}
              variant="ghost"
              className="flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Full Mode (deprecated)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Single Model Response */}
      {response && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Response - {response.model || 'Unknown Model'}</CardTitle>
          </CardHeader>
          <CardContent>
            {response.error ? (
              <div className="text-red-600">
                <Badge variant="destructive">Error</Badge>
                {response.model && <Badge variant="outline" className="ml-2">{response.model}</Badge>}
                <pre className="mt-2 text-sm">{response.error}</pre>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {response.model && <Badge variant="default">{response.model}</Badge>}
                  <Badge variant={response.isLiteMode ? 'secondary' : 'default'}>
                    {response.debug?.directOpenAI ? 'Direct OpenAI' : response.isLiteMode ? 'Lite Mode' : 'Full Mode'}
                  </Badge>
                  {response.processingTime && (
                    <Badge variant="outline">
                      {`${response.processingTime}ms`}
                    </Badge>
                  )}
                </div>
                
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-medium">OpenAI Response:</p>
                  <p className="mt-1">{response.content || response.response}</p>
                </div>
                
                {response.debug && (
                  <details className="mt-4">
                    <summary className="cursor-pointer font-medium">Debug Data</summary>
                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                      {JSON.stringify(response.debug, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Models Results */}
      {allModelsResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Models Comparison</CardTitle>
            <CardDescription>
              A/B test results for all OpenAI models
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allModelsResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={result.success ? 'default' : 'destructive'}>
                        {result.label}
                      </Badge>
                      {result.success && (
                        <Badge variant="outline">
                          {result.duration}ms
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {result.success ? '✅ Success' : '❌ Failed'}
                    </div>
                  </div>
                  
                  {result.success ? (
                    <div className="bg-muted p-3 rounded text-sm">
                      {result.content}
                    </div>
                  ) : (
                    <div className="bg-destructive/10 p-3 rounded text-sm text-destructive">
                      {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LiteDebugChat;