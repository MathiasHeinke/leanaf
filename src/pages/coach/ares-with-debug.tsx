import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { sendToAres } from '@/lib/orchestratorClient';
import { DebugTraceInspector } from '@/components/debug/DebugTraceInspector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function AresWithDebug() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTraceId, setCurrentTraceId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{text: string, isUser: boolean, trace_id?: string, error_details?: any}>>([]);

  const handleSend = async () => {
    if (!input.trim() || !user) return;
    
    const userMessage = { text: input, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    const messageText = input;
    setInput('');
    setLoading(true);

    try {
      console.log('🔧 ARES Debug: Sending message via sendToAres...');
      const response = await sendToAres({
        text: messageText,
        coachId: 'ares'
      });

      console.log('🔧 ARES Debug: Response received:', response);
      setCurrentTraceId(response.traceId);

      // Handle response data
      let responseText = '';
      if (response.data?.kind === 'message') {
        responseText = response.data.text;
      } else if (response.data?.kind === 'choice_suggest') {
        responseText = `${response.data.prompt}\n\nOptionen:\n${response.data.options.join('\n• ')}`;
      } else if (response.data?.role === 'assistant' && response.data?.content) {
        responseText = response.data.content;
      } else {
        responseText = JSON.stringify(response.data, null, 2);
      }

      setMessages(prev => [...prev, {
        text: responseText,
        isUser: false,
        trace_id: response.traceId
      }]);

      toast({
        title: "Message sent successfully",
        description: `Trace ID: ${response.traceId}`,
        duration: 3000
      });
    } catch (error: any) {
      console.error('🔧 ARES Debug: Error details:', error);
      
      const errorDetails = {
        message: error.message,
        status: error.status,
        traceId: error.traceId,
        raw: error.raw
      };

      setMessages(prev => [...prev, {
        text: `❌ Fehler: ${error.message}${error.status ? ` (HTTP ${error.status})` : ''}${error.traceId ? `\nTrace: ${error.traceId}` : ''}`,
        isUser: false,
        error_details: errorDetails
      }]);

      toast({
        title: "Error sending message",
        description: `${error.message}${error.status ? ` (${error.status})` : ''}`,
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="p-4">Please log in to use ARES debug mode.</div>;
  }

  return (
    <div className="flex flex-col h-screen p-4">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((msg, idx) => (
          <Card key={idx} className={`p-3 ${msg.isUser ? 'ml-auto bg-primary text-primary-foreground' : 'mr-auto'} max-w-[80%]`}>
            <div className="text-sm">{msg.text}</div>
            {msg.trace_id && (
              <div className="text-xs opacity-70 mt-1 font-mono">Trace: {msg.trace_id}</div>
            )}
          </Card>
        ))}
      </div>
      
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nachricht an ARES..."
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={loading}
        />
        <Button onClick={handleSend} disabled={loading || !input.trim()}>
          {loading ? 'Sending...' : 'Send'}
        </Button>
      </div>

      {/* Debug Panel */}
      <DebugTraceInspector traceId={currentTraceId} />
    </div>
  );
}