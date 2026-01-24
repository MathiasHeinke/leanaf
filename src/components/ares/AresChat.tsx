/**
 * ARES Chat Component
 * Real-time streaming chat interface for ARES coach
 * Design upgraded to match EnhancedUnifiedCoachChat visual style
 * 
 * @version 2.1.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, Sparkles, Brain, Activity, Heart, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAresStreaming, ThinkingStep } from '@/hooks/useAresStreaming';
import ReactMarkdown from 'react-markdown';
import { ChatLayout } from '@/components/layouts/ChatLayout';
import { CollapsibleCoachHeader } from '@/components/CollapsibleCoachHeader';
import { EnhancedChatInput } from '@/components/EnhancedChatInput';
import FireBackdrop, { FireBackdropHandle } from '@/components/FireBackdrop';
import { useShadowState } from '@/hooks/useShadowState';
import { SmartChip } from '@/components/ui/smart-chip';
import { COACH_REGISTRY } from '@/lib/coachRegistry';

// ARES Profile Image from registry
const ARES_IMAGE_URL = COACH_REGISTRY.ares.imageUrl || '/coaches/ares.png';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  traceId?: string | null;
  mediaUrls?: string[];
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
    <div className="flex items-center gap-1.5 py-2">
      <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

function ThinkingIndicator({ steps }: { steps: ThinkingStep[] }) {
  if (steps.length === 0) return null;
  
  return (
    <div className="space-y-1.5 py-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          {step.complete ? (
            <Check className="w-3 h-3 text-primary" />
          ) : (
            <Loader2 className="w-3 h-3 animate-spin text-primary/60" />
          )}
          <span className={cn(
            "transition-colors",
            step.complete ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {step.message}
          </span>
        </div>
      ))}
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
    <div className="flex flex-wrap gap-1.5 mb-3">
      {modules.map(mod => (
        <Badge 
          key={mod} 
          variant="secondary" 
          className="text-xs py-0.5 px-2 flex items-center gap-1.5 bg-primary/10 text-primary border-primary/20"
        >
          {icons[mod]}
          <span className="capitalize">{mod}</span>
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
      <div className="flex flex-col max-w-[80%]">
        {/* Message Bubble with Glassmorphism */}
        <div className={cn(
          'rounded-2xl px-4 py-3 backdrop-blur-sm',
          isUser 
            ? 'bg-primary/20 border border-primary/30 text-foreground rounded-br-md' 
            : 'bg-muted/30 border border-border/30 rounded-bl-md'
        )}>
          {/* Media Preview for User Messages */}
          {isUser && message.mediaUrls && message.mediaUrls.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {message.mediaUrls.map((url, idx) => (
                <img 
                  key={idx} 
                  src={url} 
                  alt="Anhang" 
                  className="w-20 h-20 object-cover rounded-lg border border-border/30"
                />
              ))}
            </div>
          )}
          
          {isUser ? (
            <p className="whitespace-pre-wrap text-foreground">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                skipHtml={true}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0 text-foreground">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                  ul: ({ children }) => <ul className="list-disc ml-4 mb-2 text-foreground">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 text-foreground">{children}</ol>,
                  li: ({ children }) => <li className="mb-1 text-foreground">{children}</li>,
                  code: ({ children }) => (
                    <code className="bg-muted/50 backdrop-blur-sm px-1.5 py-0.5 rounded text-sm font-mono">
                      {children}
                    </code>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-primary/50 pl-3 italic text-muted-foreground">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5 rounded-sm" />
              )}
            </div>
          )}
        </div>

        {/* Footer: Avatar + Timestamp */}
        {!isUser && (
          <div className="flex items-center gap-2 mt-2 ml-1">
            <Avatar className="h-5 w-5 flex-shrink-0">
              <AvatarImage src={ARES_IMAGE_URL} alt="ARES" />
              <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-semibold">A</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              {message.timestamp.toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        )}
        
        {/* User message timestamp */}
        {isUser && (
          <div className="flex items-center justify-end gap-2 mt-1.5 mr-1">
            <span className="text-xs text-muted-foreground">
              {message.timestamp.toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
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
  const [bannerCollapsed, setBannerCollapsed] = useState(false);

  // Refs
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fireBackdropRef = useRef<FireBackdropHandle>(null);

  // Shadow state for choice chips
  const {
    pendingChips,
    scheduleChips,
    clearChips,
    setUserTyping
  } = useShadowState();

  // Streaming hook
  const {
    sendMessage,
    streamingContent,
    isStreaming,
    streamState,
    error,
    traceId,
    metrics,
    thinkingSteps,
    stopStream
  } = useAresStreaming({
    onStreamStart: () => {
      console.log('[AresChat] Stream started');
      // Trigger fire animation on stream start
      fireBackdropRef.current?.ignite({ to: 0.7, durationMs: 3000 });
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
      
      // Schedule choice chips after delay
      if (traceId) {
        scheduleChips(traceId, 6500);
      }
      
      // Fire ignite on response complete
      fireBackdropRef.current?.ignite({ to: 0.9, durationMs: 4000 });
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
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  // Handle send with media support
  const handleSendWithMedia = useCallback(async (message: string, mediaUrls?: string[]) => {
    const trimmed = message.trim();
    if (!trimmed && (!mediaUrls || mediaUrls.length === 0)) return;
    if (isStreaming) return;

    // Clear choice chips when user sends new message
    clearChips();

    // Add user message immediately
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
      mediaUrls
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    onMessageSent?.(trimmed);

    // Send to ARES (mediaUrls not yet supported in streaming hook - TODO: extend hook)
    await sendMessage(trimmed, coachId);
  }, [isStreaming, sendMessage, coachId, onMessageSent, clearChips]);

  // Handle chip click
  const handleChipClick = useCallback((chip: string) => {
    clearChips();
    setInput(chip);
    // Optionally auto-send
    handleSendWithMedia(chip);
  }, [clearChips, handleSendWithMedia]);

  // Handle daily reset
  const handleDailyReset = useCallback(() => {
    setMessages([]);
  }, []);

  // Chat input component
  const chatInputComponent = (
    <div className="space-y-2">
      {/* Choice Chips */}
      {pendingChips.length > 0 && !isStreaming && (
        <div className="flex flex-wrap gap-2 px-1">
          {pendingChips.map((chip, idx) => (
            <SmartChip
              key={idx}
              variant="secondary"
              size="sm"
              onClick={() => handleChipClick(chip)}
            >
              {chip}
            </SmartChip>
          ))}
          <button
            onClick={clearChips}
            className="text-muted-foreground hover:text-foreground text-sm px-2"
            aria-label="Vorschläge schließen"
          >
            ×
          </button>
        </div>
      )}
      
      <EnhancedChatInput
        inputText={input}
        setInputText={setInput}
        onSendMessage={handleSendWithMedia}
        isLoading={isStreaming}
        placeholder="Schreibe ARES..."
        onTypingChange={setUserTyping}
      />
    </div>
  );

  return (
    <>
      {/* Fire Backdrop */}
      <FireBackdrop ref={fireBackdropRef} chatMode />
      
      <ChatLayout
        chatInput={chatInputComponent}
        bannerCollapsed={bannerCollapsed}
      >
        {/* Collapsible Header */}
        <CollapsibleCoachHeader
          coach={{
            name: 'ARES',
            id: 'ares',
            imageUrl: ARES_IMAGE_URL,
            specialization: 'Unified Expert Coach'
          }}
          onCollapseChange={setBannerCollapsed}
          onDailyReset={handleDailyReset}
        />

        {/* Messages Container */}
        <div 
          ref={scrollAreaRef}
          className="flex-1 overflow-y-auto px-2 py-4"
        >
          <div className="max-w-3xl mx-auto space-y-1">
            {/* Empty state */}
            {messages.length === 0 && !isStreaming && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Willkommen bei ARES
                </h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                  Dein persönlicher AI-Coach für Training, Ernährung und Gesundheit. 
                  Stelle eine Frage oder teile deine Ziele.
                </p>
              </div>
            )}

            {/* Existing messages */}
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Streaming message */}
            {isStreaming && (
              <div className="flex justify-start mb-4">
                <div className="flex flex-col max-w-[80%]">
                  {/* Avatar + "ARES schreibt..." header */}
                  <div className="flex items-center gap-2 mb-2 ml-1">
                    <Avatar className="h-5 w-5 flex-shrink-0">
                      <AvatarImage src={ARES_IMAGE_URL} alt="ARES" />
                      <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-semibold">A</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      ARES {streamState === 'streaming' ? 'schreibt...' : 'denkt nach...'}
                    </span>
                  </div>
                  
                  <div className="rounded-2xl rounded-bl-md bg-muted/30 backdrop-blur-sm border border-border/30 px-4 py-3">
                    {/* Thinking steps (Gemini-style) */}
                    {(streamState === 'connecting' || streamState === 'thinking' || streamState === 'context_loading') && (
                      <>
                        {thinkingSteps.length > 0 ? (
                          <ThinkingIndicator steps={thinkingSteps} />
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Denke nach...</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Streaming content */}
                    {streamState === 'streaming' && streamingContent && (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                          skipHtml={true}
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0 text-foreground">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                          }}
                        >
                          {streamingContent}
                        </ReactMarkdown>
                        <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5 rounded-sm" />
                      </div>
                    )}
                    
                    {/* Fallback typing indicator */}
                    {streamState === 'streaming' && !streamingContent && (
                      <TypingIndicator />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="flex justify-center mb-4">
                <Badge variant="destructive" className="text-sm px-3 py-1">
                  Fehler: {error}
                </Badge>
              </div>
            )}

            {/* Metrics during streaming (optional debug) */}
            {isStreaming && metrics.firstTokenMs !== null && (
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/60">
                <span>⚡ {metrics.firstTokenMs}ms</span>
                <span>📝 {metrics.totalTokens} tokens</span>
              </div>
            )}
          </div>
        </div>
      </ChatLayout>
    </>
  );
}
