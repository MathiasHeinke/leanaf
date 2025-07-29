import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft,
  Send, 
  Mic, 
  StopCircle, 
  Paperclip,
  X
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useMobileOptimizations } from '@/hooks/useMobileOptimizations';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { MediaUploadZone } from '@/components/MediaUploadZone';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  coach_personality: string;
  images?: string[];
}

interface CoachProfile {
  id: string;
  name: string;
  avatar: string;
  color: string;
  personality: string;
  quickActions: Array<{
    text: string;
    prompt: string;
  }>;
}

interface EnhancedMobileCoachChatProps {
  coach: CoachProfile;
  onBack: () => void;
  messages: ChatMessage[];
  inputText: string;
  setInputText: (text: string) => void;
  isThinking: boolean;
  onSendMessage: (message: string, images?: string[]) => void;
  onQuickAction: (prompt: string) => void;
  uploadedImages: string[];
  onImageUpload: (urls: string[]) => void;
  onRemoveImage: (index: number) => void;
  showMediaUpload: boolean;
  setShowMediaUpload: (show: boolean) => void;
}

export const EnhancedMobileCoachChat: React.FC<EnhancedMobileCoachChatProps> = ({
  coach,
  onBack,
  messages,
  inputText,
  setInputText,
  isThinking,
  onSendMessage,
  onQuickAction,
  uploadedImages,
  onImageUpload,
  onRemoveImage,
  showMediaUpload,
  setShowMediaUpload
}) => {
  const { hapticFeedback, viewport } = useMobileOptimizations();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording
  } = useVoiceRecording();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // Handle keyboard visibility
  useEffect(() => {
    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const wasKeyboardOpen = isKeyboardOpen;
      const keyboardOpen = currentHeight < viewport.height * 0.75;
      
      setIsKeyboardOpen(keyboardOpen);
      
      // Auto-scroll when keyboard opens/closes
      if (wasKeyboardOpen !== keyboardOpen) {
        setTimeout(scrollToBottom, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewport.height, isKeyboardOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'nearest'
    });
  };

  const handleSend = () => {
    if (inputText.trim() || uploadedImages.length > 0) {
      hapticFeedback('light');
      onSendMessage(inputText, uploadedImages);
      setInputText('');
    }
  };

  const handleVoiceToggle = () => {
    hapticFeedback('medium');
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleQuickActionClick = (prompt: string) => {
    hapticFeedback('selection');
    onQuickAction(prompt);
  };

  const handleBackClick = () => {
    hapticFeedback('medium');
    onBack();
  };

  const handleMediaUploadToggle = () => {
    hapticFeedback('light');
    setShowMediaUpload(!showMediaUpload);
  };

  const dynamicHeight = isKeyboardOpen 
    ? 'calc(100vh - 320px)' 
    : 'calc(100vh - 180px)';

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Enhanced Mobile Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleBackClick}
          className="min-w-[44px] h-[44px] p-0 flex items-center justify-center"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-3 flex-1">
          <div className="text-2xl">{coach.avatar}</div>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-base truncate">{coach.name}</h1>
            <p className="text-xs text-muted-foreground truncate">{coach.personality}</p>
          </div>
        </div>
      </div>

      {/* Messages Area with Dynamic Height */}
      <ScrollArea 
        className="flex-1 px-4"
        style={{ height: dynamicHeight }}
      >
        <div className="space-y-4 py-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground ml-4'
                    : 'bg-muted mr-4'
                } shadow-sm`}
              >
                {message.images && message.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {message.images.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`Uploaded ${index + 1}`}
                        className="rounded-lg w-full h-32 object-cover"
                      />
                    ))}
                  </div>
                )}
                <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-3 max-w-[85%] mr-4">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                  <span className="text-sm text-muted-foreground">Denkt nach...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      {messages.length > 0 && (
        <div className="px-4 py-2">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {coach.quickActions.slice(0, 3).map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleQuickActionClick(action.prompt)}
                className="whitespace-nowrap text-xs px-3 py-2 h-8 min-w-[44px] bg-muted/50 flex-shrink-0"
              >
                {action.text}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Input Area */}
      <div className="p-4 border-t bg-card/50 backdrop-blur-md">
        {/* Image Preview */}
        {uploadedImages.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
            {uploadedImages.map((image, index) => (
              <div key={index} className="relative flex-shrink-0">
                <img
                  src={image}
                  alt={`Upload ${index + 1}`}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onRemoveImage(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Media Upload Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMediaUploadToggle}
            className="min-w-[44px] h-[44px] p-0 flex-shrink-0"
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Schreib deine Nachricht..."
              className="min-h-[44px] max-h-32 resize-none rounded-2xl px-4 py-3 text-base"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          </div>

          {/* Voice/Send Button */}
          <Button
            variant={inputText.trim() || uploadedImages.length > 0 ? "default" : "ghost"}
            size="sm"
            onClick={inputText.trim() || uploadedImages.length > 0 ? handleSend : handleVoiceToggle}
            disabled={isProcessing}
            className={`min-w-[44px] h-[44px] p-0 flex-shrink-0 rounded-full ${
              isRecording ? 'bg-destructive hover:bg-destructive/90' : ''
            }`}
          >
            {inputText.trim() || uploadedImages.length > 0 ? (
              <Send className="h-5 w-5" />
            ) : isRecording ? (
              <StopCircle className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Media Upload Zone */}
        {showMediaUpload && (
          <div className="mt-3 p-3 border rounded-lg bg-muted/50">
            <MediaUploadZone
              onMediaUploaded={onImageUpload}
            />
          </div>
        )}
      </div>
    </div>
  );
};