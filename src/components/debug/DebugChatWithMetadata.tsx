import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Bug } from 'lucide-react';
import { useDebugChatWithRoute } from '@/hooks/useDebugChatWithRoute';
import { ResponseMetadata } from './ResponseMetadata';
import ReactMarkdown from 'react-markdown';
import { useToast } from '@/hooks/use-toast';

interface DebugMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: any;
}

interface DebugChatWithMetadataProps {
  className?: string;
}

export function DebugChatWithMetadata({ className }: DebugChatWithMetadataProps) {
  const [messages, setMessages] = useState<DebugMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const { sendDebug, loading, currentCoach } = useDebugChatWithRoute();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage: DebugMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText;
    setInputText('');

    try {
      const response = await sendDebug({
        message: currentInput,
      });

      const assistantMessage: DebugMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content || 'No response content',
        timestamp: Date.now(),
        metadata: response.metadata,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Show metadata info
      if (response.metadata?.source === 'v1') {
        toast({
          title: "⚠️ V1 Response Detected",
          description: "Legacy fallback was used. Quality may be degraded.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Debug chat error:', error);
      toast({
        title: "Debug Chat Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bug className="w-5 h-5" />
          Debug Chat - {currentCoach?.toUpperCase() || 'UNKNOWN'}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Direct chat for debugging with transparent metadata
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Messages */}
        <ScrollArea className="h-96 w-full border rounded-lg p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Bug className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Start debugging by sending a message</p>
                <p className="text-xs mt-1">All responses will show pipeline metadata</p>
              </div>
            )}
            
            {messages.map((message) => (
              <div key={message.id} className="space-y-2">
                <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <div className="text-sm">
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        message.content
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Show metadata for assistant messages */}
                {message.role === 'assistant' && message.metadata && (
                  <ResponseMetadata 
                    metadata={message.metadata} 
                    className="ml-4 max-w-[80%]" 
                  />
                )}
              </div>
            ))}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="flex gap-2">
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Debug message for ${currentCoach?.toUpperCase() || 'COACH'}...`}
            className="resize-none"
            rows={2}
            disabled={loading}
          />
          <Button 
            onClick={handleSend}
            disabled={loading || !inputText.trim()}
            size="sm"
            className="px-3"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          Current Route Coach: <span className="font-mono">{currentCoach || 'none'}</span>
        </div>
      </CardContent>
    </Card>
  );
}