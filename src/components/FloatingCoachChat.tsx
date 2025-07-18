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
      <div className="max-w-sm mx-auto">
        {/* Main Chat Input */}
        <Card className="glass-card shadow-xl border-2 border-accent/20">
          <div className="flex items-end gap-2">
            {/* Coach Icon & Expand Button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-accent/10 flex-shrink-0"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Brain className="h-4 w-4 text-accent" />
            </Button>
            
            {/* Text Input */}
            <div className="flex-1">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Frag deinen Coach..."
                className="min-h-[40px] max-h-[100px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-sm"
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
            <div className="flex items-center gap-1 pb-1">
              {/* Voice Recording */}
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 transition-all duration-200 ${
                  isRecording || isProcessing
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                    : 'hover:bg-accent/10'
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
                className="h-8 w-8 p-0 bg-accent hover:bg-accent/90"
                onClick={onSubmitMessage}
                disabled={!inputText.trim() || isThinking}
              >
                {isThinking ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          {/* Recording Indicator */}
          {(isRecording || isProcessing) && (
            <div className="mt-2 flex items-center gap-2 text-sm text-red-500">
              <div className="flex gap-1">
                <div className="w-1 h-3 bg-red-500 animate-pulse rounded"></div>
                <div className="w-1 h-4 bg-red-500 animate-pulse rounded" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1 h-3 bg-red-500 animate-pulse rounded" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span>{isRecording ? 'Aufnahme...' : 'Verarbeitung...'}</span>
            </div>
          )}

          {/* Last Coach Message Preview */}
          {lastCoachMessage && !isExpanded && (
            <div className="mt-2 p-2 bg-accent/5 rounded-lg border border-accent/10">
              <div className="flex items-start gap-2">
                <Brain className="h-3 w-3 text-accent mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {lastCoachMessage}
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Expanded Chat History */}
        {isExpanded && chatHistory.length > 0 && (
          <Card className="glass-card mt-2 shadow-xl border-2 border-accent/20 max-h-64 overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">Chat-Verlauf</span>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm" 
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={onClearChat}
                >
                  <X className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsExpanded(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              {chatHistory.slice(-8).map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-2 rounded-lg text-xs ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-accent/10 text-foreground border border-accent/20'
                  }`}>
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-1 mb-1">
                        <Brain className="h-3 w-3 text-accent" />
                        <span className="text-accent font-medium">Coach</span>
                      </div>
                    )}
                    <p>{message.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};