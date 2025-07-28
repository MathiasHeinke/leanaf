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
  Paperclip,
  X,
  Clock,
  Zap,
  Dumbbell,
  Activity,
  BarChart3
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { UploadProgress } from "@/components/UploadProgress";
import { uploadFilesWithProgress, UploadProgress as UploadProgressType } from "@/utils/uploadHelpers";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  coach_personality: string;
  images?: string[];
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
  const { hasFeatureAccess } = useFeatureAccess();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [coachPersonality, setCoachPersonality] = useState('motivierend');
  const [firstName, setFirstName] = useState('');
  const [quickActionsShown, setQuickActionsShown] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressType[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [remainingCalories, setRemainingCalories] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording
  } = useVoiceRecording();

  // Enhanced coach personality mapping with professions
  const getCoachInfo = (personality: string) => {
    switch (personality) {
      case 'hart': 
        return { 
          name: 'Sascha', 
          emoji: '🎯', 
          profession: 'Fitness Drill-Instructor',
          greeting: 'Hey {name}, Sascha hier. Keine Zeit für Smalltalk - was ist dein Ziel heute?',
          accentColor: 'from-red-500 to-red-600',
          imageUrl: '/coach-images/9e4f4475-6b1f-4563-806d-89f78ba853e6.png'
        };
      case 'soft': 
        return { 
          name: 'Lucy', 
          emoji: '❤️', 
          profession: 'Ernährungsberaterin',
          greeting: 'Hey {name}, Lucy hier. Wie geht\'s dir denn heute - wie kann ich dir helfen?',
          accentColor: 'from-pink-500 to-rose-500',
          imageUrl: '/coach-images/fa6fb4d0-0626-4ff4-a5c2-552d0e3d9bbb.png'
        };
      case 'motivierend':
      default:
        return { 
          name: 'Kai', 
          emoji: '💪', 
          profession: 'Personal Trainer',
          greeting: 'Hey {name}, Kai hier! Bereit durchzustarten? Wie kann ich dir heute helfen?',
          accentColor: 'from-blue-500 to-blue-600',
          imageUrl: '/coach-images/2c06031d-707a-400d-aaa0-a46decdddfe2.png'
        };
    }
  };

  // Enhanced quick actions with time and calorie awareness + Training+ features
  const getQuickActions = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const timeOfDay = currentHour < 12 ? 'Morgen' : currentHour < 18 ? 'Mittag' : 'Abend';
    
    const baseActions = [
      {
        icon: Target,
        text: `Fortschritt-Analyse (${timeOfDay})`,
        prompt: `Gib mir eine detaillierte Analyse meines aktuellen Fortschritts. Berücksichtige dabei, dass es jetzt ${timeOfDay} ist und der Tag noch nicht vorbei ist. Wie sieht mein bisheriger Fortschritt aus und was kann ich noch heute verbessern?`
      },
      {
        icon: Apple,
        text: `Meal-Vorschläge (${remainingCalories}kcal übrig)`,
        prompt: `Basierend auf meinen Zielen und bisherigen Mahlzeiten heute habe ich noch ${remainingCalories}kcal übrig. Welche Meals empfiehlst du mir für den Rest des Tages? Berücksichtige die Tageszeit und meine Makro-Ziele.`
      },
      {
        icon: TrendingUp,
        text: "Wöchentliche Trainings-Analyse",
        prompt: "Analysiere meine Trainingsfrequenz und -intensität dieser Woche. Wie oft habe ich trainiert, wie war die Qualität und was empfiehlst du mir für die kommenden Tage? Beachte dabei die optimale Trainingsfrequenz."
      }
    ];

    // Add Training+ specific actions for premium users
    if (hasFeatureAccess('advanced_exercise_tracking')) {
      const trainingPlusActions = [
        {
          icon: Dumbbell,
          text: "💪 Krafttraining-Progression",
          prompt: "Analysiere meine detaillierte Krafttraining-Progression basierend auf meinen Exercise-Tracking Daten. Wie entwickeln sich meine Gewichte, Wiederholungen und mein Volumen? Welche Übungen sollte ich fokussieren und wo sehe ich Stagnation? Gib mir spezifische Empfehlungen für Progressive Overload."
        },
        {
          icon: Activity,
          text: "🎯 RPE & Belastungssteuerung",
          prompt: "Bewerte meine RPE-Werte (Rate of Perceived Exertion) und die Belastungssteuerung meiner letzten Trainings. Bin ich zu hart oder zu weich trainiert? Wie kann ich meine Intensität optimal anpassen für bessere Ergebnisse und Regeneration?"
        },
        {
          icon: BarChart3,
          text: "📊 Volumen & Periodisierung",
          prompt: "Analysiere mein Trainingsvolumen (Sätze × Wiederholungen × Gewicht) und gib mir Empfehlungen für die Periodisierung. Soll ich das Volumen erhöhen, reduzieren oder anders strukturieren? Wie kann ich Übertraining vermeiden und trotzdem Fortschritte machen?"
        }
      ];

      // Insert Training+ actions after the first base action
      return [
        baseActions[0], // Fortschritt-Analyse
        ...trainingPlusActions,
        ...baseActions.slice(1) // Meal-Vorschläge und Trainings-Analyse
      ];
    }

    return baseActions;
  };

  // Load user data and coach personality
  useEffect(() => {
    if (user?.id) {
      loadUserData();
      loadChatHistory();
      updateCalories();
    }
  }, [user?.id]);

  // Update remaining calories periodically
  useEffect(() => {
    const interval = setInterval(updateCalories, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [todaysTotals, dailyGoals]);

  const updateCalories = () => {
    const remaining = dailyGoals?.calories ? Math.max(0, dailyGoals.calories - todaysTotals.calories) : 0;
    setRemainingCalories(remaining);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('de-DE', { 
        hour: '2-digit', 
        minute: '2-digit'
      });
    } else {
      return date.toLocaleDateString('de-DE', { 
        day: '2-digit', 
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
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
      
      // Extract first name only
      let displayName = data?.display_name;
      if (!displayName || displayName.trim() === '') {
        displayName = user.email?.split('@')[0] || 'User';
      }
      
      const extractedFirstName = displayName.split(' ')[0] || displayName;
      setFirstName(extractedFirstName);
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

      const mappedMessages = (data || []).map(msg => {
        // Safely parse context_data and extract images
        let images: string[] = [];
        if (msg.context_data && typeof msg.context_data === 'object') {
          const contextData = msg.context_data as { images?: string[] };
          images = contextData.images || [];
        }

        return {
          id: msg.id,
          role: msg.message_role,
          content: msg.message_content,
          created_at: msg.created_at,
          coach_personality: msg.coach_personality,
          images
        };
      }) as ChatMessage[];
      
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
    const welcomeText = coachInfo.greeting.replace('{name}', firstName);
    
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

  const saveMessage = async (role: 'user' | 'assistant', content: string, images?: string[]) => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('coach_conversations')
        .insert({
          user_id: user.id,
          message_role: role,
          message_content: content,
          coach_personality: coachPersonality,
          context_data: images ? { images } : {}
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

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0 || !user?.id) return;

    // Starting photo upload for coach chat
    
    setIsUploading(true);
    setUploadProgress([]);

    try {
      const result = await uploadFilesWithProgress(
        files,
        user.id,
        (progress) => setUploadProgress(progress)
      );

      if (result.success && result.urls.length > 0) {
        setUploadedImages(prev => [...prev, ...result.urls]);
        toast.success(`${result.urls.length} Bild(er) hochgeladen`);
      }

      if (result.errors.length > 0) {
        result.errors.forEach(error => toast.error(error));
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Fehler beim Upload der Bilder');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async (messageText?: string) => {
    const userMessage = messageText || inputText.trim();
    if ((!userMessage && uploadedImages.length === 0) || isThinking || !user?.id) return;

    const imagesToSend = [...uploadedImages];
    setInputText("");
    setUploadedImages([]);
    setIsThinking(true);
    setQuickActionsShown(false);

    try {
      // Save user message and add to UI
      const savedUserMessage = await saveMessage('user', userMessage, imagesToSend);
      if (savedUserMessage) {
        const mappedMessage: ChatMessage = {
          id: savedUserMessage.id,
          role: savedUserMessage.message_role as 'user' | 'assistant',
          content: savedUserMessage.message_content,
          created_at: savedUserMessage.created_at,
          coach_personality: savedUserMessage.coach_personality,
          images: imagesToSend
        };
        setMessages(prev => [...prev, mappedMessage]);
      }

      // Call enhanced coach-chat function with full context
      const { data: coachResponse, error } = await supabase.functions.invoke('coach-chat', {
        body: {
          message: userMessage,
          userId: user.id,
          chatHistory: messages.slice(-10),
          images: imagesToSend,
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
  const quickActions = getQuickActions();

  if (isLoading) {
    return (
      <Card className="h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Lade Chat-Verlauf...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-[calc(100vh-140px)] flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="flex items-center gap-3">
          <div className={`h-10 w-10 bg-gradient-to-br ${coachInfo.accentColor} rounded-xl flex items-center justify-center shadow-lg`}>
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold whitespace-nowrap">{coachInfo.name} {coachInfo.emoji}</span>
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                {coachInfo.profession}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-sm text-muted-foreground font-normal">
                Für {firstName} • {remainingCalories}kcal übrig heute
              </p>
              {remainingCalories > 0 && (
                <Zap className="h-3 w-3 text-green-500 flex-shrink-0" />
              )}
            </div>
          </div>
          {messages.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="text-muted-foreground hover:text-destructive flex-shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <Separator className="flex-shrink-0" />
      
      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Chat Messages - Scrollable area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
              {messages.map((message, index) => (
                <div key={message.id || index} className="space-y-2">
                  <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] ${message.role === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
                      <div className={`rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted border'
                      }`}>
                        {message.role === 'assistant' && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                              <img 
                                src={coachInfo.imageUrl} 
                                alt={coachInfo.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              <div className={`w-6 h-6 bg-gradient-to-br ${coachInfo.accentColor} rounded-full flex items-center justify-center text-white text-xs hidden`}>
                                {coachInfo.emoji}
                              </div>
                            </div>
                            <span className="text-xs font-medium text-primary truncate">
                              {coachInfo.name}
                            </span>
                          </div>
                        )}
                        
                        {/* Show images if available */}
                        {message.images && message.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {message.images.map((imageUrl, imgIndex) => (
                              <img
                                key={imgIndex}
                                src={imageUrl}
                                alt={`Message image ${imgIndex + 1}`}
                                className="w-16 h-16 object-cover rounded-lg border"
                              />
                            ))}
                          </div>
                        )}
                        
                        {message.role === 'assistant' ? (
                          <div className="text-sm leading-relaxed">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </p>
                        )}
                      </div>
                      
                      {/* Timestamp outside bubble */}
                      <span className="text-xs text-muted-foreground mt-1 px-1">
                        {formatMessageTime(message.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              {isThinking && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] flex flex-col items-start">
                    <div className="bg-muted border rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                          <img 
                            src={coachInfo.imageUrl} 
                            alt={coachInfo.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className={`w-6 h-6 bg-gradient-to-br ${coachInfo.accentColor} rounded-full flex items-center justify-center text-white text-xs hidden`}>
                            {coachInfo.emoji}
                          </div>
                        </div>
                        <span className="text-xs font-medium text-primary">{coachInfo.name} schreibt...</span>
                      </div>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 px-1">
                      jetzt
                    </span>
                  </div>
                </div>
              )}
              
              {/* Enhanced Quick Actions with time and calorie context */}
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

        {/* Input Area - Fixed at bottom */}
        <div className="flex-shrink-0 p-4 border-t bg-background">
          {/* Upload Progress */}
          <UploadProgress 
            progress={uploadProgress} 
            isVisible={isUploading && uploadProgress.length > 0} 
          />

          {/* Image Thumbnails */}
          {uploadedImages.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2 animate-fade-in">
              {uploadedImages.map((imageUrl, index) => (
                <div key={index} className="relative group animate-scale-in">
                  <img
                    src={imageUrl}
                    alt={`Uploaded ${index + 1}`}
                    className="w-14 h-14 object-cover rounded-xl border-2 border-border/20 shadow-md hover:scale-105 transition-all duration-300"
                  />
                  <button
                    onClick={() => handleRemoveImage(index)}
                    className="absolute -top-2 -right-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg hover:scale-110 z-10"
                    disabled={isThinking || isUploading}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
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
                placeholder={`Frage ${coachInfo.name} etwas...`}
                className="min-h-[60px] max-h-[120px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-base placeholder:text-muted-foreground/70 pl-4 pr-20 pb-6 pt-4 leading-relaxed"
               onKeyDown={(e) => {
                 if (e.key === 'Enter' && e.shiftKey) {
                   e.preventDefault();
                   handleSendMessage();
                 }
                }}
                disabled={isThinking || isUploading}
              />
              
              {/* Left Action Button - Photo Upload */}
              <div className="absolute left-4 bottom-2 flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  className={`h-9 w-9 p-0 rounded-xl hover:bg-muted/90 transition-all duration-200 hover:scale-105 ${
                    isUploading || isThinking ? 'opacity-50 cursor-not-allowed' : 'opacity-100'
                  }`}
                  onClick={() => {
                    if (!isUploading && !isThinking) {
                      document.getElementById('coach-gallery-upload')?.click();
                    }
                  }}
                  disabled={isUploading || isThinking}
                >
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                  ) : (
                    <Paperclip className="h-5 w-5 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                  )}
                </Button>
                
                {/* Hidden file input */}
                <input
                  id="coach-gallery-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  multiple
                  disabled={isUploading || isThinking}
                />
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
                    ((!inputText.trim() && uploadedImages.length === 0) || isThinking)
                      ? 'opacity-50 cursor-not-allowed bg-muted/80 text-muted-foreground hover:bg-muted/80'
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
                  }`}
                  onClick={() => handleSendMessage()}
                  disabled={(!inputText.trim() && uploadedImages.length === 0) || isThinking}
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
