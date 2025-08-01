import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Zap, MessageSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const LiteDebugChat = () => {
  const [message, setMessage] = useState('Wie geht es mir heute?');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();

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

  const testFullMode = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setResponse(null);

      const { data, error } = await supabase.functions.invoke('unified-coach-engine', {
        body: {
          userId: user.id,
          message,
          coachId: 'lucy',
          conversationId: `full-debug-${Date.now()}`
        }
        // No lite header = full mode
      });

      if (error) throw error;

      setResponse(data);
      
      toast({
        title: "💪 Full Mode Test erfolgreich!",
        description: "Coach antwortet im Full-Modus",
      });

    } catch (error) {
      console.error('Full mode test failed:', error);
      setResponse({ error: error.message });
      toast({
        title: "Fehler",
        description: "Full Mode Test fehlgeschlagen",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Lite vs Full Mode Debug
          </CardTitle>
          <CardDescription>
            Teste Lucy im Light-Modus (fast, keine OpenAI) vs Full-Modus (komplett)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Test Nachricht:</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nachricht an Lucy..."
              className="mt-1"
            />
          </div>
          
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
              onClick={testFullMode}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Full Mode (3-6s)
            </Button>
          </div>
        </CardContent>
      </Card>

      {response && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Response</CardTitle>
          </CardHeader>
          <CardContent>
            {response.error ? (
              <div className="text-red-600">
                <Badge variant="destructive">Error</Badge>
                <pre className="mt-2 text-sm">{response.error}</pre>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={response.isLiteMode ? 'secondary' : 'default'}>
                    {response.isLiteMode ? 'Lite Mode' : 'Full Mode'}
                  </Badge>
                  {response.processingTime && (
                    <Badge variant="outline">
                      {`${response.processingTime}ms`}
                    </Badge>
                  )}
                </div>
                
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-medium">Coach Response:</p>
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
    </div>
  );
};

export default LiteDebugChat;