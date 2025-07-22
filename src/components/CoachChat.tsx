
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
  Sparkles,
  TrendingUp,
  Target
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
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
  userData?: any;
}

export const CoachChat = ({ coachPersonality = 'motivierend', userData }: CoachChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording
  } = useVoiceRecording();

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

  // Generate welcome message when userData is available
  useEffect(() => {
    if (userData && showWelcome && messages.length === 0) {
      generateWelcomeMessage();
    }
  }, [userData, showWelcome]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
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
    } catch (error) {
      console.error('Error in loadChatHistory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateWelcomeMessage = async () => {
    if (!user?.id || !userData) return;

    try {
      const { data: welcomeData, error } = await supabase.functions.invoke('coach-analysis', {
        body: {
          timeBasedGreeting: true,
          timeOfDay: getTimeOfDay(),
          userId: user.id,
          userData: {
            averages: calculateAverages(),
            historyDays: userData.recentMeals.length,
            weightHistory: userData.weightHistory.slice(0, 5),
            recentProgress: userData.todaysTotals
          }
        }
      });

      if (error) throw error;

      if (welcomeData?.greeting) {
        const welcomeMessage: ChatMessage = {
          id: 'welcome-' + Date.now(),
          role: 'assistant',
          content: welcomeData.greeting,
          created_at: new Date().toISOString(),
          coach_personality: coachPersonality
        };
        setMessages([welcomeMessage]);
        setShowWelcome(false);
      }
    } catch (error) {
      console.error('Error generating welcome message:', error);
    }
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'noon';
    return 'evening';
  };

  const calculateAverages = () => {
    if (!userData?.recentMeals?.length) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    
    const totals = userData.recentMeals.reduce((sum: any, meal: any) => ({
      calories: sum.calories + (meal.calories || 0),
      protein: sum.protein + (meal.protein || 0),
      carbs: sum.carbs + (meal.carbs || 0),
      fats: sum.fats + (meal.fats || 0),
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

    const days = userData.recentMeals.length;
    return {
      calories: Math.round(totals.calories / days),
      protein: Math.round(totals.protein / days),
      carbs: Math.round(totals.carbs / days),
      fats: Math.round(totals.fats / days)
    };
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
          coach_personality: coachPersonality,
          context_data: userData ? {
            todaysTotals: userData.todaysTotals,
            recentMeals: userData.recentMeals.slice(0, 3),
            dailyGoals: userData.dailyGoals
          } : {}
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

      // Call enhanced coach-chat function with full context
      const { data: coachResponse, error } = await supabase.functions.invoke('coach-chat', {
        body: {
          message: userMessage,
          userId: user.id,
          coachPersonality: coachPersonality,
          userData: userData,
          chatHistory: messages.slice(-10)
        }
      });

      if (error) {
        throw error;
      }

      const assistantMessage = coachResponse.response || coachResponse.reply;

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

    } catch (error) {
      console.error('Error sending message to coach:', error);
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
    } finally {
      setIsThinking(false);
    }
  };

  const handleVoiceToggle = async () => {
    if (isRecording) {
      const transcribedText = await stopRecording();
      if (transcribedText) {
        setInputText(prev => prev ? prev + ' ' + transcribedText : transcribedText);
        toast.success('Spracheingabe hinzugefügt');
      }
    } else {
      try {
        await startRecording();
      } catch (error) {
        toast.error('Fehler bei der Sprachaufnahme');
      }
    }
  };

  const clearChat = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('coach_conversations')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing chat:', error);
        toast.error('Fehler beim Löschen des Chat-Verlaufs');
        return;
      }

      setMessages([]);
      setShowWelcome(true);
      toast.success('Chat-Verlauf gelöscht');
    } catch (error) {
      console.error('Error in clearChat:', error);
      toast.error('Fehler beim Löschen des Chat-Verlaufs');
    }
  };

  const getCoachIcon = (personality: string) => {
    switch (personality) {
      case 'hart': return '🎯';
      case 'soft': return '😊';
      case 'lustig': return '😄';
      case 'ironisch': return '😏';
      case 'motivierend': return '💪';
      default: return '🤖';
    }
  };

  const quickPrompts = [
    { text: "Wie kann ich meine Ernährung verbessern?", icon: Target },
    { text: "Analysiere meinen heutigen Fortschritt", icon: TrendingUp },
    { text: "Gib mir Tipps für mein nächstes Workout", icon: Sparkles },
    { text: "Bewerte meine Kalorienbilanz der letzten Tage", icon: Brain }
  ];

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
      <CardContent className="flex-1 flex flex-col p-4 gap-4">
        {/* Chat Messages */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 mx-auto text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">Hallo! Ich bin dein KI-Coach</h3>
                <p className="text-muted-foreground mb-6">
                  Ich kenne deine Daten und kann dir personalisierte Tipps geben. Wähle eine Frage oder stelle deine eigene:
                </p>
                
                {/* Quick Prompts */}
                <div className="grid grid-cols-1 gap-2">
                  {quickPrompts.map((prompt, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start h-auto py-3 px-4"
                      onClick={() => setInputText(prompt.text)}
                    >
                      <prompt.icon className="h-4 w-4 mr-3 text-primary" />
                      <span className="text-sm">{prompt.text}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={message.id || index} className="space-y-2">
                  <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted border'
                    }`}>
                      {message.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="h-4 w-4 text-primary" />
                          <span className="text-xs font-medium text-primary">
                            Coach ({message.coach_personality || coachPersonality})
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
                <div className="max-w-[85%] bg-muted border rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-primary">Coach analysiert...</span>
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
        <div className="space-y-3">
          {/* Clear Chat Button */}
          {messages.length > 0 && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChat}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Chat löschen
              </Button>
            </div>
          )}

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
        </div>
      </CardContent>
    </Card>
  );
};
