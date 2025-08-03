import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSimpleChat } from '@/hooks/useSimpleChat';
import { toast } from 'sonner';
import { ChatLayout } from '@/components/layouts/ChatLayout';

// ============= TYPES =============
export interface SimpleMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  coach_personality: string;
  coach_name?: string;
  coach_avatar?: string;
  coach_color?: string;
  coach_accent_color?: string;
}

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

export interface SimpleUnifiedCoachChatProps {
  mode: 'general' | 'nutrition' | 'training' | 'specialized';
  coach?: CoachProfile;
  onBack?: () => void;
  useFullscreenLayout?: boolean;
}

const SimpleUnifiedCoachChat: React.FC<SimpleUnifiedCoachChatProps> = ({
  mode = 'general',
  coach,
  onBack,
  useFullscreenLayout = false
}) => {
  
  // ============= BASIC STATE =============
  const { user } = useAuth();
  const [messages, setMessages] = useState<SimpleMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [chatInitialized, setChatInitialized] = useState(false);
  
  // ============= REFS =============
  const initializationRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // ============= SIMPLE CHAT INTEGRATION =============
  const { sendMessage: sendChatMessage, isLoading: isChatLoading, error: chatError } = useSimpleChat({
    onError: (error) => {
      console.error('❌ Chat error:', error);
      
      // Show user-friendly error message
      const errorMessage: SimpleMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '❌ Entschuldigung, es gab ein technisches Problem. Bitte versuche es in einem Moment erneut.',
        created_at: new Date().toISOString(),
        coach_personality: coach?.personality || 'helpful',
        coach_name: coach?.name || 'Coach',
        coach_avatar: coach?.imageUrl,
        coach_color: coach?.color,
        coach_accent_color: coach?.accentColor
      };
      
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Coach-Verbindung fehlgeschlagen', {
        description: 'Bitte versuche es in einem Moment erneut.'
      });
    },
    onSuccess: (response) => {
      console.log('✅ Chat response received');
    }
  });
  
  // ============= CHAT INITIALIZATION =============
  useEffect(() => {
    if (!user?.id || initializationRef.current) return;
    
    initializationRef.current = true;
    
    const init = async () => {
      try {
        setIsLoading(true);
        
        // 1. Load existing chat history for today
        const today = new Date().toISOString().split('T')[0];
        const { data: existingMessages, error: historyError } = await supabase
          .from('coach_conversations')
          .select('*')
          .eq('user_id', user.id)
          .eq('coach_personality', coach?.id || 'lucy')
          .eq('conversation_date', today)
          .order('created_at', { ascending: true });

        if (!historyError && existingMessages && existingMessages.length > 0) {
          // Convert stored messages to SimpleMessage format
          const loadedMessages: SimpleMessage[] = existingMessages.map(msg => ({
            id: msg.id,
            role: msg.message_role as 'user' | 'assistant',
            content: msg.message_content,
            created_at: msg.created_at,
            coach_personality: msg.coach_personality || coach?.personality || 'motivierend',
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

        // 2. If no messages exist, create a simple greeting
        console.log('🎯 No existing chat found, creating greeting...');
        
        const greeting = getSimpleGreeting(coach?.id || 'lucy');
        
        const welcomeMsg: SimpleMessage = {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: greeting,
          created_at: new Date().toISOString(),
          coach_personality: coach?.personality || 'motivierend',
          coach_name: coach?.name || 'Coach',
          coach_avatar: coach?.imageUrl,
          coach_color: coach?.color,
          coach_accent_color: coach?.accentColor
        };

        // Save greeting to database
        await supabase.from('coach_conversations').insert({
          user_id: user.id,
          message_role: 'assistant',
          message_content: greeting,
          coach_personality: coach?.id || 'lucy',
          conversation_date: today
        });

        setMessages([welcomeMsg]);
        setIsLoading(false);
        setChatInitialized(true);
        
      } catch (error) {
        console.error('Error initializing chat:', error);
        setIsLoading(false);
        setChatInitialized(true);
      }
    };
    
    init();
  }, [user?.id, coach]);

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
    const userMessage: SimpleMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      created_at: new Date().toISOString(),
      coach_personality: coach?.personality || 'motivierend',
      coach_name: coach?.name || 'Coach',
      coach_avatar: coach?.imageUrl,
      coach_color: coach?.color,
      coach_accent_color: coach?.accentColor
    };
    
    // Add user message to UI
    setMessages(prev => [...prev, userMessage]);
    
    // Save user message to database
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('coach_conversations').insert({
      user_id: user.id,
      message_role: 'user',
      message_content: messageText,
      coach_personality: coach?.id || 'lucy',
      conversation_date: today
    });
    
    try {
      // Send to AI and get response
      const response = await sendChatMessage(messageText, coach?.id || 'lucy');
      
      if (response) {
        // Create assistant message
        const assistantMessage: SimpleMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response,
          created_at: new Date().toISOString(),
          coach_personality: coach?.personality || 'motivierend',
          coach_name: coach?.name || 'Coach',
          coach_avatar: coach?.imageUrl,
          coach_color: coach?.color,
          coach_accent_color: coach?.accentColor
        };
        
        // Add assistant message to UI
        setMessages(prev => [...prev, assistantMessage]);
        
        // Save assistant message to database
        await supabase.from('coach_conversations').insert({
          user_id: user.id,
          message_role: 'assistant',
          message_content: response,
          coach_personality: coach?.id || 'lucy',
          conversation_date: today
        });
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [inputText, user?.id, coach, sendChatMessage, isChatLoading]);

  // ============= KEYBOARD HANDLERS =============
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ============= RENDER MESSAGE =============
  const renderMessage = (message: SimpleMessage) => {
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
          <p className="text-xs text-muted-foreground mt-1 px-1">
            {new Date(message.created_at).toLocaleTimeString('de-DE', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
        
        {isUser && (
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback>Du</AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  };

  // ============= RENDER =============
  if (useFullscreenLayout) {
    return (
      <div className="fixed inset-0 flex flex-col bg-background text-foreground">
        {/* Header */}
        <div className="border-b bg-background p-4 flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              ← Zurück
            </Button>
          )}
          {coach?.imageUrl && (
            <Avatar className="w-8 h-8">
              <AvatarImage src={coach.imageUrl} />
              <AvatarFallback>{coach.name?.[0] || 'C'}</AvatarFallback>
            </Avatar>
          )}
          <h1 className="text-lg font-semibold">{coach?.name || 'Coach'}</h1>
        </div>
        
        <div className="flex flex-col flex-1 min-h-0">
          {/* Messages */}
          <ScrollArea className="flex-1 px-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="ml-2">Chat wird geladen...</span>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {messages.map(renderMessage)}
                {isChatLoading && (
                  <div className="flex gap-3 mb-4 justify-start">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={coach?.imageUrl} />
                      <AvatarFallback>{coach?.name?.[0] || 'C'}</AvatarFallback>
                    </Avatar>
                    <div className="bg-muted p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Tippt...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="border-t bg-background p-4">
            <div className="flex gap-2">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Nachricht eingeben..."
                className="flex-1 min-h-[60px] resize-none"
                disabled={isChatLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isChatLoading}
                size="icon"
                className="self-end mb-2"
              >
                {isChatLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              <span className="ml-2">Chat wird geladen...</span>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map(renderMessage)}
              {isChatLoading && (
                <div className="flex gap-3 mb-4 justify-start">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={coach?.imageUrl} />
                    <AvatarFallback>{coach?.name?.[0] || 'C'}</AvatarFallback>
                  </Avatar>
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Tippt...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="border-t bg-background p-4">
          <div className="flex gap-2">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nachricht eingeben..."
              className="flex-1 min-h-[60px] resize-none"
              disabled={isChatLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isChatLoading}
              size="icon"
              className="self-end mb-2"
            >
              {isChatLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============= HELPER FUNCTIONS =============
function getSimpleGreeting(coachId: string): string {
  const greetings = {
    'lucy': [
      'Hey! 💗 Wie kann ich dir heute helfen?',
      'Hallo! ✨ Bereit für einen tollen Tag?',
      'Hi! 🌟 Was steht heute an?'
    ],
    'sascha': [
      'Moin! 💪 Lass uns loslegen!',
      'Hey! ⚡ Bereit durchzustarten?',
      'Servus! 🔥 Was ist das Ziel heute?'
    ],
    'kai': [
      'Hey! ⚡ Energie da für heute?',
      'Moin! 🚀 Lass uns Gas geben!',
      'Hi! 💫 Ready für Action?'
    ],
    'markus': [
      'Hajo! 🔥 Ballern wir heute?',
      'Servus! 💪 Schaffe was drauf?',
      'Hey Jung! ⚡ Los geht\'s!'
    ],
    'dr_vita': [
      'Hallo! 🌸 Wie geht es dir heute?',
      'Guten Tag! 💚 Bereit für Gesundheit?',
      'Hallo! 🌿 Alles im grünen Bereich?'
    ],
    'sophia': [
      'Namaste! 🌿 Bereit für Achtsamkeit?',
      'Hallo! 🧘‍♀️ Los in den Flow?',
      'Hi! ✨ Achtsam in den Tag starten?'
    ]
  };
  
  const options = greetings[coachId] || ['Hallo! 👋 Wie kann ich dir helfen?'];
  return options[Math.floor(Math.random() * options.length)];
}

export default SimpleUnifiedCoachChat;