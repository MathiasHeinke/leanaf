import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  Sparkles,
  ChevronDown,
  History,
  Calendar
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useSentimentAnalysis } from '@/hooks/useSentimentAnalysis';
import { useCoachMemory } from '@/hooks/useCoachMemory';
import { useProactiveCoaching } from '@/hooks/useProactiveCoaching';
import { createGreetingContext, generateDynamicCoachGreeting } from '@/utils/dynamicCoachGreetings';
import { UploadProgress } from '@/components/UploadProgress';
import { MediaUploadZone } from '@/components/MediaUploadZone';
import { ExercisePreviewCard } from '@/components/ExercisePreviewCard';
import { SupplementPreviewCard } from '@/components/SupplementPreviewCard';
import { ChatHistorySidebar } from '@/components/ChatHistorySidebar';
import { VideoCompressionProgress } from '@/components/VideoCompressionProgress';
import { uploadFilesWithProgress, UploadProgress as UploadProgressType } from '@/utils/uploadHelpers';
import { VideoCompressor, CompressionProgress } from '@/utils/videoCompression';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

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
  sleepData?: any[];
  bodyMeasurements?: any[];
  workoutData?: any[];
  profileData?: any;
  progressPhotos?: string[];
}

export const SpecializedCoachChat: React.FC<SpecializedCoachChatProps> = ({
  coach,
  onBack,
  todaysTotals,
  dailyGoals,
  averages,
  historyData,
  trendData,
  weightHistory,
  sleepData = [],
  bodyMeasurements = [],
  workoutData = [],
  profileData = null,
  progressPhotos = []
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
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [analysisType, setAnalysisType] = useState<'exercise_form' | 'meal_analysis' | 'progress_photo' | 'general'>('general');
  const [dynamicSuggestions, setDynamicSuggestions] = useState<Array<{text: string; prompt: string}>>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [compressionProgress, setCompressionProgress] = useState<CompressionProgress | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [exercisePreview, setExercisePreview] = useState<any>(null);
  const [supplementPreview, setSupplementPreview] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording
  } = useVoiceRecording();

  // Human-like features hooks
  const { analyzeSentiment } = useSentimentAnalysis();
  const { 
    memory, 
    loadCoachMemory, 
    updateUserPreference, 
    addMoodEntry, 
    addSuccessMoment, 
    addStruggleMention, 
    updateRelationshipStage 
  } = useCoachMemory();
  const { checkForProactiveOpportunities } = useProactiveCoaching();

  useEffect(() => {
    if (user?.id) {
      loadUserData();
      loadCoachChatHistory();
      loadCoachMemory(); // Load coach memory for this user
    }
  }, [user?.id, coach.id, selectedDate]);

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
      
      // Check if display_name is a system name that should be replaced
      const systemNames = ['super admin', 'admin', 'test user', 'test', 'user', 'administrator'];
      const isSystemName = displayName && systemNames.some(name => 
        displayName.toLowerCase().includes(name)
      );
      
      if (!displayName || displayName.trim() === '' || isSystemName) {
        // Extract real name from email (before @ symbol)
        const emailName = user.email?.split('@')[0] || 'User';
        // If email looks like a name (contains letters), use it
        if (/^[a-zA-Z]/.test(emailName)) {
          displayName = emailName.split('.').map(part => 
            part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
          ).join(' ');
        } else {
          displayName = 'User';
        }
      }
      
      const extractedFirstName = displayName.split(' ')[0] || displayName;
      setFirstName(extractedFirstName);
    } catch (error) {
      console.error('Error in loadUserData:', error);
    }
  };

  const loadCoachChatHistory = async (dateFilter?: string) => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const targetDate = dateFilter || selectedDate || currentDate;
      
      const { data, error } = await supabase
        .from('coach_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('coach_personality', coach.id)
        .eq('conversation_date', targetDate)
        .order('created_at', { ascending: true })
        .limit(50);

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
    // Check if this is the first conversation with this coach
    const isFirstConversation = messages.length === 0;
    
    const welcomeText = getWelcomeMessage(isFirstConversation);
    
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

  const getWelcomeMessage = (isFirstConversation: boolean) => {
    const greetingContext = createGreetingContext(firstName, coach.id, memory, isFirstConversation);
    return generateDynamicCoachGreeting(greetingContext);
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
          conversation_date: selectedDate || currentDate,
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

  const handleMediaUploaded = (urls: string[]) => {
    setUploadedImages(prev => [...prev, ...urls]);
    setShowMediaUpload(false);
  };

  const analyzeMedia = async () => {
    if (uploadedImages.length === 0 || !user?.id) return;

    setIsThinking(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('coach-media-analysis', {
        body: {
          userId: user.id,
          mediaUrls: uploadedImages,
          mediaType: 'image',
          analysisType,
          coachPersonality: coach.id,
          userQuestion: inputText || `Analysiere bitte ${analysisType === 'exercise_form' ? 'meine Übungsausführung' : analysisType === 'meal_analysis' ? 'mein Essen' : 'das Bild'}`,
          userProfile: {
            goals: dailyGoals,
            currentData: todaysTotals
          }
        }
      });

      if (error) {
        throw error;
      }

      const analysis = data.analysis;
      
      // Save the analysis as assistant message
      const savedAssistantMessage = await saveMessage('assistant', analysis);
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
        generateDynamicSuggestions();
      }

      toast.success('Medien-Analyse abgeschlossen');
    } catch (error) {
      console.error('Error analyzing media:', error);
      toast.error('Fehler bei der Medien-Analyse');
    } finally {
      setIsThinking(false);
    }
  };
  const handleRemoveImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Remove the aggressive message splitting since the edge function now handles intelligent responses
  const splitMessage = (message: string): string[] => {
    // Only split very long messages (over 800 characters) as a fallback
    if (message.length <= 800) {
      return [message];
    }
    
    // Split only at natural breaks for very long messages
    const sentences = message.split(/(?<=[.!?])\s+/);
    const parts: string[] = [];
    let currentPart = '';
    
    for (const sentence of sentences) {
      if (currentPart.length + sentence.length > 400 && currentPart.length > 0) {
        parts.push(currentPart.trim());
        currentPart = sentence;
      } else {
        currentPart += (currentPart ? ' ' : '') + sentence;
      }
    }
    
    if (currentPart) {
      parts.push(currentPart.trim());
    }
    
    return parts.length > 1 ? parts : [message];
  };

  const sendMessageParts = async (messageParts: string[]) => {
    for (let i = 0; i < messageParts.length; i++) {
      if (i > 0) {
        // Show typing indicator for 1-3 seconds between parts
        setIsThinking(true);
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
      }

      const savedAssistantMessage = await saveMessage('assistant', messageParts[i]);
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
    }
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

      // Human-like features: Sentiment analysis
      const sentimentResult = await analyzeSentiment(userMessage);
      
      // Update memory with mood
      if (sentimentResult.emotion !== 'neutral') {
        await addMoodEntry(sentimentResult.emotion, sentimentResult.intensity);
      }
      
      // Detect success moments and struggles
      const successPatterns = ['geschafft', 'erfolgreich', 'stolz', 'super', 'klasse', 'gut gemacht', 'ziel erreicht'];
      const strugglePatterns = ['schwer', 'probleme', 'frustrier', 'schaffe nicht', 'klappt nicht', 'hilfe'];
      
      const lowerMessage = userMessage.toLowerCase();
      if (successPatterns.some(pattern => lowerMessage.includes(pattern))) {
        await addSuccessMoment(userMessage);
      } else if (strugglePatterns.some(pattern => lowerMessage.includes(pattern))) {
        await addStruggleMention(userMessage);
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
            weightHistory: weightHistory.slice(0, 10),
            sleepData: sleepData?.slice(0, 7),
            bodyMeasurements: bodyMeasurements?.slice(0, 5),
            workoutData: workoutData?.slice(0, 14),
            profileData,
            progressPhotos: progressPhotos?.slice(0, 5)
          },
          // Enhanced with human-like features
          sentimentAnalysis: sentimentResult,
          coachMemory: memory
        }
      });

      if (error) {
        throw error;
      }

      const assistantMessage = coachResponse.response || coachResponse.reply;
      
      // Check for exercise data extraction if this is a workout coach
      if ((coach.id === 'sascha' || coach.id === 'markus') && (coachResponse.exerciseData || coachResponse.context?.trainingPlusAccess?.exerciseData)) {
        setExercisePreview(coachResponse.exerciseData || coachResponse.context?.trainingPlusAccess?.exerciseData);
      }
      
      // Check for supplement table in the response
      const supplementTable = parseSupplementTable(assistantMessage);
      if (supplementTable) {
        setSupplementPreview(supplementTable);
      }
      
      // Split long messages into parts
      const messageParts = splitMessage(assistantMessage);
      
      // Send message parts with delays
      await sendMessageParts(messageParts);
      
      setQuickActionsShown(true);
      
      // Update relationship stage after successful conversation
      await updateRelationshipStage();
      
      // Generate dynamic suggestions after all parts are sent
      generateDynamicSuggestions();

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
      const targetDate = selectedDate || currentDate;
      await supabase
        .from('coach_conversations')
        .delete()
        .eq('user_id', user.id)
        .eq('coach_personality', coach.id)
        .eq('conversation_date', targetDate);
      
      setMessages([]);
      setQuickActionsShown(false);
      generateWelcomeMessage();
      toast.success('Heutiger Chat geleert');
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
            weightHistory: weightHistory.slice(0, 10),
            sleepData: sleepData?.slice(0, 7),
            bodyMeasurements: bodyMeasurements?.slice(0, 5),
            workoutData: workoutData?.slice(0, 14),
            profileData,
            progressPhotos: progressPhotos?.slice(0, 5)
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

  // Supplement parsing functions
  const parseSupplementTable = (content: string) => {
    const supplementRegex = /\*\*Supplement[-\s]*Plan?\*\*:?\s*(.*?)(?=\n\n|\n\*\*|$)/s;
    const match = content.match(supplementRegex);
    
    if (!match) return null;

    const tableContent = match[1];
    const lines = tableContent.split('\n').filter(line => line.trim() && !line.includes('---'));
    
    if (lines.length < 2) return null;

    const supplements = [];
    let title = "Supplement Empfehlungen";
    
    // Extract title if available
    const titleMatch = content.match(/\*\*([^*]+Supplement[^*]*)\*\*/i);
    if (titleMatch) {
      title = titleMatch[1];
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.startsWith('|') || line === '|') continue;
      
      const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
      
      if (cells.length >= 3) {
        const supplement = {
          name: cells[0],
          dosage: cells[1].split(' ')[0] || '',
          unit: cells[1].split(' ').slice(1).join(' ') || 'mg',
          timing: cells[2] ? cells[2].split(',').map(t => {
            const timing = t.trim().toLowerCase();
            if (timing.includes('morgen')) return 'morning';
            if (timing.includes('mittag')) return 'noon';
            if (timing.includes('abend')) return 'evening';
            if (timing.includes('vor') && timing.includes('training')) return 'pre_workout';
            if (timing.includes('nach') && timing.includes('training')) return 'post_workout';
            if (timing.includes('schlaf')) return 'before_bed';
            return 'morning';
          }) : ['morning'],
          goal: cells[3] || '',
          notes: cells[4] || ''
        };
        
        if (supplement.name && supplement.dosage) {
          supplements.push(supplement);
        }
      }
    }

    if (supplements.length === 0) return null;

    return {
      title,
      supplements,
      description: `Personalisierte Supplement-Empfehlungen von ${coach.name}`
    };
  };

  const handleSupplementPreviewSave = async (supplementData: any) => {
    setSupplementPreview(null);
    // Event is triggered within SupplementPreviewCard
    toast.success('Supplement-Empfehlungen werden zu deinen Supplementen hinzugefügt!');
  };

  const handleExercisePreviewSave = async (exerciseData: any) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('exercise_sessions')
        .insert({
          user_id: user.id,
          exercise_name: exerciseData.exerciseName,
          sets: exerciseData.sets,
          overall_rpe: exerciseData.overallRpe || null,
          session_date: new Date().toISOString().split('T')[0],
          duration_minutes: null,
          notes: 'Eingegeben über Coach Chat'
        });

      if (error) {
        console.error('Error saving exercise:', error);
        toast.error('Fehler beim Speichern der Übung');
        return;
      }

      toast.success('Übung erfolgreich gespeichert!');
      setExercisePreview(null);
    } catch (error) {
      console.error('Error in handleExercisePreviewSave:', error);
      toast.error('Fehler beim Speichern der Übung');
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
      case 'orange':
        return 'from-orange-500 to-orange-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="flex gap-4">
      {/* Main Chat Area */}
      <div className="flex-1 space-y-4">
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
                    <CardTitle className="text-lg">{coach.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{coach.role}</p>
                    {selectedDate && selectedDate !== currentDate && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {format(new Date(selectedDate), 'dd.MM.yyyy', { locale: de })}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowHistory(!showHistory)}
                  className={showHistory ? 'bg-primary/10 text-primary' : ''}
                >
                  <History className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={clearChat}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

      {/* Chat Area */}
      <div className="flex flex-col h-[calc(100vh-150px)]">
        <div className="flex-1 overflow-hidden">
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
                                <span className="text-[8px] text-white">{coach.name.charAt(0)}</span>
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
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                                <div className="w-8 h-8 rounded-full overflow-hidden shadow-lg">
                                  {coach.imageUrl ? (
                                    <img 
                                      src={coach.imageUrl} 
                                      alt={coach.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                  ) : null}
                                  <div className={`w-8 h-8 bg-gradient-to-br ${getCoachColors(coach.color)} rounded-full flex items-center justify-center text-white text-sm ${coach.imageUrl ? 'hidden' : ''}`}>
                                    {coach.name.charAt(0)}
                                  </div>
                                </div>
                              <div className="absolute -inset-0.5">
                                <div className="w-9 h-9 bg-primary/30 rounded-full animate-ping"></div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-primary">
                                {coach.name} schreibt...
                              </span>
                              <div className="flex gap-1">
                                <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                <div className="w-2 h-2 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                              </div>
                            </div>
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
        </div>
        
        {/* Dynamic Quick Actions - Collapsible */}
        {quickActionsShown && !isThinking && (
          <Collapsible>
            <div className="border-t">
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-between p-4 rounded-none border-none"
                >
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Vorschläge {dynamicSuggestions.length > 0 ? `(${dynamicSuggestions.length})` : `(${coach.quickActions.length})`}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="px-3 pb-3">
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
                        className="text-xs h-auto py-2 px-3 text-left justify-start w-full"
                        onClick={() => handleSendMessage(action.prompt)}
                        disabled={isLoadingSuggestions}
                      >
                        {action.text}
                      </Button>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}
        
        
        {/* Media Upload Zone */}
        {showMediaUpload && (
          <div className="border-t p-3">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Medien hochladen</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMediaUpload(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-4 gap-2 mb-3">
                <Button
                  variant={analysisType === 'exercise_form' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAnalysisType('exercise_form')}
                  className="text-xs"
                >
                  🏋️ Übung
                </Button>
                <Button
                  variant={analysisType === 'meal_analysis' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAnalysisType('meal_analysis')}
                  className="text-xs"
                >
                  🍽️ Essen
                </Button>
                <Button
                  variant={analysisType === 'progress_photo' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAnalysisType('progress_photo')}
                  className="text-xs"
                >
                  📸 Fortschritt
                </Button>
                <Button
                  variant={analysisType === 'general' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAnalysisType('general')}
                  className="text-xs"
                >
                  💬 Allgemein
                </Button>
              </div>
              
              <MediaUploadZone
                onMediaUploaded={handleMediaUploaded}
                maxFiles={3}
                className="max-h-64"
              />
              
              {uploadedImages.length > 0 && (
                <Button
                  onClick={analyzeMedia}
                  disabled={isThinking}
                  className="w-full"
                >
                  {isThinking ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analysiere...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Medien analysieren
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
        
        {/* Input Area */}
        <div className="border-t p-3 bg-background">
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
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMediaUpload(!showMediaUpload)}
                disabled={isThinking}
                className={showMediaUpload ? 'bg-primary/10 text-primary' : ''}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              
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

      {/* Exercise Preview Card */}
        {exercisePreview && (
          <div className="mt-2">
            <ExercisePreviewCard
            data={exercisePreview}
            onSave={handleExercisePreviewSave}
            onCancel={() => setExercisePreview(null)}
          />
        </div>
      )}

      {/* Supplement Preview Card */}
        {supplementPreview && (
          <div className="mt-2">
            <SupplementPreviewCard
            data={supplementPreview}
            onSave={handleSupplementPreviewSave}
            onCancel={() => setSupplementPreview(null)}
          />
        </div>
      )}
      </div>
      </div>

      {/* History Sidebar */}
      {showHistory && (
        <ChatHistorySidebar
          selectedCoach={coach.id}
          onSelectDate={(date) => {
            setSelectedDate(date);
            setShowHistory(false);
          }}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
};