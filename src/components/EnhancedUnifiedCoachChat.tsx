import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { Send, Loader2, Brain, Database, Clock, Zap, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEnhancedChat, EnhancedChatMessage } from '@/hooks/useEnhancedChat';
import { toast } from 'sonner';
import { ChatLayout } from '@/components/layouts/ChatLayout';
import { CollapsibleCoachHeader } from '@/components/CollapsibleCoachHeader';
import { EnhancedChatInput } from '@/components/EnhancedChatInput';

export interface CoachProfile {
  id: string;
  name: string;
  personality: string;
  expertise: string[];
  imageUrl?: string;
  color?: string;
  accentColor?: string;
  description?: string;
}

export interface EnhancedUnifiedCoachChatProps {
  mode: 'general' | 'nutrition' | 'training' | 'specialized';
  coach?: CoachProfile;
  onBack?: () => void;
  useFullscreenLayout?: boolean;
  enableAdvancedFeatures?: boolean;
}

const EnhancedUnifiedCoachChat: React.FC<EnhancedUnifiedCoachChatProps> = ({
  mode = 'general',
  coach,
  onBack,
  useFullscreenLayout = false,
  enableAdvancedFeatures = true
}) => {
  
  // ============= BASIC STATE =============
  const { user } = useAuth();
  const [messages, setMessages] = useState<EnhancedChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [chatInitialized, setChatInitialized] = useState(false);
  const [bannerCollapsed, setBannerCollapsed] = useState(false);
  
  // ============= REFS =============
  const initializationRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // ============= ENHANCED CHAT INTEGRATION =============
  const { 
    sendMessage: sendEnhancedMessage, 
    isLoading: isChatLoading, 
    error: chatError,
    lastMetadata,
    clearError,
    getConversationStats,
    conversationHistory,
    memoryContext,
    isMemoryUpdating
  } = useEnhancedChat({
    onError: (error) => {
      console.error('❌ Enhanced chat error:', error);
      
      const errorMessage: EnhancedChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '❌ Entschuldigung, es gab ein technisches Problem. Meine erweiterten Funktionen sind momentan nicht verfügbar, aber ich versuche es weiter.',
        created_at: new Date().toISOString(),
        coach_personality: coach?.id || 'lucy',
        coach_name: coach?.name || 'Coach',
        coach_avatar: coach?.imageUrl,
        coach_color: coach?.color,
        coach_accent_color: coach?.accentColor
      };
      
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Erweiterte Coach-Funktionen nicht verfügbar', {
        description: 'Grundfunktionen sind weiterhin verfügbar.'
      });
    },
    onSuccess: (response, metadata) => {
      console.log('✅ Enhanced chat response received:', { 
        responseLength: response.length,
        metadata
      });
      
      if (metadata?.hasMemory || metadata?.hasRag || metadata?.hasDaily) {
        toast.success('Coach-Antwort mit vollem Kontext', {
          description: `Memory: ${metadata.hasMemory ? '✅' : '❌'}, Wissen: ${metadata.hasRag ? '✅' : '❌'}, Tagesverlauf: ${metadata.hasDaily ? '✅' : '❌'}`
        });
      }
    },
    enableMemory: enableAdvancedFeatures,
    enableRag: enableAdvancedFeatures,
    enableProactive: enableAdvancedFeatures
  });
  
  // ============= CHAT INITIALIZATION =============
  useEffect(() => {
    if (!user?.id || initializationRef.current) return;
    
    initializationRef.current = true;
    
    const init = async () => {
      try {
        setIsLoading(true);
        
        // Load existing chat history for today
        const today = new Date().toISOString().split('T')[0];
        const { data: existingMessages, error: historyError } = await supabase
          .from('coach_conversations')
          .select('*')
          .eq('user_id', user.id)
          .eq('coach_personality', coach?.id || 'lucy')
          .eq('conversation_date', today)
          .order('created_at', { ascending: true });

        if (!historyError && existingMessages && existingMessages.length > 0) {
          const loadedMessages: EnhancedChatMessage[] = existingMessages.map(msg => ({
            id: msg.id,
            role: msg.message_role as 'user' | 'assistant',
            content: msg.message_content,
            created_at: msg.created_at,
            coach_personality: msg.coach_personality || coach?.id || 'lucy',
            coach_name: coach?.name || 'Coach',
            coach_avatar: coach?.imageUrl,
            coach_color: coach?.color,
            coach_accent_color: coach?.accentColor
          }));

          console.log(`📜 Loaded ${loadedMessages.length} existing messages for today`);
          setMessages(loadedMessages);
          setIsLoading(false);
          setChatInitialized(true);
          return;
        }

        // Create intelligent greeting using enhanced system
        console.log('🎯 No existing chat found, generating intelligent greeting...');
        
        if (enableAdvancedFeatures) {
          // Use enhanced system for personalized greeting
          const greeting = await sendEnhancedMessage(
            'Generiere eine personalisierte Begrüßung basierend auf meinem Profil und Verlauf.', 
            coach?.id || 'lucy',
            { isGreeting: true }
          );
          
          if (greeting) {
            const welcomeMsg: EnhancedChatMessage = {
              id: `welcome-${Date.now()}`,
              role: 'assistant',
              content: greeting,
              created_at: new Date().toISOString(),
              coach_personality: coach?.id || 'lucy',
              coach_name: coach?.name || 'Coach',
              coach_avatar: coach?.imageUrl,
              coach_color: coach?.color,
              coach_accent_color: coach?.accentColor,
              metadata: lastMetadata
            };
            
            setMessages([welcomeMsg]);
          } else {
            // Fallback to simple greeting
            const fallbackGreeting = getSimpleGreeting(coach?.id || 'lucy');
            const welcomeMsg: EnhancedChatMessage = {
              id: `welcome-${Date.now()}`,
              role: 'assistant',
              content: fallbackGreeting,
              created_at: new Date().toISOString(),
              coach_personality: coach?.id || 'lucy',
              coach_name: coach?.name || 'Coach',
              coach_avatar: coach?.imageUrl,
              coach_color: coach?.color,
              coach_accent_color: coach?.accentColor
            };
            
            setMessages([welcomeMsg]);
          }
        } else {
          // Simple greeting for basic mode
          const greeting = getSimpleGreeting(coach?.id || 'lucy');
          const welcomeMsg: EnhancedChatMessage = {
            id: `welcome-${Date.now()}`,
            role: 'assistant',
            content: greeting,
            created_at: new Date().toISOString(),
            coach_personality: coach?.id || 'lucy',
            coach_name: coach?.name || 'Coach',
            coach_avatar: coach?.imageUrl,
            coach_color: coach?.color,
            coach_accent_color: coach?.accentColor
          };
          
          setMessages([welcomeMsg]);
        }
        
        setIsLoading(false);
        setChatInitialized(true);
        
      } catch (error) {
        console.error('Error initializing enhanced chat:', error);
        setIsLoading(false);
        setChatInitialized(true);
      }
    };
    
    init();
  }, [user?.id, coach, enableAdvancedFeatures, sendEnhancedMessage, lastMetadata]);

  // ============= AUTO SCROLL =============
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ============= SEND MESSAGE =============
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || !user?.id || isChatLoading) return;
    
    const messageText = inputText.trim();
    setInputText('');
    
    // Create user message
    const userMessage: EnhancedChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      created_at: new Date().toISOString(),
      coach_personality: coach?.id || 'lucy',
      coach_name: coach?.name || 'Coach',
      coach_avatar: coach?.imageUrl,
      coach_color: coach?.color,
      coach_accent_color: coach?.accentColor
    };
    
    // Add user message to UI immediately
    setMessages(prev => [...prev, userMessage]);
    
    try {
      // Send to enhanced AI system
      const response = await sendEnhancedMessage(messageText, coach?.id || 'lucy');
      
      if (response) {
        // Create assistant message with metadata
        const assistantMessage: EnhancedChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response,
          created_at: new Date().toISOString(),
          coach_personality: coach?.id || 'lucy',
          coach_name: coach?.name || 'Coach',
          coach_avatar: coach?.imageUrl,
          coach_color: coach?.color,
          coach_accent_color: coach?.accentColor,
          metadata: lastMetadata
        };
        
        // Add assistant message to UI
        setMessages(prev => [...prev, assistantMessage]);
      }
      
    } catch (error) {
      console.error('Error sending enhanced message:', error);
    }
  }, [inputText, user?.id, coach, sendEnhancedMessage, isChatLoading, lastMetadata]);

  // ============= KEYBOARD HANDLERS =============
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ============= RENDER MESSAGE =============
  const renderMessage = (message: EnhancedChatMessage) => {
    const isUser = message.role === 'user';
    
    return (
      <div key={message.id} className={`flex gap-3 mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
        {!isUser && (
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={message.coach_avatar} />
            <AvatarFallback>{message.coach_name?.[0] || 'C'}</AvatarFallback>
          </Avatar>
        )}
        
        <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
          <div
            className={`p-3 rounded-lg ${
              isUser
                ? 'bg-primary text-primary-foreground ml-auto'
                : 'bg-muted'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
          
          {/* Enhanced metadata display */}
          <div className="flex items-center gap-2 mt-1 px-1">
            <p className="text-xs text-muted-foreground">
              {new Date(message.created_at).toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
            
            {/* Advanced features indicators */}
            {enableAdvancedFeatures && !isUser && message.metadata && (
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  {message.metadata.hasMemory && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="secondary" className="h-4 px-1 text-xs">
                          <Users className="w-3 h-3" />
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mit persönlichem Gedächtnis</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  
                  {message.metadata.hasRag && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="secondary" className="h-4 px-1 text-xs">
                          <Database className="w-3 h-3" />
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mit Wissensdatenbank</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  
                  {message.metadata.hasDaily && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="secondary" className="h-4 px-1 text-xs">
                          <Clock className="w-3 h-3" />
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mit Tagesverlauf</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  
                  {message.metadata.tokensUsed && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className="h-4 px-1 text-xs">
                          {message.metadata.tokensUsed}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Tokens verwendet: {message.metadata.tokensUsed}</p>
                        <p>Dauer: {message.metadata.duration}ms</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </TooltipProvider>
              </div>
            )}
          </div>
        </div>
        
        {isUser && (
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback>Du</AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  };

  // ============= RENDER TYPING INDICATOR =============
  const renderTypingIndicator = () => {
    if (!isChatLoading) return null;
    
    return (
      <div className="flex gap-3 mb-4 justify-start">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={coach?.imageUrl} />
          <AvatarFallback>{coach?.name?.[0] || 'C'}</AvatarFallback>
        </Avatar>
        <div className="bg-muted p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">
              {enableAdvancedFeatures ? 'Analysiert Kontext und antwortet...' : 'Tippt...'}
            </span>
            {enableAdvancedFeatures && (
              <div className="flex gap-1">
                <Brain className="w-3 h-3 text-primary animate-pulse" />
                {isMemoryUpdating && <Users className="w-3 h-3 text-blue-500 animate-pulse" />}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============= ENHANCED SEND MESSAGE HANDLER =============
  const handleEnhancedSendMessage = useCallback((message: string, mediaUrls?: string[], selectedTool?: string | null) => {
    // Combine message with media context
    let fullMessage = message;
    if (mediaUrls && mediaUrls.length > 0) {
      fullMessage += `\n\nAngehängte Medien: ${mediaUrls.join(', ')}`;
    }
    if (selectedTool) {
      fullMessage += `\n\nAusgewähltes Tool: ${selectedTool}`;
    }
    
    setInputText(fullMessage);
    handleSendMessage();
  }, [handleSendMessage]);

  // ============= FULLSCREEN LAYOUT =============
  if (useFullscreenLayout) {
    return (
      <ChatLayout 
        chatInput={
          <EnhancedChatInput
            inputText={inputText}
            setInputText={setInputText}
            onSendMessage={handleEnhancedSendMessage}
            isLoading={isChatLoading}
            placeholder={enableAdvancedFeatures ? "Nachricht eingeben... (mit vollem Kontext)" : "Nachricht eingeben..."}
          />
        }
        bannerCollapsed={bannerCollapsed}
      >
        {/* Collapsible Coach Header */}
        <CollapsibleCoachHeader
          coach={coach}
          onCollapseChange={setBannerCollapsed}
        />

        {/* Messages */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2">
              {enableAdvancedFeatures ? 'Erweiterte Coach-Funktionen werden geladen...' : 'Chat wird geladen...'}
            </span>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {messages.map(renderMessage)}
            {renderTypingIndicator()}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ChatLayout>
    );
  }

  // ============= CARD LAYOUT =============
  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          {coach?.imageUrl && (
            <Avatar className="w-8 h-8">
              <AvatarImage src={coach.imageUrl} />
              <AvatarFallback>{coach.name?.[0] || 'C'}</AvatarFallback>
            </Avatar>
          )}
          <span>{coach?.name || 'Coach'}</span>
          {enableAdvancedFeatures && (
            <Badge variant="secondary" className="ml-2">
              <Zap className="w-3 h-3 mr-1" />
              Enhanced
            </Badge>
          )}
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="ml-auto">
              Zurück
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <ScrollArea className="flex-1 px-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">
                {enableAdvancedFeatures ? 'Erweiterte Coach-Funktionen werden geladen...' : 'Chat wird geladen...'}
              </span>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map(renderMessage)}
              {renderTypingIndicator()}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="border-t bg-background p-4">
          <EnhancedChatInput
            inputText={inputText}
            setInputText={setInputText}
            onSendMessage={handleEnhancedSendMessage}
            isLoading={isChatLoading}
            placeholder={enableAdvancedFeatures ? "Nachricht eingeben... (mit vollem Kontext)" : "Nachricht eingeben..."}
          />
        </div>
      </CardContent>
    </Card>
  );
};

// ============= HELPER FUNCTIONS =============
function getSimpleGreeting(coachId: string): string {
  const greetings = {
    'lucy': [
      'Hey! 💗 Schön, dass du da bist! Ich habe alle meine Funktionen scharf gestellt und bin bereit für unser Gespräch.',
      'Hallo! ✨ Bereit für einen tollen Tag? Ich kann jetzt auf alles zugreifen, was du mir erzählt hast.',
      'Hi! 🌟 Was steht heute an? Ich hab mein Gedächtnis und mein Wissen dabei!'
    ],
    'sascha': [
      'Moin! 💪 Lass uns loslegen! Ich hab alle deine Daten dabei.',
      'Hey! ⚡ Bereit durchzustarten? Ich weiß noch, was wir letztes Mal besprochen haben.',
      'Servus! 🔥 Was ist das Ziel heute? Mein System läuft auf Vollgas!'
    ]
  };
  
  const options = greetings[coachId] || ['Hallo! 👋 Wie kann ich dir helfen? Meine erweiterten Funktionen sind aktiv!'];
  return options[Math.floor(Math.random() * options.length)];
}

export default EnhancedUnifiedCoachChat;