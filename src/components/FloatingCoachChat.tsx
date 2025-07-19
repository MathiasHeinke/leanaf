import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Send, StopCircle, Brain, X, History } from "lucide-react";
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
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <div className="max-w-sm mx-auto">
        {/* Main Chat Input - Kompakter ohne Header */}
        <div className="glass-card dark:glass-card-dark rounded-2xl p-3 shadow-xl border border-white/20 dark:border-gray-700/20 backdrop-blur-xl">
          
          {/* Input Area */}
          <div className="flex items-end gap-2">
            {/* Text Input */}
            <div className="flex-1">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Frag deinen Coach..."
                className="min-h-[40px] max-h-[100px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-sm placeholder:text-muted-foreground/60 rounded-xl px-3 py-2"
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
            <div className="flex items-center gap-1">
              {/* Chat History Toggle - nur anzeigen wenn Chat-Verlauf vorhanden */}
              {chatHistory.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-9 w-9 p-0 rounded-xl transition-all duration-200 border ${
                    isExpanded 
                      ? 'bg-accent/10 border-accent/20 text-accent' 
                      : 'border-transparent hover:border-primary/20 hover:bg-primary/5'
                  }`}
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? "Verlauf ausblenden" : "Chat-Verlauf anzeigen"}
                >
                  <History className="h-4 w-4" />
                </Button>
              )}
              
              {/* Voice Recording */}
              {/* Voice Recording */}
              <Button
                variant="ghost"
                size="sm"
                className={`h-9 w-9 p-0 rounded-xl transition-all duration-200 border ${
                  isRecording || isProcessing
                    ? 'bg-red-500 hover:bg-red-600 text-white border-red-300 animate-glow' 
                    : 'border-transparent hover:border-primary/20 hover:bg-primary/10'
                }`}
                onClick={onVoiceRecord}
                disabled={isThinking || isProcessing}
              >
                {isRecording ? (
                  <StopCircle className="h-4 w-4" />
                ) : isProcessing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : (
                  <Mic className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                )}
              </Button>
              
              {/* Send Button */}
              <Button
                size="sm"
                className={`h-9 w-9 p-0 rounded-xl transition-all duration-200 ${
                  !inputText.trim() || isThinking
                    ? 'opacity-50 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary to-primary-glow hover:shadow-lg'
                }`}
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
            <div className="mt-3 flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-xl border border-red-200 dark:border-red-800/50 animate-fade-in">
              <div className="flex gap-1">
                <div className="w-1 h-3 bg-red-500 animate-pulse rounded-full"></div>
                <div className="w-1 h-4 bg-red-500 animate-pulse rounded-full" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1 h-3 bg-red-500 animate-pulse rounded-full" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="font-medium">{isRecording ? 'Aufnahme läuft...' : 'Verarbeitung...'}</span>
            </div>
          )}

          {/* Last Coach Message Preview */}
          {lastCoachMessage && !isExpanded && (
            <div className="mt-3 p-2 bg-accent/5 rounded-xl border border-accent/10">
              <div className="flex items-start gap-2">
                <Brain className="h-3 w-3 text-accent mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {lastCoachMessage}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Expanded Chat History */}
        {isExpanded && chatHistory.length > 0 && (
          <div className="glass-card dark:glass-card-dark mt-2 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/20 max-h-64 overflow-hidden backdrop-blur-xl">
            <div className="p-3">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-accent" />
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
          </div>
        )}
      </div>
    </div>
  );
};