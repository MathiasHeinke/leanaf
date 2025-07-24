import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft,
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
  Sparkles
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { UploadProgress } from '@/components/UploadProgress';
import { uploadFilesWithProgress, UploadProgress as UploadProgressType } from '@/utils/uploadHelpers';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  coach_personality: string;
  images?: string[];
}

interface CoachProfile {
  id: string;
  name: string;
  age: number;
  role: string;
  avatar: string;
  icon: any;
  imageUrl?: string;
  personality: string;
  description: string;
  expertise: string[];
  color: string;
  accentColor: string;
  quickActions: Array<{
    text: string;
    prompt: string;
  }>;
}

interface SpecializedCoachChatProps {
  coach: CoachProfile;
  onBack: () => void;
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

export const SpecializedCoachChat: React.FC<SpecializedCoachChatProps> = ({
  coach,
  onBack,
  todaysTotals,
  dailyGoals,
  averages,
  historyData,
  trendData,
  weightHistory
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [quickActionsShown, setQuickActionsShown] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressType[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<Array<{text: string; prompt: string}>>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording
  } = useVoiceRecording();

  useEffect(() => {
    if (user?.id) {
      loadUserData();
      loadCoachChatHistory();
    }
  }, [user?.id, coach.id]);

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

  const loadUserData = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading user data:', error);
        return;
      }

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

  const loadCoachChatHistory = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('coach_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('coach_personality', coach.id)
        .order('created_at', { ascending: true })
        .limit(20);

      if (error) {
        console.error('Error loading coach chat history:', error);
        return;
      }

      const mappedMessages = (data || []).map(msg => {
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
      
      if (mappedMessages.length === 0) {
        generateWelcomeMessage();
      } else {
        const lastMessage = mappedMessages[mappedMessages.length - 1];
        if (lastMessage?.role === 'assistant') {
          setQuickActionsShown(true);
          // Generate dynamic suggestions for existing conversation
          generateDynamicSuggestions();
        }
      }
    } catch (error) {
      console.error('Error in loadCoachChatHistory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateWelcomeMessage = async () => {
    const welcomeText = getWelcomeMessage();
    
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
      // Generate initial dynamic suggestions
      generateDynamicSuggestions();
    }
  };

  const getWelcomeMessage = () => {
    switch (coach.id) {
      case 'lucy':
        return `Hey ${firstName}! 💗 Lucy hier - deine Ernährungs- und Lifestyle-Expertin. Ich helfe dir dabei, eine nachhaltige und gesunde Beziehung zum Essen aufzubauen. Ob es um Meal-Timing, gesunde Gewohnheiten oder Regeneration geht - ich bin für dich da! Was beschäftigt dich heute?`;
      case 'sascha':
        return `${firstName}! 🎯 Sascha hier - dein Performance-Coach. Keine Zeit für Spielchen - ich helfe dir dabei, deine Trainingsziele zu erreichen und stärker zu werden. Ob Trainingsplan, Progressive Overload oder Plateau-Durchbruch - lass uns direkt loslegen! Was ist dein Ziel?`;
      case 'kai':
        return `Hey ${firstName}! 💪 Kai hier - dein Mindset- und Recovery-Spezialist. Ich bringe die Energie und helfe dir dabei, mental stark zu bleiben und optimal zu regenerieren. Motivation, Stress oder Schlaf - wir packen das zusammen an! Womit kann ich dir helfen?`;
      default:
        return `Hey ${firstName}! Schön, dich kennenzulernen. Wie kann ich dir heute helfen?`;
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
          coach_personality: coach.id,
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
    setInputText('');
    setUploadedImages([]);
    setIsThinking(true);
    setQuickActionsShown(false);

    try {
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

      const { data: coachResponse, error } = await supabase.functions.invoke('coach-chat', {
        body: {
          message: userMessage,
          userId: user.id,
          chatHistory: messages.slice(-10),
          images: imagesToSend,
          coachPersonality: coach.id,
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
        
        // Generate dynamic suggestions after assistant responds
        generateDynamicSuggestions();
      }

    } catch (error) {
      console.error('Error sending message to coach:', error);
      toast.error('Fehler beim Senden der Nachricht an den Coach');
      
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
        
        // Generate dynamic suggestions for error case too
        generateDynamicSuggestions();
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
        .eq('user_id', user.id)
        .eq('coach_personality', coach.id);
      
      setMessages([]);
      setQuickActionsShown(false);
      generateWelcomeMessage();
      toast.success('Chat geleert');
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast.error('Fehler beim Leeren des Chats');
    }
  };

  const generateDynamicSuggestions = async () => {
    if (!user?.id || isLoadingSuggestions) return;

    setIsLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-coach-suggestions', {
        body: {
          coachId: coach.id,
          chatHistory: messages.slice(-10), // Last 10 messages for context
          userData: {
            todaysTotals,
            dailyGoals,
            averages,
            historyData: historyData.slice(0, 7),
            trendData,
            weightHistory: weightHistory.slice(0, 10)
          },
          userId: user.id
        }
      });

      if (error) {
        console.error('Error generating suggestions:', error);
        return;
      }

      if (data?.suggestions && Array.isArray(data.suggestions)) {
        setDynamicSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Error in generateDynamicSuggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
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

  const getCoachColors = (color: string) => {
    switch (color) {
      case 'red':
        return 'from-red-500 to-red-600';
      case 'pink':
        return 'from-pink-500 to-pink-600';
      case 'green':
        return 'from-green-500 to-green-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center space-x-3">
                {coach.imageUrl ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg">
                    <img 
                      src={coach.imageUrl} 
                      alt={coach.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getCoachColors(coach.color)} flex items-center justify-center text-white text-lg font-bold shadow-lg hidden`}>
                      {coach.avatar}
                    </div>
                  </div>
                ) : (
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getCoachColors(coach.color)} flex items-center justify-center text-white text-lg font-bold shadow-lg`}>
                    {coach.avatar}
                  </div>
                )}
                <div>
                  <CardTitle className="text-lg">{coach.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{coach.role}</p>
                </div>
              </div>
            </div>
            
            <Button variant="ghost" size="sm" onClick={clearChat}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Chat Area */}
      <Card className="flex flex-col h-[600px]">
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm text-muted-foreground">Lade Chat-Verlauf...</span>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Noch keine Nachrichten. Starte das Gespräch!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] ${message.role === 'user' ? 'order-1' : 'order-2'}`}>
                        <div
                          className={`rounded-lg p-3 ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {message.images && message.images.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              {message.images.map((imageUrl, index) => (
                                <img
                                  key={index}
                                  src={imageUrl}
                                  alt={`Uploaded image ${index + 1}`}
                                  className="w-full h-24 object-cover rounded"
                                />
                              ))}
                            </div>
                          )}
                          
                          <div className="text-sm">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        </div>
                        
                        <div className={`flex items-center mt-1 space-x-2 ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}>
                        {message.role === 'assistant' && (
                          <div className="w-4 h-4 rounded-full overflow-hidden">
                            {coach.imageUrl ? (
                              <img 
                                src={coach.imageUrl} 
                                alt={coach.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${getCoachColors(coach.color)} flex items-center justify-center ${coach.imageUrl ? 'hidden' : ''}`}>
                              <span className="text-[8px] text-white">{coach.avatar}</span>
                            </div>
                          </div>
                        )}
                          {message.role === 'user' && <User className="h-3 w-3 text-muted-foreground" />}
                          <span className="text-xs text-muted-foreground">
                            {formatMessageTime(message.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isThinking && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%]">
                        <div className="bg-muted rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">
                              {coach.name} denkt nach...
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={scrollRef} />
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        
        {/* Dynamic Quick Actions */}
        {quickActionsShown && !isThinking && (
          <div className="border-t p-4">
            {isLoadingSuggestions && (
              <div className="flex items-center justify-center mb-3">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-xs text-muted-foreground">Generiere Vorschläge...</span>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              {(dynamicSuggestions.length > 0 ? dynamicSuggestions : coach.quickActions).map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-2 px-3 text-left justify-start"
                  onClick={() => handleSendMessage(action.prompt)}
                  disabled={isLoadingSuggestions}
                >
                  {action.text}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        {/* Input Area */}
        <div className="border-t p-4">
          {uploadedImages.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center space-x-2 mb-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {uploadedImages.length} Bild(er) angehängt
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {uploadedImages.map((imageUrl, index) => (
                  <div key={index} className="relative">
                    <img
                      src={imageUrl}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-16 object-cover rounded border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0"
                      onClick={() => handleRemoveImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {isUploading && uploadProgress.length > 0 && (
            <div className="mb-3">
              <UploadProgress progress={uploadProgress} isVisible={true} />
            </div>
          )}
          
          <div className="flex space-x-2">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Frage ${coach.name} etwas über ${coach.expertise[0].toLowerCase()}...`}
              className="flex-1 min-h-[60px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isThinking}
            />
            
            <div className="flex flex-col space-y-2">
              <label htmlFor="photo-upload" className="cursor-pointer">
                <Button variant="outline" size="sm" asChild disabled={isUploading}>
                  <span>
                    <Paperclip className="h-4 w-4" />
                  </span>
                </Button>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={isUploading}
                />
              </label>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleVoiceToggle}
                disabled={isThinking}
                className={isRecording ? 'bg-red-100 text-red-600' : ''}
              >
                {isRecording ? <StopCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              
              <Button
                size="sm"
                onClick={() => handleSendMessage()}
                disabled={(!inputText.trim() && uploadedImages.length === 0) || isThinking}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {(isRecording || isProcessing) && (
            <div className="mt-2 flex items-center space-x-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span>{isProcessing ? 'Verarbeite Spracheingabe...' : 'Aufnahme läuft...'}</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};