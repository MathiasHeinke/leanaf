import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatLayout } from "@/components/layouts/ChatLayout";
import { CoachDropdownHeader } from "@/components/CoachDropdownHeader";
import { 
  Send, 
  Mic, 
  StopCircle, 
  User,
  Loader2,
  Target,
  TrendingUp,
  Apple,
  Paperclip,
  X,
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
      await supabase
        .from('coach_conversations')
        .delete()
        .eq('user_id', user.id);
      
      setMessages([]);
      generateWelcomeMessage();
      toast.success('Chat gelöscht');
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast.error('Fehler beim Löschen des Chats');
    }
  };

  const handleViewHistory = () => {
    // Navigate to history view or open history modal
    console.log('View chat history');
  };

  const coachInfo = getCoachInfo(coachPersonality);

  return (
    <ChatLayout
      header={
        <CoachDropdownHeader
          name={coachInfo.name}
          image={coachInfo.imageUrl}
          onClearHistory={clearChat}
          onViewHistory={handleViewHistory}
        />
      }
      chatInput={
        <div className="space-y-3">
          {/* Quick Actions */}
          {quickActionsShown && !isThinking && (
            <div className="mb-3">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Schnellaktionen</h4>
              <div className="grid grid-cols-1 gap-2">
                {getQuickActions().map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendMessage(action.prompt)}
                    className="justify-start h-auto p-3 text-left hover:bg-accent/50 transition-colors"
                  >
                    <action.icon className="h-4 w-4 mr-2 flex-shrink-0 text-primary" />
                    <span className="text-sm">{action.text}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && uploadProgress.length > 0 && (
            <div className="space-y-2 mb-3">
              {uploadProgress.map((progress, index) => (
                <UploadProgress
                  key={index}
                  fileName={progress.fileName}
                  progress={progress.progress}
                  status={progress.status}
                  error={progress.error}
                />
              ))}
            </div>
          )}

          {/* Uploaded Images Preview */}
          {uploadedImages.length > 0 && (
            <div className="mb-3">
              <div className="flex gap-2 flex-wrap">
                {uploadedImages.map((url, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={url} 
                      alt={`Upload ${index + 1}`}
                      className="w-16 h-16 object-cover rounded-lg border border-border/50"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Nachricht an ${coachInfo.name}...`}
                className="resize-none pr-12 min-h-[48px] max-h-32 bg-background/80 border-border/50 focus:border-primary/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
            </div>
            
            <div className="flex flex-col gap-2">
              {/* Voice button */}
              <Button
                variant={isRecording ? "destructive" : "outline"}
                size="sm"
                type="button"
                className={`h-12 w-12 p-0 rounded-xl transition-all duration-300 ${
                  isRecording 
                    ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground animate-pulse shadow-lg' 
                    : 'bg-card hover:bg-accent text-muted-foreground hover:text-accent-foreground border-border/50'
                }`}
                onClick={handleVoiceToggle}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                ) : isRecording ? (
                  <StopCircle className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
              
              {/* Photo upload button */}
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  asChild
                  className={`h-12 w-12 p-0 rounded-xl transition-all duration-300 ${
                    isUploading
                      ? 'opacity-50 cursor-not-allowed bg-muted/80 text-muted-foreground'
                      : 'bg-card hover:bg-accent text-muted-foreground hover:text-accent-foreground border-border/50'
                  }`}
                >
                  <div>
                    {isUploading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                    ) : (
                      <Paperclip className="h-5 w-5" />
                    )}
                  </div>
                </Button>
              </label>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              {isRecording && "🎤 Aufnahme läuft..."}
              {isProcessing && "🤖 Verarbeite Sprache..."}
            </div>
            <div className="flex gap-2">
              <Button
                variant="default"
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
      }
    >
      <div className="space-y-4 p-4">
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            {/* Messages */}
            {messages.map((message, index) => (
              <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <div className={`w-8 h-8 bg-gradient-to-br ${coachInfo.accentColor} rounded-full flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <span className="text-xs text-white font-bold">
                      {coachInfo.emoji}
                    </span>
                  </div>
                )}
                
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground ml-8' 
                    : 'bg-muted/80 text-foreground'
                }`}>
                  <div className="space-y-2">
                    {/* Image display */}
                    {message.images && message.images.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        {message.images.map((url, imgIndex) => (
                          <img 
                            key={imgIndex}
                            src={url} 
                            alt={`Uploaded image ${imgIndex + 1}`}
                            className="rounded-lg max-w-full h-32 object-cover border border-border/20"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ))}
                      </div>
                    )}
                    
                    <div className={`prose prose-sm max-w-none ${
                        message.role === 'user' 
                          ? 'prose-invert' 
                          : 'prose-slate dark:prose-invert'
                      }`}>
                      <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="mb-2 pl-4">{children}</ul>,
                        ol: ({ children }) => <ol className="mb-2 pl-4">{children}</ol>,
                        li: ({ children }) => <li className="mb-1">{children}</li>
                      }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                  </div>
                  
                  <div className={`text-xs mt-2 ${
                    message.role === 'user' 
                      ? 'text-primary-foreground/70' 
                      : 'text-muted-foreground'
                  }`}>
                    {formatMessageTime(message.created_at)}
                  </div>
                </div>
                
                {message.role === 'user' && (
                  <div className="w-8 h-8 bg-gradient-to-br from-accent to-accent/80 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                    <User className="h-4 w-4 text-accent-foreground" />
                  </div>
                )}
              </div>
            ))}
            
            {/* Thinking indicator */}
            {isThinking && (
              <div className="flex gap-3 justify-start">
                <div className={`w-8 h-8 bg-gradient-to-br ${coachInfo.accentColor} rounded-full flex items-center justify-center flex-shrink-0 shadow-sm`}>
                  <span className="text-xs text-white font-bold">
                    {coachInfo.emoji}
                  </span>
                </div>
                <div className="bg-muted/80 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {coachInfo.name} denkt nach...
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={scrollRef}></div>
          </>
        )}
      </div>
    </ChatLayout>
  );
};