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
import { TypingIndicator } from '@/components/TypingIndicator';
import { useAuth } from '@/hooks/useAuth';
import { useEnhancedChat, EnhancedChatMessage } from '@/hooks/useEnhancedChat';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import { ChatLayout } from '@/components/layouts/ChatLayout';
import { CollapsibleCoachHeader } from '@/components/CollapsibleCoachHeader';
import { EnhancedChatInput } from '@/components/EnhancedChatInput';
import { getCurrentDateString } from '@/utils/dateHelpers';

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
    clearHistory,
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
    if (!user?.id) return;
    
    // Always reinitialize when user or coach changes
    const init = async () => {
      console.log(`🔄 Initializing chat for user ${user.id}, coach ${coach?.id || 'lucy'}`);
      initializationRef.current = true;
    
      try {
        setIsLoading(true);
        setMessages([]);  // Clear old messages first
        
        // Load existing chat history for today
        const today = getCurrentDateString();
        console.log(`🔍 Loading chat history for user ${user.id}, coach ${coach?.id || 'lucy'}, date ${today}`);
        
        const { data: existingMessages, error: historyError } = await supabase
          .from('coach_conversations')
          .select('*')
          .eq('user_id', user.id)
          .eq('coach_personality', coach?.id || 'lucy')
          .eq('conversation_date', today)
          .order('created_at', { ascending: true });

        console.log(`📊 History query result:`, { error: historyError, count: existingMessages?.length || 0 });

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

          console.log(`📜 Successfully loaded ${loadedMessages.length} existing messages for today`);
          setMessages(loadedMessages);
          setIsLoading(false);
          setChatInitialized(true);
          return;
        } else if (historyError) {
          console.error('❌ Error loading chat history:', historyError);
        } else {
          console.log('ℹ️ No existing chat history found for today');
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
    
    // Always reset and initialize on user/coach change
    initializationRef.current = false;
    init();
  }, [user?.id, coach?.id]);

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

  // ============= USER AVATAR HELPER =============
  const [userProfile, setUserProfile] = useState<any>(null);
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('profile_avatar_url, avatar_type, avatar_preset_id')
        .eq('user_id', user.id)
        .single();
      
      setUserProfile(data);
    };
    
    fetchUserProfile();
  }, [user?.id]);
  
  const getUserAvatarUrl = () => {
    if (!userProfile) return null;
    
    if (userProfile.avatar_type === 'uploaded' && userProfile.profile_avatar_url) {
      return userProfile.profile_avatar_url;
    }
    
    if (userProfile.avatar_type === 'preset' && userProfile.avatar_preset_id) {
      return `/avatars/preset/avatar-${userProfile.avatar_preset_id}.png`;
    }
    
    return null;
  };

  // ============= RENDER MESSAGE =============
  const renderMessage = (message: EnhancedChatMessage) => {
    const isUser = message.role === 'user';
    const userAvatarUrl = getUserAvatarUrl();
    
    return (
      <div key={message.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-4`}>
        {/* Message Bubble */}
        <div
          className={`max-w-[75%] px-3 py-2 ${
            isUser
              ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md'
              : 'bg-muted rounded-2xl rounded-bl-md'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Footer unter der Bubble */}
        <div className="mt-3">
          {/* Coach layout: Avatar left, time right */}
          {!isUser && (
            <div className="flex items-center justify-start gap-2 text-xs">
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarImage src={message.coach_avatar} />
                <AvatarFallback className="text-xs bg-muted">
                  {message.coach_name?.[0] || 'C'}
                </AvatarFallback>
              </Avatar>
              <span className="text-muted-foreground">
                {new Date(message.created_at).toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              
              {/* Advanced features indicators */}
              {enableAdvancedFeatures && message.metadata && (
                <div className="flex gap-1">
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
          )}
          
          {/* User layout: Time left, avatar right */}
          {isUser && (
            <div className="flex items-center justify-end gap-2 text-xs">
              <span className="text-muted-foreground">
                {new Date(message.created_at).toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarImage src={userAvatarUrl || undefined} />
                <AvatarFallback className="text-xs bg-muted">Du</AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============= RENDER TYPING INDICATOR =============
  const renderTypingIndicator = () => {
    if (!isChatLoading) return null;
    
    return <TypingIndicator name={coach?.name || 'Coach'} />;
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
            placeholder="Nachricht eingeben..."
          />
        }
        bannerCollapsed={bannerCollapsed}
      >
        {/* Collapsible Coach Header */}
        <CollapsibleCoachHeader
          coach={coach}
          onCollapseChange={setBannerCollapsed}
          onDailyReset={() => {
            setMessages([]);
            clearHistory();
          }}
        />

        {/* Messages */}
        {isLoading ? (
          <div className="space-y-4 py-4">
            <TypingIndicator name={coach?.name || 'Coach'} />
            <div ref={messagesEndRef} />
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
            <div className="space-y-4 py-4">
              <TypingIndicator name={coach?.name || 'Coach'} />
              <div ref={messagesEndRef} />
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
            placeholder="Nachricht eingeben..."
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