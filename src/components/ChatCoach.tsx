
import { useState, useEffect, useRef, useCallback } from "react";
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
  Target,
  TrendingUp,
  Apple,
  Paperclip
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
  const [userName, setUserName] = useState('');
  const [quickActionsShown, setQuickActionsShown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording
  } = useVoiceRecording();

  // Coach personality mapping
  const getCoachInfo = (personality: string) => {
    switch (personality) {
      case 'hart': 
        return { name: 'Sascha', emoji: '🎯', greeting: 'Hey {name}, Sascha hier. Keine Zeit für Smalltalk - was ist dein Ziel heute?' };
      case 'liebevoll': 
        return { name: 'Lucy', emoji: '❤️', greeting: 'Hey {name}, Lucy hier. Wie geht\'s dir denn heute - wie kann ich dir helfen?' };
      case 'motivierend':
      default:
        return { name: 'Kai', emoji: '💪', greeting: 'Hey {name}, Kai hier! Bereit durchzustarten? Wie kann ich dir heute helfen?' };
    }
  };

  // Quick actions (reduced to 3)
  const quickActions = [
    {
      icon: Target,
      text: "Wie ist mein Fortschritt?",
      prompt: "Gib mir eine detaillierte Analyse meines aktuellen Fortschritts und was ich verbessern kann."
    },
    {
      icon: Apple,
      text: "Gib mir Meal-Vorschläge",
      prompt: "Basierend auf meinen Zielen und bisherigen Mahlzeiten, welche Meals empfiehlst du mir für heute?"
    },
    {
      icon: TrendingUp,
      text: "Analysiere meine letzte Woche",
      prompt: "Analysiere meinen Fortschritt der letzten Woche und gib mir Feedback zu meiner Entwicklung."
    }
  ];

  // Load user data and coach personality
  useEffect(() => {
    if (user?.id) {
      loadUserData();
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

  const loadUserData = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('coach_personality, display_name')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading user data:', error);
        return;
      }

      setCoachPersonality(data?.coach_personality || 'motivierend');
      
      // Improved username handling
      let displayName = data?.display_name;
      if (!displayName || displayName.trim() === '') {
        displayName = user.email?.split('@')[0] || 'User';
      }
      setUserName(displayName);
    } catch (error) {
      console.error('Error in loadUserData:', error);
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
        .limit(20);

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
      
      // Generate welcome message if no history
      if (mappedMessages.length === 0) {
        generateWelcomeMessage();
      } else {
        // Show quick actions if last message was from assistant
        const lastMessage = mappedMessages[mappedMessages.length - 1];
        if (lastMessage?.role === 'assistant') {
          setQuickActionsShown(true);
        }
      }
    } catch (error) {
      console.error('Error in loadChatHistory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateWelcomeMessage = async () => {
    const coachInfo = getCoachInfo(coachPersonality);
    const welcomeText = coachInfo.greeting.replace('{name}', userName);
    
    const savedMessage = await saveMessage('assistant', welcomeText);
    if (savedMessage) {
      const mappedMessage: ChatMessage = {
        id: savedMessage.id,
        role: savedMessage.message_role as 'user' | 'assistant',
        content: savedMessage.message_content,
        created_at: savedMessage.created_at,
        coach_personality: savedMessage.coach_personality
      };
      setMessages([mappedMessage]);
      setQuickActionsShown(true);
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
    setQuickActionsShown(false);

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
          chatHistory: messages.slice(-10),
          userData: {
            todaysTotals,
            dailyGoals,
            averages,
            historyData: historyData.slice(0, 7),
            trendData,
            weightHistory: weightHistory.slice(0, 10)
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
        setQuickActionsShown(true);
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
        setQuickActionsShown(true);
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
      setQuickActionsShown(false);
      toast.success('Chat-Verlauf gelöscht');
      generateWelcomeMessage();
    } catch (error) {
      console.error('Error in clearChat:', error);
      toast.error('Fehler beim Löschen des Chat-Verlaufs');
    }
  };

  const coachInfo = getCoachInfo(coachPersonality);

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
    <Card className="h-[700px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{coachInfo.name} {coachInfo.emoji}</span>
              <Badge variant="secondary" className="text-xs">
                getLeanAI
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
      
      <CardContent className="flex-1 flex flex-col p-0 gap-0">
        {/* Chat Messages - Fixed height container for scrolling */}
        <div className="flex-1 relative overflow-hidden">
          <ScrollArea className="h-full px-4">
            <div className="space-y-4 py-4 min-h-full">
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
                            {coachInfo.name}
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
                      <span className="text-xs font-medium text-primary">{coachInfo.name} schreibt...</span>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Quick Actions in Chat */}
              {quickActionsShown && !isThinking && (
                <div className="flex justify-start">
                  <div className="max-w-[90%] space-y-2">
                    <div className="text-xs text-muted-foreground px-2">Oder frag mich:</div>
                    <div className="grid gap-2">
                      {quickActions.map((action, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="h-auto p-3 text-left justify-start hover:bg-muted/80"
                          onClick={() => {
                            setQuickActionsShown(false);
                            handleSendMessage(action.prompt);
                          }}
                        >
                          <action.icon className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
                          <span className="text-xs">{action.text}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Input Area - MealInput style */}
        <div className="p-4 border-t bg-background">
          {(isRecording || isProcessing) && (
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
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
          
          <div className="relative bg-card/70 backdrop-blur-md border border-border/60 rounded-2xl shadow-xl hover:bg-card/80 focus-within:border-primary/70 focus-within:shadow-2xl focus-within:bg-card/80 transition-all duration-300 group">
            <div className="relative">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Frage deinen Coach etwas..."
                className="min-h-[60px] max-h-[120px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-base placeholder:text-muted-foreground/70 pl-4 pr-20 pb-6 pt-4 leading-relaxed"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isThinking}
              />
              
              {/* Left Action Button - Paperclip (disabled for now) */}
              <div className="absolute left-4 bottom-2 flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  className="h-9 w-9 p-0 rounded-xl hover:bg-muted/90 transition-all duration-200 hover:scale-105 opacity-50 cursor-not-allowed"
                  disabled={true}
                >
                  <Paperclip className="h-5 w-5 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                </Button>
              </div>
              
              {/* Right Action Buttons - Voice + Send */}
              <div className="absolute right-4 bottom-2 flex items-center gap-2">
                {/* Voice Recording Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  className={`h-9 w-9 p-0 rounded-xl transition-all duration-200 ${
                    isRecording
                      ? 'bg-destructive/20 hover:bg-destructive/30 text-destructive border border-destructive/30' 
                      : 'hover:bg-muted/90 hover:scale-105'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={handleVoiceToggle}
                  disabled={isProcessing}
                >
                  {isRecording ? (
                    <StopCircle className="h-5 w-5" />
                  ) : isProcessing ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                  ) : (
                    <Mic className="h-5 w-5 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                  )}
                </Button>
                
                {/* Send Button */}
                <Button
                  size="sm"
                  type="button"
                  className={`h-9 w-9 p-0 rounded-xl transition-all duration-300 font-medium ${
                    (!inputText.trim() || isThinking)
                      ? 'opacity-50 cursor-not-allowed bg-muted/80 text-muted-foreground hover:bg-muted/80'
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
                  }`}
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim() || isThinking}
                >
                  {isThinking ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
