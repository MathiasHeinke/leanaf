import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Send, StopCircle, Brain, X, MessageSquare } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface FloatingCoachChatProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSubmitMessage: () => void;
  onVoiceRecord: () => void;
  isThinking: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  chatHistory: Array<{role: 'user' | 'assistant', content: string}>;
  onClearChat: () => void;
}

export const FloatingCoachChat = ({
  inputText,
  setInputText,
  onSubmitMessage,
  onVoiceRecord,
  isThinking,
  isRecording,
  isProcessing,
  chatHistory,
  onClearChat
}: FloatingCoachChatProps) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const getLastCoachMessage = () => {
    const lastAssistantMessage = chatHistory
      .filter(msg => msg.role === 'assistant')
      .slice(-1)[0];
    return lastAssistantMessage?.content || null;
  };

  const lastCoachMessage = getLastCoachMessage();

  return (
    <div className="fixed bottom-6 left-4 right-4 z-50">
      <div className="max-w-md mx-auto">
        {/* Main Chat Input */}
        <Card className="glass-card shadow-xl border-2 border-accent/20">
          <div className="p-3">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-5 w-5 text-accent" />
              <span className="text-sm font-medium text-accent">kaloAI Coach</span>
              <div className="flex-1"></div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <MessageSquare className="h-3 w-3" />
              </Button>
            </div>
            
            {/* Input Area */}
            <div className="flex items-end gap-2">
              {/* Text Input */}
              <div className="flex-1">
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Frag deinen Coach..."
                  className="min-h-[44px] max-h-[120px] resize-none border-accent/20 focus-visible:ring-1 focus-visible:ring-accent focus-visible:border-accent text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (inputText.trim()) {
                        onSubmitMessage();
                      }
                    }
                  }}
                />
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col gap-1">
                {/* Voice Recording */}
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-9 w-9 p-0 transition-all duration-200 ${
                    isRecording || isProcessing
                      ? 'bg-red-500 hover:bg-red-600 text-white border-red-500 animate-pulse' 
                      : 'border-accent/20 hover:bg-accent/10 hover:border-accent'
                  }`}
                  onClick={onVoiceRecord}
                  disabled={isThinking || isProcessing}
                >
                  {isRecording ? (
                    <StopCircle className="h-4 w-4" />
                  ) : isProcessing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
                
                {/* Send Button */}
                <Button
                  size="sm"
                  className="h-9 w-9 p-0 bg-accent hover:bg-accent/90"
                  onClick={onSubmitMessage}
                  disabled={!inputText.trim() || isThinking}
                >
                  {isThinking ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Recording Indicator */}
          {(isRecording || isProcessing) && (
            <div className="px-3 pb-3">
              <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                <div className="flex gap-1">
                  <div className="w-1 h-3 bg-red-500 animate-pulse rounded"></div>
                  <div className="w-1 h-4 bg-red-500 animate-pulse rounded" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-3 bg-red-500 animate-pulse rounded" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="font-medium">{isRecording ? 'Aufnahme läuft...' : 'Verarbeitung...'}</span>
              </div>
            </div>
          )}

          {/* Last Coach Message Preview */}
          {lastCoachMessage && !isExpanded && (
            <div className="px-3 pb-3">
              <div className="p-2 bg-accent/5 rounded-lg border border-accent/10">
                <div className="flex items-start gap-2">
                  <Brain className="h-3 w-3 text-accent mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {lastCoachMessage}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Expanded Chat History */}
        {isExpanded && chatHistory.length > 0 && (
          <Card className="glass-card mt-2 shadow-xl border-2 border-accent/20 max-h-80 overflow-hidden">
            <div className="p-3">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">Chat-Verlauf</span>
                  <Badge variant="secondary" className="text-xs">{chatHistory.length}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm" 
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    onClick={onClearChat}
                    title="Chat löschen"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setIsExpanded(false)}
                    title="Schließen"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto space-y-3">
                {chatHistory.slice(-10).map((message, index) => (
                  <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-lg text-sm ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-accent/10 text-foreground border border-accent/20'
                    }`}>
                      {message.role === 'assistant' && (
                        <div className="flex items-center gap-1 mb-2">
                          <Brain className="h-3 w-3 text-accent" />
                          <span className="text-accent font-medium text-xs">kaloAI Coach</span>
                        </div>
                      )}
                      <p className="leading-relaxed">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};