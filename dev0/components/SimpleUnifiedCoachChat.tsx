import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOrchestrator } from '@/hooks/useOrchestrator';
import { toast } from 'sonner';
import { ChatLayout } from '@/components/layouts/ChatLayout';
import ChoiceBar from '@/components/ChoiceBar';
import ConfirmMealModal from '@/components/ConfirmMealModal';

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
  
// ============= ORCHESTRATOR INTEGRATION =============
const { sendEvent } = useOrchestrator();
const [isSending, setIsSending] = useState(false);
const [clarify, setClarify] = useState<{ prompt: string; options: string[] } | null>(null);
const [confirm, setConfirm] = useState<{ open: boolean; prompt: string; proposal: any } | null>(null);
  
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

// Helper to append assistant messages with simple de-duplication
const pushAssistant = (text: string) => {
  setMessages(prev => {
    const last = prev[prev.length - 1];
    if (last?.role === 'assistant' && last?.content?.trim() === text.trim()) {
      return prev; // duplicate → skip
    }
    const msg: SimpleMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: text,
      created_at: new Date().toISOString(),
      coach_personality: coach?.personality || 'motivierend',
      coach_name: coach?.name || 'Coach',
      coach_avatar: coach?.imageUrl,
      coach_color: coach?.color,
      coach_accent_color: coach?.accentColor
    };
    return [...prev, msg];
  });
};

// ============= SEND MESSAGE =============
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || !user?.id || isSending) return;

    const messageText = inputText.trim();
    setInputText('');

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

    setMessages(prev => [...prev, userMessage]);

    const today = new Date().toISOString().split('T')[0];
    await supabase.from('coach_conversations').insert({
      user_id: user.id,
      message_role: 'user',
      message_content: messageText,
      coach_personality: coach?.id || 'lucy',
      conversation_date: today
    });

    setIsSending(true);
    setClarify(null);
    try {
      const reply = await sendEvent(user.id, {
        type: 'TEXT',
        text: messageText,
        clientEventId: crypto.randomUUID(),
        context: { source: 'chat', coachMode: (mode === 'training' ? 'training' : mode === 'nutrition' ? 'nutrition' : 'general'), coachId: coach?.id || 'lucy' }
      });

      console.debug('[orchestrator.reply]', { traceId: (reply as any)?.traceId, kind: (reply as any)?.kind, text: (reply as any)?.text?.slice?.(0, 60) || (reply as any)?.prompt?.slice?.(0, 60) });
      if (reply.kind === 'message') {
        pushAssistant(reply.text);
        await supabase.from('coach_conversations').insert({
          user_id: user.id,
          message_role: 'assistant',
          message_content: reply.text,
          coach_personality: coach?.id || 'lucy',
          conversation_date: today,
          context_data: { traceId: reply.traceId }
        });
      } else if (reply.kind === 'clarify') {
        pushAssistant(reply.prompt);
        setClarify({ prompt: reply.prompt, options: reply.options });
      } else if (reply.kind === 'confirm_save_meal') {
        pushAssistant(reply.prompt);
        setConfirm({ open: true, prompt: reply.prompt, proposal: reply.proposal });
      }
    } catch (error) {
      console.error('Error sending message via orchestrator:', error);
      toast.error('Coach-Verbindung fehlgeschlagen', { description: 'Bitte versuche es in einem Moment erneut.' });
    } finally {
      setIsSending(false);
    }
  }, [inputText, user?.id, coach, mode, sendEvent, isSending]);

  const handleClarifyPick = useCallback(async (value: string) => {
    if (!user?.id || isSending) return;
    setClarify(null);
    const today = new Date().toISOString().split('T')[0];

    // Echo user's clarify choice
    const userMsg: SimpleMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: value,
      created_at: new Date().toISOString(),
      coach_personality: coach?.personality || 'motivierend',
      coach_name: coach?.name || 'Coach',
      coach_avatar: coach?.imageUrl,
      coach_color: coach?.color,
      coach_accent_color: coach?.accentColor
    };
    setMessages(prev => [...prev, userMsg]);
    await supabase.from('coach_conversations').insert({
      user_id: user.id,
      message_role: 'user',
      message_content: value,
      coach_personality: coach?.id || 'lucy',
      conversation_date: today
    });

    setIsSending(true);
    try {
      const reply = await sendEvent(user.id, {
        type: 'TEXT',
        text: value,
        clientEventId: crypto.randomUUID(),
        context: { source: 'chat', coachMode: (mode === 'training' ? 'training' : mode === 'nutrition' ? 'nutrition' : 'general'), coachId: coach?.id || 'lucy', followup: true }
      });
      console.debug('[orchestrator.reply]', { traceId: (reply as any)?.traceId, kind: (reply as any)?.kind, text: (reply as any)?.text?.slice?.(0, 60) || (reply as any)?.prompt?.slice?.(0, 60) });
      if (reply.kind === 'message') {
        pushAssistant(reply.text);
        await supabase.from('coach_conversations').insert({
          user_id: user.id,
          message_role: 'assistant',
          message_content: reply.text,
          coach_personality: coach?.id || 'lucy',
          conversation_date: today,
          context_data: { traceId: reply.traceId }
        });
      } else if (reply.kind === 'clarify') {
        pushAssistant(reply.prompt);
        setClarify({ prompt: reply.prompt, options: reply.options });
      } else if (reply.kind === 'confirm_save_meal') {
        pushAssistant(reply.prompt);
        setConfirm({ open: true, prompt: reply.prompt, proposal: reply.proposal });
      }
    } catch (err) {
      console.error('Clarify follow-up failed', err);
      toast.error('Konnte Nachfrage nicht verarbeiten');
    } finally {
      setIsSending(false);
    }
  }, [user?.id, coach, mode, sendEvent, isSending]);

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
                {isSending && (
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
                {clarify && (
                  <ChoiceBar prompt={clarify.prompt} options={clarify.options} onPick={handleClarifyPick} />
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
      'Hey! ✨',
      'Hi! 💗',
      'Hey! 🌟'
    ],
    'sascha': [
      'Moin!',
      'Hey!',
      'Moin! 💪'
    ],
    'kai': [
      'Hey! 🙏',
      'Hi! ⚡',
      'Hey! 💫'
    ],
    'ares': [
      'Ei gude!',
      'Morsche!',
      'NʼAbend!'
    ],
    'dr_vita': [
      'Hey! 🌸',
      'Hi! 💚',
      'Hey! 🌿'
    ],
    'sophia': [
      'Hey! 🌿',
      'Hi! 🧘‍♀️',
      'Hey! ✨'
    ]
  };
  
  const options = greetings[coachId] || ['Hallo! 👋 Wie kann ich dir helfen?'];
  return options[Math.floor(Math.random() * options.length)];
}

export default SimpleUnifiedCoachChat;