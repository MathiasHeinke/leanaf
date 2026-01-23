/**
 * ARES Chat Component
 * Real-time streaming chat interface for ARES coach
 * 
 * @version 1.0.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, StopCircle, Sparkles, Brain, Activity, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAresStreaming } from '@/hooks/useAresStreaming';
import ReactMarkdown from 'react-markdown';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  traceId?: string | null;
}

interface AresChatProps {
  userId: string;
  coachId?: string;
  initialMessages?: Message[];
  onMessageSent?: (message: string) => void;
  onResponseReceived?: (response: string, traceId: string | null) => void;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

function ContextBadges({ modules }: { modules: string[] }) {
  const icons: Record<string, React.ReactNode> = {
    persona: <Sparkles className="w-3 h-3" />,
    memory: <Brain className="w-3 h-3" />,
    health: <Activity className="w-3 h-3" />,
    bloodwork: <Heart className="w-3 h-3" />,
    knowledge: <Sparkles className="w-3 h-3" />
  };

  if (modules.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mb-2">
      {modules.map(mod => (
        <Badge 
          key={mod} 
          variant="secondary" 
          className="text-xs py-0 px-1.5 flex items-center gap-1"
        >
          {icons[mod]}
          {mod}
        </Badge>
      ))}
    </div>
  );
}

function MessageBubble({ message, isStreaming }: { message: Message; isStreaming?: boolean }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn(
      'flex w-full mb-4',
      isUser ? 'justify-end' : 'justify-start'
    )}>
      <div className={cn(
        'max-w-[85%] rounded-2xl px-4 py-3',
        isUser 
          ? 'bg-primary text-primary-foreground rounded-br-md' 
          : 'bg-muted rounded-bl-md'
      )}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AresChat({
  userId,
  coachId = 'ares',
  initialMessages = [],
  onMessageSent,
  onResponseReceived,
  className
}: AresChatProps) {
  // State
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [contextModules, setContextModules] = useState<string[]>([]);

  // Refs
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Streaming hook
  const {
    sendMessage,
    streamingContent,
    isStreaming,
    streamState,
    error,
    traceId,
    metrics,
    stopStream
  } = useAresStreaming({
    onStreamStart: () => {
      console.log('[AresChat] Stream started');
    },
    onStreamEnd: (content, traceId) => {
      console.log('[AresChat] Stream ended, traceId:', traceId);
      
      // Add assistant message to history
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content,
          timestamp: new Date(),
          traceId
        }
      ]);
      
      setContextModules([]);
      onResponseReceived?.(content, traceId);
    },
    onError: (err) => {
      console.error('[AresChat] Error:', err);
    },
    onContextReady: (modules) => {
      setContextModules(modules);
    }
  });

  // Auto-scroll on new content
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, streamingContent]);

  // Handle send
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    // Add user message immediately
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    onMessageSent?.(trimmed);

    // Send to ARES
    await sendMessage(trimmed, coachId);
  }, [input, isStreaming, sendMessage, coachId, onMessageSent]);

  // Handle keyboard
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Handle stop
  const handleStop = useCallback(() => {
    stopStream();
  }, [stopStream]);

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Messages area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="max-w-3xl mx-auto">
          {/* Existing messages */}
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* Streaming message */}
          {isStreaming && (
            <div className="flex justify-start mb-4">
              <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                {/* Context badges */}
                <ContextBadges modules={contextModules} />
                
                {streamState === 'connecting' || streamState === 'context_loading' ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">
                      {streamState === 'connecting' ? 'Verbinde...' : 'Lade Kontext...'}
                    </span>
                  </div>
                ) : streamingContent ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{streamingContent}</ReactMarkdown>
                    <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
                  </div>
                ) : (
                  <TypingIndicator />
                )}
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="flex justify-center mb-4">
              <Badge variant="destructive" className="text-sm">
                Fehler: {error}
              </Badge>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
        <div className="max-w-3xl mx-auto">
          {/* Metrics display during streaming */}
          {isStreaming && metrics.firstTokenMs !== null && (
            <div className="flex items-center gap-4 mb-2 text-xs text-muted-foreground">
              <span>Erste Antwort: {metrics.firstTokenMs}ms</span>
              <span>Tokens: {metrics.totalTokens}</span>
            </div>
          )}

          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Schreibe ARES..."
              disabled={isStreaming}
              className="min-h-[44px] max-h-[200px] resize-none"
              rows={1}
            />
            
            {isStreaming ? (
              <Button
                onClick={handleStop}
                variant="destructive"
                size="icon"
                className="shrink-0"
              >
                <StopCircle className="w-5 h-5" />
              </Button>
            ) : (
              <Button
                onClick={handleSend}
                disabled={!input.trim()}
                size="icon"
                className="shrink-0"
              >
                <Send className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
