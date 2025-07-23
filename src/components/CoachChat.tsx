
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Brain, 
  Send, 
  Mic, 
  StopCircle, 
  User,
  MessageSquare,
  Trash2,
  Loader2,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { useCoachLimitHandler } from "@/components/CoachLimitHandler";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  coach_personality: string;
}

interface CoachChatProps {
  coachPersonality?: string;
}

export const CoachChat = ({ coachPersonality = 'motivierend' }: CoachChatProps) => {
  const { user } = useAuth();
  const { handleLimitError } = useCoachLimitHandler();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentCoachPersonality, setCurrentCoachPersonality] = useState(coachPersonality);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording
  } = useVoiceRecording();

  // Monitor coach personality changes from database
  useEffect(() => {
    if (!user?.id) return;

    const checkCoachPersonality = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('coach_personality')
          .eq('user_id', user.id)
          .single();

        if (profile?.coach_personality && profile.coach_personality !== currentCoachPersonality) {
          console.log('Coach personality changed:', { 
            old: currentCoachPersonality, 
            new: profile.coach_personality 
          });
          
          // Clear chat when coach changes
          await clearChat(false); // Don't show toast during automatic clear
          setCurrentCoachPersonality(profile.coach_personality);
          
          // Generate new greeting with correct coach
          setTimeout(() => {
            generateCoachGreeting(profile.coach_personality);
          }, 500);
        }
      } catch (error) {
        console.error('Error checking coach personality:', error);
      }
    };

    // Check immediately and then every 2 seconds
    checkCoachPersonality();
    const interval = setInterval(checkCoachPersonality, 2000);

    return () => clearInterval(interval);
  }, [user?.id, currentCoachPersonality]);

  // Load chat history on component mount
  useEffect(() => {
    if (user?.id) {
      loadChatHistory();
    }
  }, [user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const generateCoachGreeting = async (personality: string) => {
    if (!user?.id) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();

      let userName = profile?.display_name;
      if (!userName || userName.trim() === '') {
        const userEmail = await supabase.auth.admin.getUserById(user.id);
        userName = userEmail.data.user?.email?.split('@')[0] || 'User';
      }
      
      const firstName = userName.split(' ')[0] || userName;

      const greetings = {
        hart: `Hey ${firstName}! 🎯 Sascha hier, dein neuer Drill-Instructor. Keine Zeit für Smalltalk - lass uns direkt loslegen! Was ist dein Ziel heute?`,
        soft: `Hallo liebe/r ${firstName}! ❤️ Ich bin Lucy, deine neue Ernährungsberaterin. Ich freue mich darauf, dich einfühlsam auf deinem Weg zu begleiten. Wie kann ich dir heute helfen?`,
        motivierend: `Hey ${firstName}! 💪 Kai hier, dein neuer Personal Trainer! Ich bin super motiviert, mit dir zusammenzuarbeiten und deine Ziele zu erreichen. Lass uns durchstarten!`
      };

      const greeting = greetings[personality as keyof typeof greetings] || greetings.motivierend;

      // Save the greeting message
      const savedMessage = await saveMessage('assistant', greeting);
      if (savedMessage) {
        const mappedMessage: ChatMessage = {
          id: savedMessage.id,
          role: savedMessage.message_role as 'user' | 'assistant',
          content: savedMessage.message_content,
          created_at: savedMessage.created_at,
          coach_personality: savedMessage.coach_personality
        };
        setMessages([mappedMessage]);
      }

    } catch (error) {
      console.error('Error generating coach greeting:', error);
    }
  };

  const loadChatHistory = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('coach_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Error loading chat history:', error);
        return;
      }

      const mappedMessages = (data || []).map(msg => ({
        id: msg.id,
        role: msg.message_role,
        content: msg.message_content,
        created_at: msg.created_at,
        coach_personality: msg.coach_personality
      })) as ChatMessage[];
      
      setMessages(mappedMessages);

      // If no messages exist, generate initial greeting
      if (mappedMessages.length === 0) {
        setTimeout(() => {
          generateCoachGreeting(currentCoachPersonality);
        }, 500);
      }
    } catch (error) {
      console.error('Error in loadChatHistory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('coach_conversations')
        .insert({
          user_id: user.id,
          message_role: role,
          message_content: content,
          coach_personality: currentCoachPersonality,
          context_data: {}
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving message:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in saveMessage:', error);
      return null;
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isThinking || !user?.id) return;

    const userMessage = inputText.trim();
    setInputText("");
    setIsThinking(true);

    try {
      // Save user message and add to UI
      const savedUserMessage = await saveMessage('user', userMessage);
      if (savedUserMessage) {
        const mappedMessage: ChatMessage = {
          id: savedUserMessage.id,
          role: savedUserMessage.message_role as 'user' | 'assistant',
          content: savedUserMessage.message_content,
          created_at: savedUserMessage.created_at,
          coach_personality: savedUserMessage.coach_personality
        };
        setMessages(prev => [...prev, mappedMessage]);
      }

      // Get comprehensive user data for context
      const [mealsData, workoutsData, sleepData, weightData, profileData, goalsData] = await Promise.all([
        supabase
          .from('meals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30),
        
        supabase
          .from('workouts')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(14),
        
        supabase
          .from('sleep_tracking')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(14),
        
        supabase
          .from('weight_history')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(30),
        
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        
        supabase
          .from('daily_goals')
          .select('*')
          .eq('user_id', user.id)
          .single()
      ]);

      // Call enhanced coach-chat function with current personality
      const { data: coachResponse, error } = await supabase.functions.invoke('coach-chat', {
        body: {
          message: userMessage,
          userId: user.id,
          coachPersonality: currentCoachPersonality,
          userData: {
            meals: mealsData.data || [],
            workouts: workoutsData.data || [],
            sleep: sleepData.data || [],
            weight: weightData.data || [],
            profile: profileData.data || {},
            goals: goalsData.data || {}
          },
          chatHistory: messages.slice(-10)
        }
      });

      if (error) {
        throw error;
      }

      const assistantMessage = coachResponse.response;

      // Save assistant message and add to UI
      const savedAssistantMessage = await saveMessage('assistant', assistantMessage);
      if (savedAssistantMessage) {
        const mappedMessage: ChatMessage = {
          id: savedAssistantMessage.id,
          role: savedAssistantMessage.message_role as 'user' | 'assistant',
          content: savedAssistantMessage.message_content,
          created_at: savedAssistantMessage.created_at,
          coach_personality: savedAssistantMessage.coach_personality
        };
        setMessages(prev => [...prev, mappedMessage]);
      }

    } catch (error: any) {
      console.error('Error sending message to coach:', error);
      
      // Use the new limit handler
      if (error.message?.includes('limit') || error.message?.includes('429')) {
        handleLimitError(error, 'coach_chat', currentCoachPersonality);
      } else {
        toast.error('Fehler beim Senden der Nachricht an den Coach');
        
        // Add error message to chat
        const errorMessage = "Entschuldigung, es gab einen technischen Fehler. Bitte versuche es noch einmal.";
        const savedErrorMessage = await saveMessage('assistant', errorMessage);
        if (savedErrorMessage) {
          const mappedMessage: ChatMessage = {
            id: savedErrorMessage.id,
            role: savedErrorMessage.message_role as 'user' | 'assistant',
            content: savedErrorMessage.message_content,
            created_at: savedErrorMessage.created_at,
            coach_personality: savedErrorMessage.coach_personality
          };
          setMessages(prev => [...prev, mappedMessage]);
        }
      }
    } finally {
      setIsThinking(false);
    }
  };

  const handleVoiceToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const clearChat = async (showToast = true) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('coach_conversations')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing chat:', error);
        if (showToast) {
          toast.error('Fehler beim Löschen des Chat-Verlaufs');
        }
        return;
      }

      setMessages([]);
      if (showToast) {
        toast.success('Chat-Verlauf gelöscht');
      }
    } catch (error) {
      console.error('Error in clearChat:', error);
      if (showToast) {
        toast.error('Fehler beim Löschen des Chat-Verlaufs');
      }
    }
  };

  const getCoachIcon = (personality: string) => {
    switch (personality) {
      case 'hart': return '🎯';
      case 'soft': return '❤️';
      case 'motivierend':
      default: return '💪';
    }
  };

  const getCoachName = (personality: string) => {
    switch (personality) {
      case 'hart': return 'Sascha';
      case 'soft': return 'Lucy';
      case 'motivierend':
      default: return 'Kai';
    }
  };

  if (isLoading) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Lade Chat-Verlauf...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">KaloAI Coach</span>
              <Badge variant="secondary" className="text-xs">
                {getCoachIcon(currentCoachPersonality)} {getCoachName(currentCoachPersonality)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground font-normal">
              Dein persönlicher Ernährungs- und Fitness-Coach
            </p>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearChat(true)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <Separator />
      
      <CardContent className="flex-1 flex flex-col p-4 gap-4">
        {/* Chat Messages */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">Starte eine Unterhaltung mit deinem Coach!</p>
                <p className="text-sm text-muted-foreground">
                  Frage nach Ernährungstipps, Trainingsempfehlungen oder lasse dir deine Fortschritte erklären.
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={message.id || index} className="space-y-2">
                  <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted border'
                    }`}>
                      {message.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="h-4 w-4 text-primary" />
                          <span className="text-xs font-medium text-primary">
                            {getCoachName(message.coach_personality || currentCoachPersonality)} ({getCoachIcon(message.coach_personality || currentCoachPersonality)})
                          </span>
                        </div>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {isThinking && (
              <div className="flex justify-start">
                <div className="max-w-[80%] bg-muted border rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-primary">
                      {getCoachName(currentCoachPersonality)} denkt nach...
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Frage deinen Coach etwas..."
              className="min-h-[60px] max-h-[120px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isThinking}
            />
          </div>
          
          <div className="flex flex-col gap-2">
            {/* Voice Button */}
            <Button
              variant={isRecording ? "destructive" : "outline"}
              size="sm"
              onClick={handleVoiceToggle}
              disabled={isThinking || isProcessing}
              className="h-10 w-10 p-0"
            >
              {isRecording ? (
                <StopCircle className="h-4 w-4" />
              ) : isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            
            {/* Send Button */}
            <Button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isThinking}
              className="h-10 w-10 p-0"
            >
              {isThinking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        {(isRecording || isProcessing) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
            <div className="flex gap-1">
              <div className="w-1 h-3 bg-red-500 animate-pulse rounded-full" />
              <div className="w-1 h-4 bg-red-500 animate-pulse rounded-full" style={{ animationDelay: '0.1s' }} />
              <div className="w-1 h-3 bg-red-500 animate-pulse rounded-full" style={{ animationDelay: '0.2s' }} />
            </div>
            <span>
              {isRecording ? 'Aufnahme läuft...' : 'Verarbeite Spracheingabe...'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
