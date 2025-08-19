import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrchestratorWithDebug } from '@/hooks/useOrchestratorWithDebug';
import { DebugTraceInspector } from '@/components/debug/DebugTraceInspector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function AresWithDebug() {
  const { user } = useAuth();
  const { sendEvent, currentTraceId, loading } = useOrchestratorWithDebug();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{text: string, isUser: boolean, trace_id?: string}>>([]);

  const handleSend = async () => {
    if (!input.trim() || !user) return;
    
    const userMessage = { text: input, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const response = await sendEvent(user.id, {
        type: 'TEXT',
        text: input,
        clientEventId: `msg_${Date.now()}`
      });

      // Handle different response types correctly
      let responseText = '';
      if (response.kind === 'message') {
        responseText = response.text;
      } else if (response.kind === 'choice_suggest') {
        responseText = `${response.prompt}\n\nOptionen:\n${response.options.join('\n• ')}`;
      } else {
        responseText = 'Unerwartete Antwort';
      }

      setMessages(prev => [...prev, {
        text: responseText,
        isUser: false,
        trace_id: response.traceId || currentTraceId
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        text: 'Fehler beim Senden der Nachricht.',
        isUser: false
      }]);
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