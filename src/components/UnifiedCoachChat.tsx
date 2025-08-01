import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ✅ EMPTY_ARRAY als echte Konstante außerhalb der Komponente
const EMPTY_ARRAY: any[] = []; // Cache fix
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Send, 
  Mic, 
  MicOff, 
  Image as ImageIcon, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  MessageSquare,
  Brain,
  Dumbbell,
  Apple,
  User,
  Sparkles,
  Heart,
  Target,
  X,
  Paperclip
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useUniversalImageAnalysis } from '@/hooks/useUniversalImageAnalysis';
import { useGlobalCoachMemory } from '@/hooks/useGlobalCoachMemory';
import { useWorkoutPlanDetection } from '@/hooks/useWorkoutPlanDetection';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { CollapsibleCoachHeader } from '@/components/CollapsibleCoachHeader';
import { useContextTokens } from '@/hooks/useContextTokens';
// AI-Greeting-Revolution: No more static templates!

import { getDisplayName } from "../../supabase/functions/enhanced-coach-chat/utils/getDisplayName";

// SimpleMessageList import removed - not used in this component
import { MediaUploadZone } from '@/components/MediaUploadZone';
import { ChatLayout } from '@/components/layouts/ChatLayout';
import { ExercisePreviewCard } from '@/components/ExercisePreviewCard';
import { CoachWorkoutPlanSaver } from '@/components/CoachWorkoutPlanSaver';
import { ToolPicker } from '@/components/ToolPicker';
import { UploadProgress } from '@/components/UploadProgress';
import { renderMessage, createCardMessage, type UnifiedMessage } from '@/utils/messageRenderer';

// ============= TYPES =============
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  coach_personality: string;
  images?: string[];
  mode?: string;
  metadata?: {
    suggestions?: string[];
    actionButtons?: Array<{
      text: string;
      action: string;
      data?: any;
    }>;
  };
}

export interface CoachProfile {
  id: string;
  name: string;
  personality: string;
  expertise: string[];
  imageUrl?: string;
  color?: string;
  accentColor?: string;
  description?: string;
}

export interface UnifiedCoachChatProps {
  mode: 'general' | 'nutrition' | 'training' | 'specialized';
  coach?: CoachProfile;
  todaysTotals?: any;
  dailyGoals?: any;
  averages?: any;
  historyData?: any;
  trendData?: any;
  weightHistory?: any;
  sleepData?: any;
  bodyMeasurements?: any;
  workoutData?: any;
  profileData?: any;
  progressPhotos?: any;
  onExerciseLogged?: (exercise: any) => void;
  onBack?: () => void;
  useFullscreenLayout?: boolean;
}

const UnifiedCoachChat: React.FC<UnifiedCoachChatProps> = ({
  mode = 'general',
  coach,
  onExerciseLogged,
  onBack,
  useFullscreenLayout = false,
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
  progressPhotos
}) => {
  
  // ============= BASIC STATE =============
  const { user } = useAuth();
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [chatInitialized, setChatInitialized] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState(false);
  const [hasFiles, setHasFiles] = useState(false);
  const [showToolBadge, setShowToolBadge] = useState(false);
  const [toolBadgeText, setToolBadgeText] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  
  
  // ============= REFS =============
  const initializationRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // ============= HOOKS =============
  const { memory, isGlobalMemoryLoaded } = useGlobalCoachMemory();
  const { isRecording, isProcessing, transcribedText, startRecording, stopRecording } = useVoiceRecording();
  const { analyzeImage, isAnalyzing } = useUniversalImageAnalysis();
  const { uploadFiles, uploading, uploadProgress } = useMediaUpload();
  const { tokens } = useContextTokens(user?.id);
  
  // ============= CHAT PERSISTIERUNG =============
  useEffect(() => {
    if (!user?.id || initializationRef.current) return;
    
    initializationRef.current = true;
    
    const init = async () => {
      try {
        setIsLoading(true);
        
        // 1. Erst versuchen, heutige Chat-History zu laden
        const today = new Date().toISOString().split('T')[0];
        const { data: existingMessages, error: historyError } = await supabase
          .from('coach_conversations')
          .select('*')
          .eq('user_id', user.id)
          .eq('coach_personality', coach?.id || 'lucy')
          .eq('conversation_date', today)
          .order('created_at', { ascending: true });

        if (!historyError && existingMessages && existingMessages.length > 0) {
          // Konvertiere gespeicherte Nachrichten zu UnifiedMessage Format
          const loadedMessages: UnifiedMessage[] = existingMessages.map(msg => ({
            id: msg.id,
            role: msg.message_role as 'user' | 'assistant',
            content: msg.message_content,
            created_at: msg.created_at,
            coach_personality: msg.coach_personality || coach?.personality || 'motivierend',
            coach_name: coach?.name || 'Coach',
            coach_avatar: coach?.imageUrl,
            coach_color: coach?.color,
            coach_accent_color: coach?.accentColor,
            images: [],
            mode: mode
          }));

          console.log(`📜 Loaded ${loadedMessages.length} existing messages for today`);
          setMessages(loadedMessages);
          setIsLoading(false);
          setChatInitialized(true);
          return; // Beende hier - keine neue Begrüßung nötig
        }

        // 2. Nur wenn keine Nachrichten für heute existieren: AI-Begrüßung generieren
        console.log('🎯 No existing chat found, generating AI greeting...');
        
        const { data: greetingData, error: greetingError } = await supabase.functions.invoke('generate-intelligent-greeting', {
          body: {
            userId: user.id,
            coachId: coach?.id || 'lucy',
            isFirstConversation: false,
            contextData: {
              calLeft: tokens.calLeft,
              timeOfDay: tokens.timeOfDay,
              lastWorkout: tokens.lastWorkout,
              sleepHours: tokens.sleepHours
            }
          }
        });

        let enhancedGreeting = 'Hallo! 👋';
        
        if (greetingError) {
          console.warn('AI greeting failed, using fallback:', greetingError);
          const fallbackGreetings = {
            'lucy': `Hey! 💗 Bereit für einen tollen Tag?`,
            'sascha': `Moin! Zeit durchzustarten! 💪`,
            'kai': `Hey! ⚡ Wie ist deine Energie heute?`,
            'markus': `Hajo! Bock zu schaffe? 🔥`,
            'dr_vita': `Hallo! 🌸 Wie ist Ihr Wohlbefinden?`,
            'sophia': `Namaste! 🌿 Bereit für achtsames Wachstum?`
          };
          enhancedGreeting = fallbackGreetings[coach?.id || 'lucy'] || `Hallo! 👋`;
        } else {
          enhancedGreeting = greetingData.greeting;
          console.log('✨ AI greeting generated:', enhancedGreeting);
        }
        
        const welcomeMsg: UnifiedMessage = {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: enhancedGreeting,
          created_at: new Date().toISOString(),
          coach_personality: coach?.personality || 'motivierend',
          coach_name: coach?.name || 'Coach',
          coach_avatar: coach?.imageUrl,
          coach_color: coach?.color,
          coach_accent_color: coach?.accentColor,
          images: [],
          mode: mode
        };

        // 3. Begrüßung sofort speichern in DB
        await supabase.from('coach_conversations').insert({
          user_id: user.id,
          message_role: 'assistant',
          message_content: enhancedGreeting,
          coach_personality: coach?.id || 'lucy',
          conversation_date: today
        });
        
        setMessages([welcomeMsg]);
        setIsLoading(false);
        setChatInitialized(true);
      } catch (error) {
        console.error('Init error:', error);
        const fallbackMsg: UnifiedMessage = {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: `Hallo! Ich bin ${coach?.name || 'dein Coach'}. Wie kann ich dir helfen?`,
          created_at: new Date().toISOString(),
          coach_personality: coach?.personality || 'motivierend',
          images: [],
          mode: mode
        };
        setMessages([fallbackMsg]);
        setIsLoading(false);
        setChatInitialized(true);
      }
    };
    
    init();
  }, [user?.id, coach?.name, coach?.id, coach?.personality, mode, tokens]);
  
  // ============= REAL COACH CHAT WITH AI =============
  const sendMessage = useCallback(async () => {
    // Allow image-only messages or text messages
    if ((!inputText.trim() && uploadedImages.length === 0) || !user?.id) return;
    
    const userMessage: UnifiedMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputText,
      created_at: new Date().toISOString(),
      coach_personality: coach?.personality || 'motivierend',
      images: uploadedImages,
      mode: mode
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Nutzer-Nachricht sofort in DB speichern (mit Bildern)
    const today = new Date().toISOString().split('T')[0];
    const messageContent = uploadedImages.length > 0 
      ? `${inputText}\n\nImages: ${uploadedImages.join(', ')}`
      : inputText;
    
    await supabase.from('coach_conversations').insert({
      user_id: user.id,
      message_role: 'user',
      message_content: messageContent,
      coach_personality: coach?.id || 'lucy',
      conversation_date: today,
      context_data: {
        hasImages: uploadedImages.length > 0,
        images: uploadedImages
      }
    });
    
    setInputText('');
    setUploadedImages([]);
    setHasFiles(false);
    setIsThinking(true);

    try {
      // Check if we have images to analyze
      const hasImages = uploadedImages.length > 0;
      let data, error;

      if (hasImages) {
        // Use coach-media-analysis for image/video analysis
        const response = await supabase.functions.invoke('coach-media-analysis', {
          body: {
            userId: user.id,
            mediaUrls: uploadedImages,
            mediaType: 'image', // Default to image, could be enhanced to detect video
            analysisType: 'general',
            coachPersonality: coach?.id || 'lucy',
            userQuestion: inputText || 'Was siehst du in diesem Bild?',
            userProfile: {
              mode: mode,
              selectedTool: selectedTool,
              profileData: profileData,
              todaysTotals: todaysTotals,
              workoutData: workoutData,
              sleepData: sleepData,
              weightHistory: weightHistory,
              averages: averages,
              dailyGoals: dailyGoals
            }
          }
        });
        data = response.data;
        error = response.error;
      } else {
        // Use enhanced-coach-chat for text-only conversations
        const conversation = [...messages, userMessage].map(msg => {
          // Type guard for text messages
          const isTextMessage = 'content' in msg;
          return {
            role: msg.role,
            content: isTextMessage ? msg.content : '',
            images: isTextMessage ? (msg.images || []) : [],
            created_at: msg.created_at,
            coach_personality: msg.coach_personality || coach?.personality || 'motivierend',
            mode: isTextMessage ? (msg.mode || mode) : mode
          };
        });

        const response = await supabase.functions.invoke('enhanced-coach-chat', {
          body: {
            conversation: conversation,
            userId: user.id,
            // Include context data for compatibility
            context_data: {
              mode: mode,
              selectedTool: selectedTool,
              profileData: profileData,
              todaysTotals: todaysTotals,
              workoutData: workoutData,
              sleepData: sleepData,
              weightHistory: weightHistory,
              averages: averages,
              dailyGoals: dailyGoals
            }
          }
        });
        data = response.data;
        error = response.error;
      }

      // Map response format for consistency between functions
      if (hasImages && data?.analysis) {
        data.response = data.analysis;
      }

      if (error) {
        console.error('Coach chat error:', error);
        // Fallback response if function fails
        const fallbackResponse = hasImages 
          ? "Entschuldigung, ich kann dein Bild gerade nicht analysieren. Versuche es bitte später nochmal."
          : "Entschuldigung, ich kann gerade nicht antworten. Versuche es bitte später nochmal.";
        
        const fallbackMessage: UnifiedMessage = {
          id: `fallback-${Date.now()}`,
          role: 'assistant',
          content: fallbackResponse,
          created_at: new Date().toISOString(),
          coach_personality: coach?.personality || 'motivierend',
          images: [],
          mode: mode
        };
        setMessages(prev => [...prev, fallbackMessage]);
        setIsThinking(false);
        return;
      }

      // Handle different response types (text or card)
      let assistantMessage: UnifiedMessage;
      
      if (data.type === 'card') {
        assistantMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          type: 'card',
          tool: data.card,
          payload: data.payload,
          created_at: new Date().toISOString(),
          coach_personality: coach?.personality || 'motivierend'
        };
      } else {
        assistantMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.response || 'Entschuldigung, ich konnte nicht antworten.',
          created_at: new Date().toISOString(),
          coach_personality: coach?.personality || 'motivierend',
          images: [],
          mode: mode
        };
      }

      setMessages(prev => [...prev, assistantMessage]);
      
      // AI-Antwort auch in DB speichern
      if (data.type !== 'card') { // Nur Text-Nachrichten speichern, keine Cards
        await supabase.from('coach_conversations').insert({
          user_id: user.id,
          message_role: 'assistant',
          message_content: data.response || 'Entschuldigung, ich konnte nicht antworten.',
          coach_personality: coach?.id || 'lucy',
          conversation_date: today
        });
      }
      
      // Handle tool reset from card metadata
      if (data.meta?.clearTool) {
        console.log('🔄 Clearing tool after card response');
        setSelectedTool(null);
      }
    } catch (error) {
      console.error('Send error:', error);
      const errorMessage: UnifiedMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Entschuldigung, ich konnte deine Nachricht nicht verarbeiten. Versuche es bitte nochmal.',
        created_at: new Date().toISOString(),
        coach_personality: coach?.personality || 'motivierend',
        images: [],
        mode: mode
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
      setSelectedTool(null); // Reset tool after use
    }
  }, [inputText, uploadedImages, user?.id, coach?.personality, mode, selectedTool, profileData, todaysTotals, workoutData, sleepData, weightHistory, averages, dailyGoals, messages]);

  // Handle voice recording
  const handleVoiceToggle = useCallback(async () => {
    if (isRecording) {
      const transcript = await stopRecording();
      setRecordingState(false);
      if (transcript) {
        setInputText(prev => prev + (prev ? ' ' : '') + transcript);
      }
    } else {
      await startRecording();
      setRecordingState(true);
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleVoiceSend = useCallback(async () => {
    const transcript = await stopRecording();
    setRecordingState(false);
    if (transcript) {
      setInputText(prev => prev + (prev ? ' ' : '') + transcript);
    }
  }, [stopRecording]);

  const handleVoiceCancel = useCallback(async () => {
    await stopRecording();
    setRecordingState(false);
  }, [stopRecording]);

  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      const uploadedUrls = await uploadFiles(Array.from(files));
      if (uploadedUrls.length > 0) {
        setUploadedImages(prev => [...prev, ...uploadedUrls]);
        setHasFiles(true);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Fehler beim Hochladen der Datei');
    }
    
    // Reset file input
    event.target.value = '';
  }, [uploadFiles]);

  // Remove image from uploaded images
  const removeImage = useCallback((index: number) => {
    setUploadedImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      if (newImages.length === 0) {
        setHasFiles(false);
      }
      return newImages;
    });
  }, []);

  // Tool color mapping
  const colorMap: Record<string, string> = {
    trainingsplan: 'var(--tool-trainingsplan)',
    uebung: 'var(--tool-uebung)', 
    supplement: 'var(--tool-supplement)',
    gewicht: 'var(--tool-gewicht)',
    foto: 'var(--tool-foto)',
    // Aliases for backwards compatibility
    workout: 'var(--tool-trainingsplan)',
    exercise: 'var(--tool-uebung)',
    weight: 'var(--tool-gewicht)',
    photo: 'var(--tool-foto)'
  };

  const labelMap: Record<string, string> = {
    trainingsplan: '🏋️‍♂️ Trainingsplan',
    uebung: '📒 Übung',
    supplement: '💊 Supplement', 
    gewicht: '📈 Gewicht',
    foto: '📷 Foto',
    workout: '🏋️‍♂️ Trainingsplan',
    exercise: '📒 Übung',
    weight: '📈 Gewicht',
    photo: '📷 Foto'
  };

  // Tool activation handler
  const handleToolSelect = useCallback((tool: string | null) => {
    setSelectedTool(tool);
    
    // Haptic feedback for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
    
    if (tool) {
      const color = colorMap[tool];
      const label = labelMap[tool];
      
      if (color) {
        document.documentElement.style.setProperty('--tool-current', color);
        setToolBadgeText(`${label} aktiv`);
        setShowToolBadge(true);
        
        // Add tool-active class to both textareas
        const textarea = document.getElementById('chatInput');
        const textareaCard = document.getElementById('chatInputCard');
        textarea?.classList.add('tool-active');
        textareaCard?.classList.add('tool-active');
        
        // Fade badge after 3 seconds
        setTimeout(() => {
          const badge = document.getElementById('toolBadge');
          const badgeCard = document.getElementById('toolBadgeCard');
          badge?.classList.add('dim');
          badgeCard?.classList.add('dim');
        }, 3000);
      }
    } else {
      // Clear tool
      document.documentElement.style.removeProperty('--tool-current');
      setShowToolBadge(false);
      
      const textarea = document.getElementById('chatInput');
      const textareaCard = document.getElementById('chatInputCard');
      textarea?.classList.remove('tool-active');
      textareaCard?.classList.remove('tool-active');
    }
  }, [colorMap, labelMap]);

  // Enhanced voice toggle with haptic feedback
  const handleVoiceToggleWithHaptic = useCallback(() => {
    // Haptic feedback for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
    handleVoiceToggle();
  }, [handleVoiceToggle]);

  // Determine if send button should be enabled
  const canSend = useMemo(() => {
    return inputText.trim() || uploadedImages.length > 0 || selectedTool;
  }, [inputText, uploadedImages.length, selectedTool]);

  // Effect to handle transcribed text
  useEffect(() => {
    if (transcribedText && !isRecording) {
      setInputText(prev => prev + (prev ? ' ' : '') + transcribedText);
    }
  }, [transcribedText, isRecording]);

  // Handle history and chat deletion
  const handleHistoryClick = () => {
    // Handle history functionality
    console.log('History clicked');
  };

  const handleDeleteChat = async () => {
    try {
      // Clear messages for today
      setMessages([]);
      toast.success('Chat gelöscht');
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  // Auto-scroll refs for both layouts
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (scrollRef.current) {
      // Fallback for card layout
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // ============= RENDER LOGIC =============
  if (isLoading) {
    if (useFullscreenLayout) {
      return (
        <ChatLayout>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-neutral-400">Chat wird geladen...</p>
            </div>
          </div>
        </ChatLayout>
      );
    }
    
    return (
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Chat wird geladen...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============= FULLSCREEN LAYOUT =============
  if (useFullscreenLayout) {

    const chatInput = (
      <div className="space-y-2 px-3 py-2">
        {/* Upload Progress */}
        <UploadProgress progress={uploadProgress} isVisible={uploading} />
        
        {/* Uploaded Images Thumbnails */}
        {uploadedImages.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-2">
            {uploadedImages.map((imageUrl, index) => (
              <div key={index} className="relative group">
                <img
                  src={imageUrl}
                  alt={`Hochgeladenes Bild ${index + 1}`}
                  className="w-full h-20 object-cover rounded-lg border border-border/50"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110 transition-transform"
                  aria-label={`Bild ${index + 1} entfernen`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Textarea Row */}
        <div className="relative">
          {/* Tool Badge */}
          {showToolBadge && (
            <div 
              id="toolBadge" 
              className={`tool-active show ${showToolBadge ? '' : 'hidden'}`}
            >
              {toolBadgeText}
            </div>
          )}
          <Textarea
            id="chatInput"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Nachricht eingeben ..."
            rows={4}
            disabled={recordingState}
            className="w-full min-h-[96px] rounded-xl px-4 py-3 bg-white/60 dark:bg-black/40 backdrop-blur border border-white/40 dark:border-white/20 focus:outline-none resize-none overflow-auto"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
              if (e.key === 'Escape' && recordingState) {
                handleVoiceCancel();
              }
            }}
          />
          
          {/* Recording Overlay */}
          {recordingState && (
            <div className="absolute inset-0 z-20 rounded-xl bg-white/70 dark:bg-black/50 backdrop-blur flex items-center justify-between px-4" role="dialog" aria-live="polite">
              <button 
                onClick={handleVoiceCancel}
                className="btn-cancel px-3 py-2"
              >
                ✕ Abbrechen
              </button>
              
              <div className="flex flex-col items-center">
                <div className="flex gap-1 h-5">
                  <span className="bar"></span>
                  <span className="bar"></span>
                  <span className="bar"></span>
                  <span className="bar"></span>
                  <span className="bar"></span>
                </div>
                <span className="mt-1 text-xs">Ich höre zu ...</span>
              </div>
              
              <button 
                onClick={handleVoiceSend}
                className="btn-send px-3 py-2"
              >
                ➤ Senden
              </button>
            </div>
          )}
        </div>
        
        {/* Buttons Row */}
        <div className={`flex items-center gap-2 transition-opacity duration-300 ${recordingState ? 'opacity-20 pointer-events-none' : ''}`}>
          <ToolPicker onToolSelect={handleToolSelect} selectedTool={selectedTool} />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="icon-btn"
            aria-label="Datei hochladen"
          >
            <Paperclip className="w-6 h-6" />
          </button>
          
          <div className="flex-1"></div>
          
          <button
            type="button"
            onClick={handleVoiceToggleWithHaptic}
            disabled={isProcessing}
            className={`icon-btn text-red-500 ${recordingState ? 'recording' : ''}`}
            aria-label="Aufnahme starten"
            id="micBtn"
          >
            <Mic className="w-6 h-6" />
          </button>
          
          <button 
            onClick={sendMessage} 
            disabled={!canSend || isThinking || recordingState}
            className="btn-send px-4 py-2"
          >
            ➤ Senden
          </button>
        </div>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileUpload}
          className="hidden"
          multiple
        />
      </div>
    );

    return (
      <>
        <CollapsibleCoachHeader
          coach={{
            name: coach?.name || 'Coach',
            imageUrl: coach?.imageUrl,
            specialization: coach?.expertise?.join(', ') || coach?.personality
          }}
          onHistoryClick={handleHistoryClick}
          onDeleteChat={handleDeleteChat}
        />
        
        <ChatLayout chatInput={chatInput}>
          
          {/* Render all messages using the unified message renderer */}
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-3 pb-4">
              {messages.map(message => renderMessage(message))}
              {isThinking && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span>Coach denkt nach...</span>
                </div>
              )}
              {/* Invisible div to scroll to */}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </ChatLayout>
      </>
    );
  }

  // ============= CARD LAYOUT (FALLBACK) =============
  return (
    <Card className="flex-1 flex flex-col">
      <CardHeader className="flex-none">
        <CardTitle className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={coach?.imageUrl} />
            <AvatarFallback>{coach?.name?.[0] || 'C'}</AvatarFallback>
          </Avatar>
          <span>{coach?.name || 'Coach'}</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4 min-h-0">
        <ScrollArea ref={scrollRef} className="flex-1">
          {/* Render all messages using the unified message renderer */}
          <div className="space-y-3 p-4">
            {messages.map(message => renderMessage(message))}
            {isThinking && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span>Coach denkt nach...</span>
              </div>
            )}
            {/* Invisible div to scroll to */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <div className="flex-none">
          <div className="space-y-2 px-3 py-2">
            {/* Upload Progress */}
            <UploadProgress progress={uploadProgress} isVisible={uploading} />
            
            {/* Uploaded Images Thumbnails */}
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-2">
                {uploadedImages.map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={imageUrl}
                      alt={`Hochgeladenes Bild ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg border border-border/50"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110 transition-transform"
                      aria-label={`Bild ${index + 1} entfernen`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Textarea Row */}
            <div className="relative">
              {/* Tool Badge */}
              {showToolBadge && (
                <div 
                  id="toolBadgeCard" 
                  className={`tool-active show ${showToolBadge ? '' : 'hidden'}`}
                >
                  {toolBadgeText}
                </div>
              )}
              <Textarea
                id="chatInputCard"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Nachricht eingeben ..."
                rows={4}
                disabled={recordingState}
                className="w-full min-h-[96px] rounded-xl px-4 py-3 bg-white/60 dark:bg-black/40 backdrop-blur border border-white/40 dark:border-white/20 focus:outline-none resize-none overflow-auto"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                  if (e.key === 'Escape' && recordingState) {
                    handleVoiceCancel();
                  }
                }}
              />
              
              {/* Recording Overlay */}
              {recordingState && (
                <div className="absolute inset-0 z-20 rounded-xl bg-white/70 dark:bg-black/50 backdrop-blur flex items-center justify-between px-4" role="dialog" aria-live="polite">
                  <button 
                    onClick={handleVoiceCancel}
                    className="btn-cancel px-3 py-2"
                  >
                    ✕ Abbrechen
                  </button>
                  
                  <div className="flex flex-col items-center">
                    <div className="flex gap-1 h-5">
                      <span className="bar"></span>
                      <span className="bar"></span>
                      <span className="bar"></span>
                      <span className="bar"></span>
                      <span className="bar"></span>
                    </div>
                    <span className="mt-1 text-xs">Ich höre zu ...</span>
                  </div>
                  
                  <button 
                    onClick={handleVoiceSend}
                    className="btn-send px-3 py-2"
                  >
                    ➤ Senden
                  </button>
                </div>
              )}
            </div>
            
            {/* Buttons Row */}
            <div className={`flex items-center gap-2 transition-opacity duration-300 ${recordingState ? 'opacity-20 pointer-events-none' : ''}`}>
              <ToolPicker onToolSelect={handleToolSelect} selectedTool={selectedTool} />
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="icon-btn"
                aria-label="Datei hochladen"
              >
                <Paperclip className="w-6 h-6" />
              </button>
              
              <div className="flex-1"></div>
              
              <button
                type="button"
                onClick={handleVoiceToggleWithHaptic}
                disabled={isProcessing}
                className={`icon-btn text-red-500 ${recordingState ? 'recording' : ''}`}
                aria-label="Aufnahme starten"
                id="micBtn"
              >
                <Mic className="w-6 h-6" />
              </button>
              
              <button 
                onClick={sendMessage} 
                disabled={!canSend || isThinking || recordingState}
                className="btn-send px-4 py-2"
              >
                ➤ Senden
              </button>
            </div>
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
              multiple
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export { UnifiedCoachChat };
export default UnifiedCoachChat;