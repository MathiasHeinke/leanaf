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
import { Plus } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useDebugChat } from '@/hooks/useDebugChat';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useUniversalImageAnalysis } from '@/hooks/useUniversalImageAnalysis';
import { useGlobalCoachMemory } from '@/hooks/useGlobalCoachMemory';
import { useWorkoutPlanDetection } from '@/hooks/useWorkoutPlanDetection';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { CollapsibleCoachHeader } from '@/components/CollapsibleCoachHeader';
import { GlobalHeader } from '@/components/GlobalHeader';
import { useContextTokens } from '@/hooks/useContextTokens';
// AI-Greeting-Revolution: No more static templates!

import { getDisplayName } from "../../supabase/functions/enhanced-coach-chat/utils/getDisplayName";
import { TypingIndicator } from '@/components/TypingIndicator';

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
  const [bannerCollapsed, setBannerCollapsed] = useState(false);
  
  
  // ============= REFS =============
  const initializationRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // ============= HOOKS =============
  const { 
    memory, 
    isGlobalMemoryLoaded, 
    processMessage,
    getMemorySummary 
  } = useGlobalCoachMemory();
  const { isRecording, isProcessing, transcribedText, startRecording, stopRecording } = useVoiceRecording();
  const { analyzeImage, isAnalyzing } = useUniversalImageAnalysis();
  const { uploadFiles, uploading, uploadProgress } = useMediaUpload();
  const { tokens } = useContextTokens(user?.id);
  const { sendDebug, loading: debugLoading } = useDebugChat();
  
  // ============= CHAT PERSISTIERUNG =============
  useEffect(() => {
    if (!user?.id || initializationRef.current) return;
    
    initializationRef.current = true;
    
    const init = async () => {
      try {
        // Show thinking indicator immediately
        setIsThinking(true);
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
          setIsThinking(false);
          setIsLoading(false);
          setChatInitialized(true);
          return; // Beende hier - keine neue Begrüßung nötig
        }

        // 2. Nur wenn keine Nachrichten für heute existieren: Begrüßung generieren
        console.log('🎯 No existing chat found, generating greeting...');
        
        // Start with fast fallback, then optionally enhance
        const getRandomFallback = (coachId: string) => {
          const fallbackGreetings = {
            'lucy': [
              `Hey! 💗 Bereit?`,
              `Hallo! ✨ Loslegen?`,
              `Hi! 🌟 Auf geht's!`
            ],
            'sascha': [
              `Moin! 💪 Los!`,
              `Hey! ⚡ Durchstarten?`,
              `Servus! 🔥 Bereit?`
            ],
            'kai': [
              `Hey! ⚡ Energie da?`,
              `Moin! 🚀 Los geht's!`,
              `Hi! 💫 Ready?`
            ],
            'markus': [
              `Hajo! 🔥 Ballern?`,
              `Servus! 💪 Schaffe?`,
              `Hey Jung! ⚡ Los!`
            ],
            'dr_vita': [
              `Hallo! 🌸 Wie geht's?`,
              `Guten Tag! 💚 Bereit?`,
              `Hallo! 🌿 Alles gut?`
            ],
            'sophia': [
              `Namaste! 🌿 Ready?`,
              `Hallo! 🧘‍♀️ Los?`,
              `Hi! ✨ Achtsam starten?`
            ]
          };
          const options = fallbackGreetings[coachId] || [`Hallo! 👋`];
          return options[Math.floor(Math.random() * options.length)];
        };

        let enhancedGreeting = getRandomFallback(coach?.id || 'lucy');
        
        // Try to get AI greeting with short timeout (parallel, non-blocking)
        const tryAIGreeting = async () => {
          try {
            const response = await Promise.race([
              supabase.functions.invoke('generate-intelligent-greeting', {
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
              }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
            ]) as any;
            
            if (!response.error && response.data?.greeting) {
              return response.data.greeting;
            }
          } catch (error) {
            console.warn('AI greeting failed/timeout, using fallback');
          }
          return null;
        };

        // Use fallback immediately, try AI enhancement in background
        tryAIGreeting().then(aiGreeting => {
          if (aiGreeting && aiGreeting !== enhancedGreeting) {
            // Update greeting if AI version is different and better
            setMessages(prev => prev.map(msg => 
              msg.id.startsWith('welcome-') 
                ? { ...msg, content: aiGreeting }
                : msg
            ));
          }
        });
        
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
        setIsThinking(false);
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
        setIsThinking(false);
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

      // Build conversation history for the unified engine
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: ('content' in msg) ? msg.content : '',
        images: ('images' in msg) ? (msg.images || []) : [],
        created_at: msg.created_at
      }));

      // Route to correct endpoint based on debug mode (Shift+Enter = debug)
      const targetFunction = 'unified-coach-engine'; // Always use unified-coach-engine for normal chat
      
      console.log(`🚀 Sending message to ${targetFunction} with XXL-Memory`);
      
      const response = await supabase.functions.invoke(targetFunction, {
        body: {
          userId: user.id,
          message: inputText || (hasImages ? 'Bitte analysiere dieses Bild.' : ''),
          images: uploadedImages,
          mediaType: hasImages ? 'image' : undefined,
          analysisType: 'general',
          coachPersonality: coach?.id || 'lucy',
          conversationHistory: conversationHistory,
          toolContext: {
            tool: selectedTool || 'chat',
            description: (selectedTool || 'chat') === 'chat'
              ? 'Freies Gespräch / Intent-Analyse'
              : `Benutzer hat Tool "${selectedTool || 'chat'}" ausgewählt`,
            data: {
              mode: mode,
              profileData: profileData,
              todaysTotals: todaysTotals,
              workoutData: workoutData,
              sleepData: sleepData,
              weightHistory: weightHistory,
              averages: averages,
              dailyGoals: dailyGoals
            }
          }
        }
      });
      data = response.data;
      error = response.error;

      // Ensure consistent response format
      if (hasImages && data?.analysis && !data?.response) {
        data.response = data.analysis;
      }

      if (error) {
        const fullMsg = error.message ?? '';
        const status = error.status ?? 0;

        // 👉 Debug info für Dev/Power-User 
        console.warn('Chat-Error Details:', { status, fullMsg, error });

        // 🔄 Robustes Error-Handling mit Auto-Fallback 
        const isUsageLimit = (status: number, error: any) => 
          status === 429 || 
          error?.includes('USAGE_LIMIT_REACHED') ||
          (status === 0 && error?.includes('non-2xx status code')); // Supabase SDK Error für 429
        
        let userMsg = 'Entschuldigung, es gab ein technisches Problem.';
        
        if (isUsageLimit(status, error)) {
          console.warn('🔄 [Fallback►debug-direct-chat] reason:', { status, error });
          try {
            const fallbackResponse = await supabase.functions.invoke('debug-direct-chat', {
              body: {
                userId: user.id,
                message: inputText || (uploadedImages.length > 0 ? 'Bitte analysiere dieses Bild.' : ''),
                coachId: coach?.id || 'lucy'
              }
            });
            
            if (fallbackResponse.data?.content) {
              const fallbackMessage: UnifiedMessage = {
                id: `fallback-${Date.now()}`,
                role: 'assistant',
                content: fallbackResponse.data.content + '\n\n_⚡ Ausweich-Antwort (Engine überlastet)_',
                timestamp: new Date(),
                coach_personality: coach?.personality || 'motivierend',
                created_at: new Date().toISOString(),
                images: [],
                mode: mode
              };
              setMessages(prev => [...prev, fallbackMessage]);
              console.log('✅ Fallback auf debug-direct-chat erfolgreich');
              setIsThinking(false);
              return;
            }
          } catch (fallbackError) {
            console.error('❌ Fallback zu debug-direct-chat failed:', fallbackError);
          }
        }
        
        if (status === 429) {
          userMsg = 'Engine überlastet – versuche es in 1-2 Minuten erneut 🚀';
        } else if (fullMsg.includes('context_length')) {
          userMsg = 'Nachricht zu lang – bitte kürzer formulieren 🙏';
        } else if (fullMsg.includes('OpenAI API error')) {
          userMsg = 'KI-Service temporär nicht verfügbar – versuche es gleich nochmal.';
        } else if (status >= 500) {
          userMsg = 'Serverfehler – versuche es später erneut.';
        } else if (status === 400) {
          userMsg = 'Anfrage konnte nicht verarbeitet werden – bitte anders formulieren.';
        }

        const fallbackResponse: UnifiedMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: userMsg,
          created_at: new Date().toISOString(),
          coach_personality: coach?.personality || 'empathisch',
          images: [],
          mode: mode
        };

        setMessages(prev => [...prev, fallbackResponse]);
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
          content: data.content || data.response || 'Entschuldigung, ich konnte nicht antworten.',
          created_at: new Date().toISOString(),
          coach_personality: coach?.personality || 'motivierend',
          images: [],
          mode: mode
        };
      }

      setMessages(prev => [...prev, assistantMessage]);
      
      // Process message through Global Coach Memory for sentiment analysis
      if (data.response && processMessage) {
        try {
          await processMessage(data.response, coach?.id || 'lucy', false);
          console.log('✅ Coach memory updated after response');
        } catch (error) {
          console.warn('⚠️ Failed to update coach memory:', error);
        }
      }
      
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
    } catch (error: any) {
      console.error('Send error:', error);
      
      // Enhanced error handling based on diagnostic guide
      let errorContent = 'Entschuldigung, ich konnte deine Nachricht nicht verarbeiten. Versuche es bitte nochmal.';
      
      if (error?.status === 429) {
        if (error?.usage_limit_reached) {
          errorContent = 'Du hast dein tägliches Chat-Limit erreicht. Upgrade auf Premium 🚀';
          // Remove toast for better UX
        } else {
          errorContent = 'Zu viele Anfragen. Warte kurz und versuche es nochmal.';
          // Remove toast for better UX
        }
      } else if (error?.status === 404) {
        errorContent = 'Service vorübergehend nicht verfügbar. Versuche es gleich nochmal.';
        // Remove toast for better UX
      } else if (error?.status >= 500) {
        errorContent = 'Technisches Problem auf unserer Seite. Wir arbeiten daran!';
        // Remove toast for better UX
      }
      
      const errorMessage: UnifiedMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: errorContent,
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
      // Remove toast for better UX
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
      // Remove toast for better UX
    } catch (error) {
      console.error('Error clearing chat:', error);
      // Remove toast for better UX
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
            rows={3}
            disabled={recordingState}
            className="w-full min-h-[96px] rounded-xl px-4 py-3 bg-white/60 dark:bg-black/40 backdrop-blur border border-white/40 dark:border-white/20 focus:outline-none resize-none overflow-auto"
            onKeyDown={async (e) => {
              // 🔧 Debug Mode: Shift + Enter = Direct GPT-4.1
              if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault();
                if (!inputText.trim()) return;
                
                try {
                  // Add user message to chat
                   const userMessage: UnifiedMessage = {
                     id: `user-${Date.now()}`,
                     role: 'user',
                     content: inputText,
                     created_at: new Date().toISOString(),
                     coach_personality: coach?.personality || 'default',
                     timestamp: new Date()
                   };
                  setMessages(prev => [...prev, userMessage]);
                  
                  // Clear input and show thinking
                  const message = inputText;
                  setInputText('');
                  setIsThinking(true);
                  
                  // Send to debug endpoint
                  const debugResponse = await sendDebug({ 
                    message, 
                    coachId: coach?.id || 'lucy' 
                  });
                  
                  // Add debug response to chat
                   const debugMessage: UnifiedMessage = {
                     id: `debug-${Date.now()}`,
                     role: 'assistant',
                     content: `🔧 **Debug Mode (Direct GPT-4.1)**\n\n${debugResponse.content}`,
                     created_at: new Date().toISOString(),
                     coach_personality: coach?.personality || 'default',
                     timestamp: new Date()
                   };
                  
                  setMessages(prev => [...prev, debugMessage]);
                  toast.success("🔧 Debug: Direkte GPT-4.1 Antwort erhalten!");
                  
                } catch (error) {
                  console.error('Debug chat error:', error);
                  toast.error("🔧 Debug-Fehler: " + (error as Error).message);
                } finally {
                  setIsThinking(false);
                }
                return;
              }
              
              // Normal chat flow
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
            className="icon-btn group"
            aria-label="Datei hochladen"
          >
            <Plus className="w-6 h-6 transition-all duration-300 group-hover:rotate-90 group-hover:scale-110" />
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
      <div className="fixed inset-0 flex flex-col bg-background text-foreground z-50 overflow-x-hidden">
        {/* Global Header */}
        <GlobalHeader />
        
        {/* Coach Banner */}
        <CollapsibleCoachHeader
          coach={{
            name: coach?.name || 'Coach',
            imageUrl: coach?.imageUrl,
            specialization: coach?.expertise?.join(', ') || coach?.personality
          }}
          onHistoryClick={handleHistoryClick}
          onDeleteChat={handleDeleteChat}
          onCollapseChange={setBannerCollapsed}
        />

        {/* Chat Content mit dynamischem Padding */}
        <div 
          className="flex-1 min-h-0 w-full"
          style={{ 
            paddingTop: bannerCollapsed ? '8px' : 'var(--coach-banner-height)',
            overflowX: 'hidden'
          }}
        >
          <div className="h-full w-full overflow-y-auto overflow-x-hidden px-4 py-2 space-y-2"
               style={{ 
                 overscrollBehavior: 'contain',
                 touchAction: 'pan-y'
               }}>
            {/* Render all messages using the unified message renderer */}
            <div className="space-y-3 pb-4">
              {messages.map(message => renderMessage(message))}
              {isThinking && (
                <TypingIndicator name={coach?.name || 'Coach'} />
              )}
              {/* Invisible div to scroll to */}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Chat Input + Footer (gemeinsamer Block!) */}
        <div className="flex-shrink-0">
          
          {/* Eingabefeld direkt auf Footer */}
          <div className="px-3 py-1 bg-card border-t border-border">
            {chatInput}
          </div>

          {/* Footer: kein zusätzlicher Abstand */}
          <div className="h-[32px] flex items-center justify-center text-xs text-muted-foreground bg-card m-0 p-0">
            © 2025 GetleanAI. Made with ❤️ in Germany
          </div>

        </div>
      </div>
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
              <TypingIndicator name={coach?.name || 'Coach'} />
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
                rows={3}
                disabled={recordingState}
                className="w-full min-h-[96px] rounded-xl px-4 py-3 bg-white/60 dark:bg-black/40 backdrop-blur border border-white/40 dark:border-white/20 focus:outline-none resize-none overflow-auto"
                onKeyDown={async (e) => {
                  // 🔧 Debug Mode: Shift + Enter = Direct GPT-4.1
                  if (e.key === 'Enter' && e.shiftKey) {
                    e.preventDefault();
                    if (!inputText.trim()) return;
                    
                    try {
                      // Add user message to chat
                       const userMessage: UnifiedMessage = {
                         id: `user-${Date.now()}`,
                         role: 'user',
                         content: inputText,
                         created_at: new Date().toISOString(),
                         coach_personality: coach?.personality || 'default',
                         timestamp: new Date()
                       };
                      setMessages(prev => [...prev, userMessage]);
                      
                      // Clear input and show thinking
                      const message = inputText;
                      setInputText('');
                      setIsThinking(true);
                      
                      // Send to debug endpoint
                      const debugResponse = await sendDebug({ 
                        message, 
                        coachId: coach?.id || 'lucy' 
                      });
                      
                      // Add debug response to chat
                       const debugMessage: UnifiedMessage = {
                         id: `debug-${Date.now()}`,
                         role: 'assistant',
                         content: `🔧 **Debug Mode (Direct GPT-4.1)**\n\n${debugResponse.content}`,
                         created_at: new Date().toISOString(),
                         coach_personality: coach?.personality || 'default',
                         timestamp: new Date()
                       };
                      
                      setMessages(prev => [...prev, debugMessage]);
                      toast.success("🔧 Debug: Direkte GPT-4.1 Antwort erhalten!");
                      
                    } catch (error) {
                      console.error('Debug chat error:', error);
                      toast.error("🔧 Debug-Fehler: " + (error as Error).message);
                    } finally {
                      setIsThinking(false);
                    }
                    return;
                  }
                  
                  // Normal chat flow
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
                className="icon-btn group"
                aria-label="Datei hochladen"
              >
                <Plus className="w-6 h-6 transition-all duration-300 group-hover:rotate-90 group-hover:scale-110" />
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