
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
  Target,
  TrendingUp,
  Apple,
  Dumbbell,
  CalendarDays
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

interface ChatCoachProps {
  todaysTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  dailyGoals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  } | null;
  averages: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  historyData: any[];
  trendData: any;
  weightHistory: any[];
}

export const ChatCoach = ({ 
  todaysTotals, 
  dailyGoals, 
  averages, 
  historyData, 
  trendData, 
  weightHistory 
}: ChatCoachProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [coachPersonality, setCoachPersonality] = useState('motivierend');
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording
  } = useVoiceRecording();

  // Quick Action buttons
  const quickActions = [
    {
      icon: Target,
      text: "Wie kann ich mein Ziel erreichen?",
      prompt: "Analysiere meine aktuellen Daten und gib mir konkrete Tipps, wie ich mein Ziel erreichen kann."
    },
    {
      icon: TrendingUp,
      text: "Analysiere meine letzte Woche",
      prompt: "Analysiere meinen Fortschritt der letzten Woche und gib mir Feedback zu meiner Entwicklung."
    },
    {
      icon: Apple,
      text: "Gib mir Meal-Vorschläge",
      prompt: "Basierend auf meinen Zielen und bisherigen Mahlzeiten, welche Meals empfiehlst du mir für heute?"
    },
    {
      icon: Dumbbell,
      text: "Erstelle einen Trainingsplan",
      prompt: "Erstelle mir einen Trainingsplan, der zu meinen Zielen und meinem aktuellen Fortschritt passt."
    },
    {
      icon: CalendarDays,
      text: "Wie ist mein Fortschritt?",
      prompt: "Gib mir eine detaillierte Analyse meines aktuellen Fortschritts und was ich verbessern kann."
    }
  ];

  // Load coach personality and chat history
  useEffect(() => {
    if (user?.id) {
      loadCoachPersonality();
      loadChatHistory();
      generateWelcomeMessage();
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

  const loadCoachPersonality = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('coach_personality')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading coach personality:', error);
        return;
      }

      setCoachPersonality(data?.coach_personality || 'motivierend');
    } catch (error) {
      console.error('Error in loadCoachPersonality:', error);
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
        .limit(20); // Last 20 messages

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
    if (!user?.id || messages.length > 0) return;

    const welcomeMessage = "Hallo! Ich bin dein persönlicher Coach. Ich kann dir bei allem rund um deine Ernährung, dein Training und deine Ziele helfen. Was möchtest du wissen?";
    
    const savedMessage = await saveMessage('assistant', welcomeMessage);
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

  const handleSendMessage = async (messageText?: string) => {
    const userMessage = messageText || inputText.trim();
    if (!userMessage || isThinking || !user?.id) return;

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
          chatHistory: messages.slice(-10), // Last 10 messages for context
          userData: {
            todaysTotals,
            dailyGoals,
            averages,
            historyData: historyData.slice(0, 7), // Last 7 days
            trendData,
            weightHistory: weightHistory.slice(0, 10) // Last 10 weight entries
          }
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

  const handleVoiceToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
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
      toast.success('Chat-Verlauf gelöscht');
      generateWelcomeMessage();
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

  if (isLoading) {
    return (
      <Card className="h-[700px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Lade Chat-Verlauf...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Schnelle Fragen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 text-left justify-start"
                onClick={() => handleSendMessage(action.prompt)}
              >
                <action.icon className="h-4 w-4 mr-3 text-primary" />
                <span className="text-sm">{action.text}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chat Interface */}
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
                  {getCoachIcon(coachPersonality)} {coachPersonality}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground font-normal">
                Dein persönlicher Ernährungs- und Fitness-Coach
              </p>
            </div>
            {messages.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChat}
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
              {messages.map((message, index) => (
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
              ))}
              
              {isThinking && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] bg-muted border rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium text-primary">Coach denkt nach...</span>
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
                onClick={() => handleSendMessage()}
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
    </div>
  );
};
