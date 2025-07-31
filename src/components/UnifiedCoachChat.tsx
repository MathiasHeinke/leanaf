import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Send, 
  Mic, 
  StopCircle, 
  User,
  Trash2,
  Loader2,
  Target,
  TrendingUp,
  Apple,
  Paperclip,
  X,
  MessageSquare,
  Sparkles,
  ChevronDown,
  History,
  Calendar,
  Activity,
  Pill,
  Dumbbell,
  Brain,
  ArrowLeft
} from 'lucide-react';
import { ChatLayout } from '@/components/layouts/ChatLayout';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useUniversalImageAnalysis } from '@/hooks/useUniversalImageAnalysis';
import { useGlobalCoachMemory } from '@/hooks/useGlobalCoachMemory';
import { useWorkoutPlanDetection } from '@/hooks/useWorkoutPlanDetection';
import { MediaUploadZone } from '@/components/MediaUploadZone';
import { ExercisePreviewCard } from '@/components/ExercisePreviewCard';
import { CoachWorkoutPlanSaver } from '@/components/CoachWorkoutPlanSaver';
import { SimpleMessageList } from '@/components/SimpleMessageList';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export type ChatMode = 'nutrition' | 'training' | 'specialized' | 'general';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  coach_personality: string;
  images?: string[];
  mode?: ChatMode;
  metadata?: {
    exerciseData?: any;
    suggestions?: string[];
    actionButtons?: Array<{
      text: string;
      action: string;
      data?: any;
    }>;
    inlineForm?: {
      type: string;
      data: any;
    };
  };
}

interface CoachProfile {
  id: string;
  name: string;
  age?: number;
  role?: string;
  avatar?: string;
  icon?: any;
  imageUrl?: string;
  personality: string;
  description: string;
  expertise: string[];
  color: string;
  accentColor: string;
  quickActions?: Array<{
    text: string;
    prompt: string;
  }>;
}

interface UnifiedCoachChatProps {
  mode: ChatMode;
  coach?: CoachProfile;
  todaysTotals?: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  dailyGoals?: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  } | null;
  onExerciseLogged?: (exerciseData: any) => void;
  onBack?: () => void;
  useFullscreenLayout?: boolean;
  averages?: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  historyData?: any[];
  trendData?: any;
  weightHistory?: any[];
  sleepData?: any[];
  bodyMeasurements?: any[];
  workoutData?: any[];
  profileData?: any;
  progressPhotos?: string[];
}

export const UnifiedCoachChat: React.FC<UnifiedCoachChatProps> = ({
  mode,
  coach,
  todaysTotals,
  dailyGoals,
  onExerciseLogged,
  onBack,
  useFullscreenLayout = false,
  averages,
  historyData,
  trendData,
  weightHistory,
  sleepData,
  bodyMeasurements,
  workoutData,
  profileData,
  progressPhotos
}) => {
  const renderCount = useRef(0);
  renderCount.current++;
  console.log('🔄 UnifiedCoachChat render #', renderCount.current, { mode, coachId: coach?.id });
  
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [exercisePreview, setExercisePreview] = useState<any | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [chatInitialized, setChatInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retryQueue, setRetryQueue] = useState<ChatMessage[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initializationRef = useRef(false);

  // Hooks
  const {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording
  } = useVoiceRecording();

  const { analyzeImage, isAnalyzing } = useUniversalImageAnalysis();
  
  const {
    memory,
    isGlobalMemoryLoaded,
    processMessage,
    getMemorySummary
  } = useGlobalCoachMemory();

  const { shouldShowPlanSaver, analyzeWorkoutPlan } = useWorkoutPlanDetection();
  
  console.log('🔄 Hooks initialized #', renderCount.current, { 
    isGlobalMemoryLoaded, 
    messagesLength: messages.length,
    isLoading,
    chatInitialized,
    processMessageRef: processMessage?.toString().slice(0, 50),
    memoryExists: !!memory
  });

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Memoized scroll function - STABLE REFERENCE
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 50);
    }
  }, []);

  // Auto-scroll when messages change - NO DEPENDENCIES CAUSING RE-RENDERS
  useEffect(() => {
    if (messages.length > 0 && scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [messages.length]); // ONLY depend on length, NO scrollToBottom dependency

  // STABLE INITIALIZATION - NO RE-RENDERS
  useEffect(() => {
    // Only initialize once per user
    if (!user?.id || initializationRef.current) {
      return;
    }

    initializationRef.current = true;
    setIsLoading(true);

    let isMounted = true;

    const initializeChat = async () => {
      try {
        const userId = user.id;
        const coachPersonality = coach?.personality || 'motivierend';
        const currentMode = mode;
        const coachName = coach?.name || 'Coach';

        // Load chat history
        const { data, error } = await supabase
          .from('coach_conversations')
          .select('*')
          .eq('user_id', userId)
          .eq('coach_personality', coachPersonality)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: true })
          .limit(50);

        if (!isMounted) return;

        if (!error && data && data.length > 0) {
          // History exists - load it
          const formattedMessages: ChatMessage[] = data.map(msg => ({
            id: msg.id,
            role: msg.message_role as 'user' | 'assistant',
            content: msg.message_content,
            created_at: msg.created_at,
            coach_personality: msg.coach_personality,
            images: [],
            mode: currentMode
          }));
          setMessages(formattedMessages);
        } else {
          // No history - create stable welcome message
          const now = new Date();
          const hour = now.getHours();
          
          let timeGreeting = 'Hallo';
          if (hour < 12) timeGreeting = 'Guten Morgen';
          else if (hour < 18) timeGreeting = 'Guten Tag';
          else timeGreeting = 'Guten Abend';

          const modeSpecific = currentMode === 'training' 
            ? '💪 Lass uns heute dein Training optimieren!'
            : currentMode === 'nutrition' 
            ? '🍎 Ich helfe dir heute bei deiner Ernährung!'
            : currentMode === 'specialized'
            ? `🎯 Ich bin ${coachName} und auf meine Expertise spezialisiert.`
            : '✨ Wie kann ich dir heute helfen?';

          const welcomeMsg: ChatMessage = {
            id: `welcome-${userId}-${currentMode}-${coachPersonality}`,
            role: 'assistant',
            content: `${timeGreeting}! Ich bin ${coachName}. ${modeSpecific}`,
            created_at: now.toISOString(),
            coach_personality: coachPersonality,
            images: [],
            mode: currentMode
          };

          setMessages([welcomeMsg]);
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
        if (isMounted) {
          // Fallback welcome message
          setMessages([{
            id: `error-welcome-${Date.now()}`,
            role: 'assistant',
            content: `Hallo! Ich bin ${coach?.name || 'dein Coach'}. Wie kann ich dir helfen?`,
            created_at: new Date().toISOString(),
            coach_personality: coach?.personality || 'motivierend',
            images: [],
            mode: mode
          }]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setChatInitialized(true);
        }
      }
    };

    initializeChat();

    return () => {
      isMounted = false;
    };
  }, [user?.id]); // ONLY depend on user ID

  // Reset initialization when user changes
  useEffect(() => {
    initializationRef.current = false;
  }, [user?.id]);

  
  // Get stable memory summary - STABILIZED WITH PRIMITIVES
  const memorySummary = useMemo(() => {
    if (!memory) return null;
    return {
      relationshipStage: memory.relationship_stage,
      trustLevel: memory.trust_level,
      moodCount: memory.conversation_context?.mood_history?.length || 0,
      successCount: memory.conversation_context?.success_moments?.length || 0,
      struggleCount: memory.conversation_context?.struggles_mentioned?.length || 0,
      preferenceCount: memory.user_preferences?.length || 0,
      communicationStyle: memory.communication_style_preference
    };
  }, [memory?.relationship_stage, memory?.trust_level]);

  // Use ref for context data to avoid re-renders
  const contextRef = useRef<any>({});
  contextRef.current = {
    todaysTotals,
    dailyGoals,
    averages,
    historyData,
    trendData,
    weightHistory,
    sleepData,
    bodyMeasurements,
    workoutData,
    profileData,
    progressPhotos,
    coachInfo: coach,
    memorySummary
  };

  
  console.log('🔄 About to create sendMessage useCallback');
  // Stabilized handlers with useCallback
  const sendMessage = useCallback(async () => {
    if (!inputText.trim() && uploadedImages.length === 0) return;
    if (!user?.id) {
      toast.error('Bitte melde dich an, um den Chat zu nutzen');
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputText.trim() || 'Siehe Bild',
      created_at: new Date().toISOString(),
      coach_personality: coach?.personality || 'motivierend',
      images: uploadedImages,
      mode: mode
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setUploadedImages([]);
    setIsThinking(true);

    try {
      // Process message with global memory
      if (inputText.trim()) {
        await processMessage(inputText.trim(), coach?.personality || 'motivierend', true);
      }

      // Prepare request data - get fresh data from contextRef
      const context = contextRef.current;
      const requestData = {
        message: inputText.trim() || 'Analysiere das Bild',
        userId: user.id,
        coachPersonality: context.coachInfo?.personality || 'motivierend',
        images: uploadedImages,
        mode: mode,
        conversationHistory: messages.slice(-10), // Fresh slice inside function
        context: context // Use stable context from ref
      };

      // Call unified coach chat function
      const { data, error } = await supabase.functions.invoke('enhanced-coach-chat', {
        body: requestData
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response || data.reply || 'Entschuldigung, ich konnte nicht antworten.',
        created_at: new Date().toISOString(),
        coach_personality: coach?.personality || 'motivierend',
        mode: mode,
        metadata: {
          exerciseData: data.context?.exerciseExtracted,
          suggestions: data.suggestions,
          actionButtons: data.actionButtons
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Handle exercise extraction
      if (data.context?.exerciseExtracted && onExerciseLogged) {
        setExercisePreview(data.context.exerciseExtracted);
      }

      // Save messages to database
      await saveChatMessages([userMessage, assistantMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Fehler beim Senden der Nachricht');
      
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Entschuldigung, es gab einen Fehler. Bitte versuche es erneut.',
        created_at: new Date().toISOString(),
        coach_personality: coach?.personality || 'motivierend',
        mode: mode
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  }, [inputText, uploadedImages.length, user?.id, mode]); // ONLY PRIMITIVE VALUES

  // Stable reference to sendMessage for handleKeyPress
  const sendMessageRef = useRef<() => void>(() => {});
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  const saveChatMessages = useCallback(async (messagesToSave: ChatMessage[]) => {
    try {
      // Save to coach_conversations table
      const { error } = await supabase
        .from('coach_conversations')
        .insert(
          messagesToSave.map(msg => ({
            user_id: user?.id,
            message_role: msg.role,
            message_content: msg.content,
            coach_personality: msg.coach_personality,
            created_at: msg.created_at,
            conversation_date: new Date().toISOString().split('T')[0]
          }))
        );

      if (error) throw error;
    } catch (error) {
      console.error('Error saving chat messages:', error);
    }
  }, [user?.id]);

  const handleImageUpload = useCallback(async (urls: string[]) => {

    setUploadedImages(prev => [...prev, ...urls]);
    toast.success(`${urls.length} Bild(er) hochgeladen`);

    // Auto-analyze if in training mode
    if (mode === 'training' && urls.length > 0) {
      for (const imageUrl of urls) {
        const analysis = await analyzeImage(imageUrl, 'Analysiere dieses Trainingsbild');
        if (analysis?.suggestedModal === 'exercise') {
          toast.info('Übung erkannt! Sende eine Nachricht für Details.');
        }
      }
    }
  }, [mode, analyzeImage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessageRef.current();
    }
  }, []); // NO DEPENDENCIES - fully stable

  const clearChat = useCallback(async () => {

  
    try {
      await supabase
        .from('coach_conversations')
        .delete()
        .eq('user_id', user?.id)
        .eq('coach_personality', coach?.personality || 'motivierend');
      
      // Create a fresh welcome message after clearing
      const now = new Date();
      const hour = now.getHours();
      const coachName = coach?.name || 'Coach';
      
      let timeGreeting = 'Hallo';
      if (hour < 12) timeGreeting = 'Guten Morgen';
      else if (hour < 18) timeGreeting = 'Guten Tag';
      else timeGreeting = 'Guten Abend';

      const modeSpecific = mode === 'training' 
        ? '💪 Lass uns heute dein Training optimieren!'
        : mode === 'nutrition' 
        ? '🍎 Ich helfe dir heute bei deiner Ernährung!'
        : mode === 'specialized'
        ? `🎯 Ich bin ${coachName} und auf meine Expertise spezialisiert.`
        : '✨ Wie kann ich dir heute helfen?';

      const welcomeMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `${timeGreeting}! Ich bin ${coachName}. ${modeSpecific}`,
        created_at: now.toISOString(),
        coach_personality: coach?.personality || 'motivierend',
        images: [],
        mode: mode
      };

      setMessages([welcomeMsg]);
      toast.success('Chat gelöscht');
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast.error('Fehler beim Löschen des Chats');
    }
  }, [user?.id, coach?.personality, coach?.name, mode]);

  // Optimized message list height calculation - REMOVED, AutoSizer handles this
  
  // Convert to MessageList format - STABLE REFERENCES
  const convertedMessages = useMemo(() => 
    messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.created_at),
      images: msg.images,
      actions: msg.metadata?.actionButtons?.map(btn => ({
        type: 'exercise_confirmation' as const,
        label: btn.text,
        data: btn.data
      }))
    })), [messages]);

  // STABLE COACH OBJECT - critical for React.memo
  const convertedCoach = useMemo(() => ({
    name: coach?.name || 'Coach',
    avatar: coach?.imageUrl || '',
    primaryColor: coach?.color || 'blue',
    secondaryColor: coach?.accentColor || 'blue',
    personality: coach?.personality || 'motivierend'
  }), [coach]);

  const getModeIcon = () => {
    switch (mode) {
      case 'training': return <Dumbbell className="h-5 w-5" />;
      case 'nutrition': return <Apple className="h-5 w-5" />;
      case 'specialized': return <Brain className="h-5 w-5" />;
      default: return <MessageSquare className="h-5 w-5" />;
    }
  };

  const getModeTitle = () => {
    switch (mode) {
      case 'training': return 'Training Coach';
      case 'nutrition': return 'Ernährungs Coach';
      case 'specialized': return coach?.name || 'Spezialisierter Coach';
      default: return 'Allgemeiner Coach';
    }
  };


  const getCoachColors = (color: string) => {
    switch (color) {
      case 'blue':
        return 'from-blue-500 to-blue-600';
      case 'purple':
        return 'from-purple-500 to-purple-600';
      case 'green':
        return 'from-green-500 to-green-600';
      case 'orange':
        return 'from-orange-500 to-orange-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  // Coach Banner Component for fullscreen layout
  const CoachBanner = () => (
    <div className="flex items-center justify-between bg-card/80 backdrop-blur-sm rounded-lg p-3">
      <div className="flex items-center space-x-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center space-x-3">
          {coach?.imageUrl ? (
            <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg flex-shrink-0">
              <img 
                src={coach.imageUrl} 
                alt={coach.name}
                className="w-full h-full object-cover aspect-square"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getCoachColors(coach.color)} flex items-center justify-center text-white text-lg font-bold shadow-lg hidden flex-shrink-0`}>
                {coach.avatar}
              </div>
            </div>
          ) : (
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getCoachColors(coach.color)} flex items-center justify-center text-white text-lg font-bold shadow-lg flex-shrink-0`}>
              {coach.avatar}
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold">{coach?.name}</h2>
            <Badge variant="outline" className="text-xs">
              {coach?.role}
            </Badge>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm">
          <History className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={clearChat}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // Chat Input Component for fullscreen layout
  const ChatInput = () => (
    <div className="flex gap-2">
      <div className="flex-1 relative">
        <Textarea
          ref={inputRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Schreibe eine Nachricht..."
          className="resize-none pr-16 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-400"
          rows={1}
          disabled={isThinking}
        />
        <div className="absolute right-2 top-2 flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUpload(!showUpload)}
            disabled={isThinking}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isThinking}
          >
            {isRecording ? (
              <StopCircle className="h-4 w-4 text-red-500" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      <Button 
        onClick={sendMessage}
        disabled={(!inputText.trim() && uploadedImages.length === 0) || isThinking}
      >
        {isThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </div>
  );

  if (isLoading) {
    const LoadingComponent = () => (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );

    if (useFullscreenLayout) {
      return (
        <ChatLayout coachBanner={coach && <CoachBanner />}>
          <LoadingComponent />
        </ChatLayout>
      );
    }
    return <LoadingComponent />;
  }

  // Fullscreen Layout Mode
  if (useFullscreenLayout) {
    return (
      <ChatLayout 
        coachBanner={coach && <CoachBanner />}
        chatInput={
          <div className="space-y-3">
            {/* Uploaded Images Preview */}
            {uploadedImages.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {uploadedImages.map((imageUrl, index) => (
                  <div key={index} className="relative flex-shrink-0">
                    <img
                      src={imageUrl}
                      alt={`Upload ${index + 1}`}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== index))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <ChatInput />
            
            {/* Upload Zone */}
            {showUpload && (
              <div className="mt-3">
                <MediaUploadZone
                  onMediaUploaded={handleImageUpload}
                  maxFiles={mode === 'training' ? 5 : 3}
                  accept={mode === 'training' ? ['image/*', 'video/*'] : ['image/*']}
                />
              </div>
            )}

            {/* Quick Actions */}
            {coach?.quickActions && (
              <Collapsible open={showQuickActions} onOpenChange={setShowQuickActions}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-white">
                    <span>Schnellaktionen</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showQuickActions ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="grid grid-cols-1 gap-2">
                    {coach.quickActions.map((action, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="text-left justify-start text-white border-neutral-700"
                        onClick={() => {
                          setInputText(action.prompt);
                          inputRef.current?.focus();
                          setShowQuickActions(false);
                        }}
                      >
                        {action.text}
                      </Button>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        }
      >
        <div className="space-y-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-neutral-800 text-white'
                }`}
              >
                {message.images && message.images.length > 0 && (
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    {message.images.map((imageUrl, index) => (
                      <img
                        key={index}
                        src={imageUrl}
                        alt={`Upload ${index + 1}`}
                        className="rounded-lg w-full h-32 object-cover"
                      />
                    ))}
                  </div>
                )}
                
                <ReactMarkdown>{message.content}</ReactMarkdown>
                
                <div className="text-xs opacity-70 mt-2">
                  {new Date(message.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </div>

                {/* Exercise Preview */}
                {message.metadata?.exerciseData && onExerciseLogged && (
                  <div className="mt-3">
                    <ExercisePreviewCard
                      data={message.metadata.exerciseData}
                      onSave={async (data) => {
                        await onExerciseLogged(data);
                        setExercisePreview(null);
                      }}
                      onCancel={() => setExercisePreview(null)}
                    />
                  </div>
                )}

                {/* Workout Plan Saver */}
                {message.role === 'assistant' && 
                 shouldShowPlanSaver(message.content, mode) && (
                  <CoachWorkoutPlanSaver
                    planText={message.content}
                    coachName={coach?.name || 'Coach'}
                    onSaved={() => {
                      toast.success('Trainingsplan wurde erfolgreich gespeichert!');
                      if (processMessage) {
                        processMessage(`Plan "${message.content.slice(0, 50)}..." wurde gespeichert`, coach?.personality || 'motivierend', false);
                      }
                    }}
                  />
                )}

                {/* Action Buttons */}
                {message.metadata?.actionButtons && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.metadata.actionButtons.map((button, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="border-neutral-700 text-white"
                        onClick={() => {
                          setInputText(button.data?.prompt || button.text);
                          inputRef.current?.focus();
                        }}
                      >
                        {button.text}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-neutral-800 text-white rounded-lg p-4 max-w-[80%]">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Coach denkt nach...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ChatLayout>
    );
  }

  // Standard Card Layout Mode
  return (
    <div className="flex h-full w-full">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <Card className="rounded-none border-x-0 border-t-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {onBack && (
                  <Button variant="ghost" size="sm" onClick={onBack}>
                    ←
                  </Button>
                )}
                {getModeIcon()}
                <div>
                  <CardTitle className="text-lg">{getModeTitle()}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {coach?.description || `${mode.charAt(0).toUpperCase() + mode.slice(1)}-Modus`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={clearChat}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Messages - VIRTUALIZED with AutoSizer */}
        <div className="flex-1" ref={scrollRef}>
          <SimpleMessageList 
            messages={convertedMessages}
            coach={convertedCoach}
            onConversationAction={undefined}
          />
          
          {/* Offline indicator */}
          {!isOnline && (
            <div className="px-4 py-2">
              <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3 text-center">
                <span className="text-sm text-yellow-800 dark:text-yellow-200">
                  📡 Keine Internetverbindung - Nachrichten werden gesendet, sobald die Verbindung wiederhergestellt ist
                </span>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isThinking && (
            <div className="px-4 py-2">
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-4 max-w-[80%]">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Coach denkt nach...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Uploaded Images Preview */}
        {uploadedImages.length > 0 && (
          <div className="p-4 border-t">
            <div className="flex gap-2 overflow-x-auto">
              {uploadedImages.map((imageUrl, index) => (
                <div key={index} className="relative flex-shrink-0">
                  <img
                    src={imageUrl}
                    alt={`Upload ${index + 1}`}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== index))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {coach?.quickActions && (
          <Collapsible open={showQuickActions} onOpenChange={setShowQuickActions}>
            <div className="p-4 border-t">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span>Schnellaktionen</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showQuickActions ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="grid grid-cols-1 gap-2">
                  {coach.quickActions.map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-left justify-start"
                      onClick={() => {
                        setInputText(action.prompt);
                        inputRef.current?.focus();
                        setShowQuickActions(false);
                      }}
                    >
                      {action.text}
                    </Button>
                  ))}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}

        {/* Input Area */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Schreibe eine Nachricht..."
                className="resize-none pr-16"
                rows={1}
                disabled={isThinking}
              />
              <div className="absolute right-2 top-2 flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUpload(!showUpload)}
                  disabled={isThinking}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isThinking}
                >
                  {isRecording ? (
                    <StopCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button 
              onClick={sendMessage}
              disabled={(!inputText.trim() && uploadedImages.length === 0) || isThinking}
            >
              {isThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>

          {/* Upload Zone */}
          {showUpload && (
            <div className="mt-3">
              <MediaUploadZone
                onMediaUploaded={handleImageUpload}
                maxFiles={mode === 'training' ? 5 : 3}
                accept={mode === 'training' ? ['image/*', 'video/*'] : ['image/*']}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};