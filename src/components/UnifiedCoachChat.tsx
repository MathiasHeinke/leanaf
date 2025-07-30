import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Brain
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useUniversalImageAnalysis } from '@/hooks/useUniversalImageAnalysis';
import { useGlobalCoachMemory } from '@/hooks/useGlobalCoachMemory';
import { MediaUploadZone } from '@/components/MediaUploadZone';
import { ExercisePreviewCard } from '@/components/ExercisePreviewCard';
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
  personality: string;
  description: string;
  expertise: string[];
  color: string;
  accentColor: string;
  avatar?: string;
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
}

export const UnifiedCoachChat: React.FC<UnifiedCoachChatProps> = ({
  mode,
  coach,
  todaysTotals,
  dailyGoals,
  onExerciseLogged,
  onBack
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [exercisePreview, setExercisePreview] = useState<any | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load chat history from existing conversations table
  useEffect(() => {
    if (user?.id) {
      loadChatHistory();
      generateWelcomeMessage();
    }
  }, [user?.id, mode]);

  const loadChatHistory = async () => {
    if (!user?.id) return;

    try {
      // Use existing coach_conversations table
      const { data, error } = await supabase
        .from('coach_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('coach_personality', coach?.personality || 'motivierend')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedMessages: ChatMessage[] = data.map(msg => ({
          id: msg.id,
          role: msg.message_role as 'user' | 'assistant',
          content: msg.message_content,
          created_at: msg.created_at,
          coach_personality: msg.coach_personality,
          images: [], // coach_conversations doesn't store images, use empty array
          mode: mode
        }));
        setMessages(formattedMessages);
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      setIsLoading(false);
    }
  };

  const generateWelcomeMessage = async () => {
    if (!user?.id || messages.length > 0) return;

    try {
      const coachName = coach?.name || 'Coach';
      const modeContext = {
        nutrition: 'Ernährungsberatung und Mahlzeiten-Analyse',
        training: 'Training-Coaching und Workout-Analyse', 
        specialized: `Spezialisierte Beratung mit ${coachName}`,
        general: 'Allgemeine Gesundheits- und Fitness-Beratung'
      };

      const welcomeMessage = `Hallo! Ich bin ${coachName} und helfe dir heute bei ${modeContext[mode]}. 

${mode === 'training' ? '💪 Du kannst mir Trainingsvideos hochladen, Übungen loggen oder Trainingspläne erstellen lassen.' : ''}
${mode === 'nutrition' ? '🍎 Lade Fotos deiner Mahlzeiten hoch oder frag mich nach Ernährungstipps.' : ''}
${mode === 'specialized' ? `🎯 Ich bin auf ${coach?.expertise?.join(', ') || 'diverse Bereiche'} spezialisiert.` : ''}

Wie kann ich dir helfen?`;

      const welcomeMsg: ChatMessage = {
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: welcomeMessage,
        created_at: new Date().toISOString(),
        coach_personality: coach?.personality || 'motivierend',
        mode: mode
      };

      setMessages([welcomeMsg]);
    } catch (error) {
      console.error('Error generating welcome message:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() && uploadedImages.length === 0) return;
    if (!user?.id) {
      toast.error('Bitte melde dich an, um den Chat zu nutzen');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
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

      // Prepare request data
      const requestData = {
        message: inputText.trim() || 'Analysiere das Bild',
        userId: user.id,
        coachPersonality: coach?.personality || 'motivierend',
        images: uploadedImages,
        mode: mode,
        conversationHistory: messages.slice(-10),
        context: {
          todaysTotals,
          dailyGoals,
          coachInfo: coach,
          memorySummary: getMemorySummary()
        }
      };

      // Call unified coach chat function
      const { data, error } = await supabase.functions.invoke('enhanced-coach-chat', {
        body: requestData
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
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
        id: (Date.now() + 1).toString(),
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
  };

  const saveChatMessages = async (messagesToSave: ChatMessage[]) => {
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
  };

  const handleImageUpload = async (urls: string[]) => {
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
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = async () => {
    try {
      await supabase
        .from('coach_conversations')
        .delete()
        .eq('user_id', user?.id)
        .eq('coach_personality', coach?.personality || 'motivierend');
      
      setMessages([]);
      generateWelcomeMessage();
      toast.success('Chat gelöscht');
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast.error('Fehler beim Löschen des Chats');
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
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
                    {format(new Date(message.created_at), 'HH:mm', { locale: de })}
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

                  {/* Action Buttons */}
                  {message.metadata?.actionButtons && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.metadata.actionButtons.map((button, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
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
                <div className="bg-muted rounded-lg p-4 max-w-[80%]">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Coach denkt nach...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

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