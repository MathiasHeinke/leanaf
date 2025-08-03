import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const UnifiedEngineDebugger: React.FC = () => {
  const { user } = useAuth();
  const [message, setMessage] = useState('Erstelle mir einen Trainingsplan');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugMode, setDebugMode] = useState(true);
  const [disableMemory, setDisableMemory] = useState(false);
  const [disableDaily, setDisableDaily] = useState(false);
  const [disableRag, setDisableRag] = useState(false);
  const [liteContext, setLiteContext] = useState(false);
  const [forceNonStreaming, setForceNonStreaming] = useState(true);

  const testUnifiedEngine = async () => {
    if (!user || !message.trim()) return;

    setLoading(true);
    setResponse('');

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (debugMode) headers['x-debug-mode'] = 'true';
      if (disableMemory) headers['x-disable-memory'] = 'true';
      if (disableDaily) headers['x-disable-daily'] = 'true';
      if (disableRag) headers['x-disable-rag'] = 'true';
      if (liteContext) headers['x-lite-context'] = 'true';
      if (forceNonStreaming) headers['x-force-non-streaming'] = 'true';

      console.log('🔧 Sending headers:', headers);

      const { data, error } = await supabase.functions.invoke('unified-coach-engine', {
        body: {
          userId: user.id,
          coachId: 'lucy',
          messageId: `test_${Date.now()}`,
          message: message.trim(),
          conversationHistory: [],
          enableStreaming: !forceNonStreaming,
          enableRag: !disableRag
        },
        headers
      });

      if (error) {
        setResponse(`❌ Error: ${error.message}`);
        console.error('Unified Engine Error:', error);
      } else if (data) {
        setResponse(`✅ Success!\n\nResponse: ${data.response || JSON.stringify(data, null, 2)}`);
        console.log('Unified Engine Response:', data);
      } else {
        setResponse('⚠️ No response data received');
      }
    } catch (error: any) {
      setResponse(`❌ Exception: ${error.message}`);
      console.error('Exception:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Please log in to test the Unified Engine</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🚀 Unified Coach Engine Debugger
          <Badge variant="outline">Debug Mode</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Message Input */}
        <div className="space-y-2">
          <Label htmlFor="message">Test Message</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your message to test the unified engine..."
            rows={2}
          />
        </div>

        {/* Debug Options */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Switch
              id="debug-mode"
              checked={debugMode}
              onCheckedChange={setDebugMode}
            />
            <Label htmlFor="debug-mode">Debug Mode</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="force-non-streaming"
              checked={forceNonStreaming}
              onCheckedChange={setForceNonStreaming}
            />
            <Label htmlFor="force-non-streaming">Non-Streaming</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="disable-memory"
              checked={disableMemory}
              onCheckedChange={setDisableMemory}
            />
            <Label htmlFor="disable-memory">Disable Memory</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="disable-daily"
              checked={disableDaily}
              onCheckedChange={setDisableDaily}
            />
            <Label htmlFor="disable-daily">Disable Daily</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="disable-rag"
              checked={disableRag}
              onCheckedChange={setDisableRag}
            />
            <Label htmlFor="disable-rag">Disable RAG</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="lite-context"
              checked={liteContext}
              onCheckedChange={setLiteContext}
            />
            <Label htmlFor="lite-context">Lite Context</Label>
          </div>
        </div>

        {/* Test Button */}
        <Button 
          onClick={testUnifiedEngine} 
          disabled={loading || !message.trim()}
          className="w-full"
        >
          {loading ? '🔄 Testing...' : '🚀 Test Unified Engine'}
        </Button>

        {/* Response */}
        {response && (
          <div className="space-y-2">
            <Label>Response</Label>
            <div className="p-4 bg-muted rounded-lg border">
              <pre className="whitespace-pre-wrap text-sm">{response}</pre>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
          <h4 className="font-semibold text-blue-900 mb-2">Debug Headers</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li><code>x-debug-mode=true</code> - Enables detailed console logging</li>
            <li><code>x-disable-memory=true</code> - Skips coach memory loading</li>
            <li><code>x-disable-daily=true</code> - Skips daily summary loading</li>
            <li><code>x-disable-rag=true</code> - Skips RAG system</li>
            <li><code>x-lite-context=true</code> - Minimal context (memory + daily off)</li>
            <li><code>x-force-non-streaming=true</code> - Forces non-streaming response</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};