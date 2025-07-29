import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft,
  Send, 
  Mic, 
  StopCircle, 
  Loader2,
  Sparkles,
  MessageSquare,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useMobileOptimizations } from '@/hooks/useMobileOptimizations';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface EnhancedMobileCoachChatProps {
  coach: any;
  onBack: () => void;
  messages: any[];
  inputText: string;
  setInputText: (text: string) => void;
  onSendMessage: (message: string) => void;
  isThinking: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  quickActions: Array<{ text: string; prompt: string }>;
}

export const EnhancedMobileCoachChat: React.FC<EnhancedMobileCoachChatProps> = ({
  coach,
  onBack,
  messages,
  inputText,
  setInputText,
  onSendMessage,
  isThinking,
  isRecording,
  isProcessing,
  onStartRecording,
  onStopRecording,
  quickActions
}) => {
  const { hapticFeedback, isIOSDevice, isLargeScreen, viewportHeight, safeAreaInsets } = useMobileOptimizations();
  const isMobile = useIsMobile();
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end'
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle input focus/blur for mobile keyboard optimization
  const handleInputFocus = () => {
    setIsInputFocused(true);
    // Adjust viewport for keyboard on iOS
    if (isIOSDevice) {
      setTimeout(() => {
        textareaRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest' 
        });
      }, 300);
    }
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
  };

  // Enhanced send message with haptic feedback
  const handleSendMessage = () => {
    if (inputText.trim()) {
      hapticFeedback('light');
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  // Enhanced voice recording with haptic feedback
  const handleVoiceToggle = () => {
    hapticFeedback(isRecording ? 'medium' : 'light');
    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  // Handle quick action with haptic feedback
  const handleQuickAction = (prompt: string) => {
    hapticFeedback('light');
    onSendMessage(prompt);
  };

  // Calculate dynamic heights based on device
  const getContainerHeight = () => {
    if (!isMobile) return 'auto';
    
    const baseHeight = viewportHeight - safeAreaInsets.top - safeAreaInsets.bottom;
    return isInputFocused ? `${baseHeight * 0.6}px` : `${baseHeight * 0.9}px`;
  };

  // Enhanced touch targets for mobile
  const touchTargetClass = "min-h-[44px] min-w-[44px]";

  return (
    <div 
      className={cn(
        "flex flex-col w-full h-full",
        isIOSDevice && "supports-[padding:env(safe-area-inset-top)]:pt-[env(safe-area-inset-top)]"
      )}
      style={{ 
        height: isMobile ? getContainerHeight() : 'auto',
        paddingBottom: isIOSDevice ? `${safeAreaInsets.bottom}px` : undefined
      }}
    >
      {/* Enhanced Header with better touch targets */}
      <div className={cn(
        "flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10",
        isLargeScreen && "px-6"
      )}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            hapticFeedback('light');
            onBack();
          }}
          className={cn(touchTargetClass, "shrink-0")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="text-2xl shrink-0">{coach.avatar}</div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate text-base">{coach.name}</h3>
            <p className="text-xs text-muted-foreground truncate">{coach.role}</p>
          </div>
        </div>

        {isThinking && (
          <div className="flex items-center gap-2 shrink-0">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs text-muted-foreground">Denkt...</span>
          </div>
        )}
      </div>

      {/* Messages Area with optimized scrolling */}
      <ScrollArea 
        className="flex-1 px-4 py-2"
        style={{ 
          maxHeight: isMobile ? 'calc(100% - 180px)' : 'auto' 
        }}
      >
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={message.id || index}
              className={cn(
                "flex w-full",
                message.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  isLargeScreen && "max-w-[80%] text-base",
                  message.role === 'user'
                    ? "bg-primary text-primary-foreground ml-auto"
                    : "bg-muted"
                )}
              >
                <ReactMarkdown 
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0 prose prose-sm dark:prose-invert max-w-none">{children}</p>
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          
          {/* Typing indicator */}
          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-3 max-w-[85%]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                  </div>
                  <span className="text-xs text-muted-foreground">{coach.name} tippt...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Quick Actions - Collapsible on mobile */}
      {quickActions.length > 0 && (
        <div className={cn(
          "border-t border-border bg-background/95 backdrop-blur-sm",
          !showQuickActions && "pb-0"
        )}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              hapticFeedback('light');
              setShowQuickActions(!showQuickActions);
            }}
            className="w-full py-2 h-auto text-xs flex items-center gap-2"
          >
            <Sparkles className="h-3 w-3" />
            Schnelle Aktionen
            {showQuickActions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          
          {showQuickActions && (
            <div className="p-3 grid grid-cols-1 gap-2">
              {quickActions.slice(0, 4).map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action.prompt)}
                  className={cn(
                    "text-xs text-left justify-start h-auto py-3 px-3",
                    touchTargetClass
                  )}
                >
                  {action.text}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Enhanced Input Area */}
      <div className={cn(
        "p-4 border-t border-border bg-background/95 backdrop-blur-sm",
        isLargeScreen && "px-6",
        isIOSDevice && isInputFocused && "pb-6"
      )}>
        <div className="flex items-end gap-3">
          {/* Enhanced Voice Button */}
          <Button
            variant={isRecording ? "destructive" : "secondary"}
            size="icon"
            onTouchStart={handleVoiceToggle}
            className={cn(
              touchTargetClass,
              "shrink-0 rounded-full transition-all duration-200",
              isRecording && "scale-110 shadow-lg",
              isProcessing && "animate-pulse"
            )}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isRecording ? (
              <StopCircle className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>

          {/* Enhanced Text Input */}
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Frage ${coach.name}...`}
              className={cn(
                "min-h-[44px] max-h-32 resize-none rounded-2xl",
                isLargeScreen && "text-base",
                "transition-all duration-200"
              )}
              rows={1}
            />
          </div>

          {/* Enhanced Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isThinking}
            size="icon"
            className={cn(
              touchTargetClass,
              "shrink-0 rounded-full transition-all duration-200",
              inputText.trim() && !isThinking && "scale-105 shadow-md"
            )}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>

        {/* Voice Recording Indicator */}
        {(isRecording || isProcessing) && (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            {isRecording ? (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                Aufnahme läuft... (Antippen zum Stoppen)
              </>
            ) : (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verarbeite Sprache...
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};