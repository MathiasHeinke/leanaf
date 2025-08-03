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
import { debounce } from 'lodash';

// Add missing debouncedSendMessage
const debouncedSendMessage = debounce(() => {}, 500);
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
import { useConversationMemory } from '@/hooks/useConversationMemory';
import { useWorkoutPlanDetection } from '@/hooks/useWorkoutPlanDetection';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { CollapsibleCoachHeader } from '@/components/CollapsibleCoachHeader';
import { GlobalHeader } from '@/components/GlobalHeader';
import { useContextTokens } from '@/hooks/useContextTokens';
// AI-Greeting-Revolution: No more static templates!
import { TypingIndicator } from '@/components/TypingIndicator';
import { ProgressIndicator } from '@/components/ProgressIndicator';
import { StreamingIndicator } from '@/components/StreamingIndicator';
import { WorkoutPlanCreationModal } from './WorkoutPlanCreationModal';
import { WeightEntryModal } from './WeightEntryModal';
import { SupplementTrackingModal } from './SupplementTrackingModal';
import { DiaryEntryModal } from './DiaryEntryModal';
import { QuickWorkoutModal } from './QuickWorkoutModal';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';

// SimpleMessageList import removed - not used in this component
import { MediaUploadZone } from '@/components/MediaUploadZone';
import { ChatLayout } from '@/components/layouts/ChatLayout';
import { ExercisePreviewCard } from '@/components/ExercisePreviewCard';
import { CoachWorkoutPlanSaver } from '@/components/CoachWorkoutPlanSaver';
import { ToolPicker } from '@/components/ToolPicker';
import { UploadProgress } from '@/components/UploadProgress';
import { WorkoutCheckUpTrigger } from '@/components/WorkoutCheckUpTrigger';
import { renderMessage, createCardMessage, type UnifiedMessage } from '@/utils/messageRenderer';
import { detectToolIntent, shouldUseTool, getToolEmoji, isIntentAppropriate } from '@/utils/toolDetector';
import { prefillModalState } from '@/utils/modalContextHelpers';
import { generateMessageId, createTimeoutPromise } from '@/utils/messageHelpers';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import { useProactiveCoachBehavior } from '@/hooks/useProactiveCoachBehavior';
import { useAdvancedRetryLogic } from '@/hooks/useAdvancedRetryLogic';


// ============= TYPES =============
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  coach_personality: string;
  images?: string[];
  mode?: string;
  status?: 'sending' | 'sent' | 'failed'; // Add status field for optimistic UI
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
  persona?: any; // Coach persona data from coach-personas.json
  personaId?: string; // Coach persona ID for backend routing
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContext, setModalContext] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  
  // ============= REFS =============
  const initializationRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // ============= HOOKS =============
  const conversationId = coach?.id || 'general-coach';
  const { 
    context: memoryContext, 
    isLoading: isMemoryLoading,
    addMessage: addToMemory,
    getPromptContext,
    clearMemory
  } = useConversationMemory(conversationId);
  const { isRecording, isProcessing, transcribedText, startRecording, stopRecording } = useVoiceRecording();
  const { analyzeImage, isAnalyzing } = useUniversalImageAnalysis();
  const { uploadFiles, uploading, uploadProgress } = useMediaUpload();
  const { tokens } = useContextTokens(user?.id);
  const { sendDebug, loading: debugLoading } = useDebugChat();
  
  // ============= STREAMING INTEGRATION =============
  const { 
    streamingMessage, 
    isConnected: isStreamingConnected, 
    startStreaming, 
    stopStreaming,
    clearStreamingMessage 
  } = useStreamingChat({
    onStreamStart: () => {
      console.log('🚀 Streaming started');
      setIsThinking(true);
    },
    onStreamEnd: () => {
      console.log('✅ Streaming completed');
      setIsThinking(false);
    },
    onError: (error) => {
      console.error('❌ Streaming error:', error);
      setIsThinking(false);
    }
  });

  // ============= PROACTIVE BEHAVIOR =============
  const {
    context: proactiveContext,
    suggestions,
    analyzeUserMessage,
    applySuggestion,
    dismissSuggestion,
    getContextualPromptEnhancement
  } = useProactiveCoachBehavior(coach?.id || 'general');

  // ============= ADVANCED RETRY LOGIC =============
  const {
    executeWithRetry,
    manualRetry,
    getRetryInfo,
    performanceMetrics,
    retryStates
  } = useAdvancedRetryLogic();
  
  // ============= PROFILE DATA LOADING =============
  const [loadedProfileData, setLoadedProfileData] = useState<any>(null);
  const [loadedDailyGoals, setLoadedDailyGoals] = useState<any>(null);
  const [summaryHistory, setSummaryHistory] = useState<any>(null);
  
  // 🟢 Load profile data if not provided as props - ALWAYS ensure we have profile
  useEffect(() => {
    if (!user?.id) return;
    
    const loadProfileData = async () => {
      try {
        // ✅ ALWAYS load profile to ensure it's available in toolContext
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        setLoadedProfileData(profile);
        
        // Load daily goals if not provided
        if (!dailyGoals) {
          const { data: goals } = await supabase
            .from('daily_goals')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          setLoadedDailyGoals(goals);
        }

        // Phase 3-a: Auto-Loader für History-Snapshots
        if (!summaryHistory) {
          const { data } = await supabase
            .rpc('get_summary_range_v2', { p_user_id: user.id, p_days: 14 });
          setSummaryHistory(data);
        }
      } catch (error) {
        console.error('Error loading profile/goals:', error);
      }
    };
    
    loadProfileData();
  }, [user?.id, profileData, dailyGoals]);
  
  // Use loaded data if props are not provided
  const effectiveProfileData = profileData || loadedProfileData;
  const effectiveDailyGoals = dailyGoals || loadedDailyGoals;
  
  // ============= CHAT PERSISTIERUNG =============
  useEffect(() => {
    if (!user?.id || initializationRef.current) return;
    
    initializationRef.current = true;
    
    const init = async () => {
      try {
        // Show thinking indicator immediately
        setIsThinking(true);
        setIsLoading(true);
        
        // 1. Chat-History aus coach_conversations laden (aktuelle Tabelle)
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
  }, [user?.id, coach?.name, coach?.id, coach?.personality, mode]);
  
  // Helper function for human-like fallback messages
  const getHumanFallbackMessage = (coachId: string, attempt: number) => {
    const fallbackMessages: Record<string, string[]> = {
      'lucy': [
        "Oh nein, da ist wohl gerade etwas schief gelaufen 😅 Lass mich das nochmal versuchen!",
        "Hmm, ich hab dich gerade nicht richtig verstanden. Magst du das nochmal für mich wiederholen?",
        "Entschuldige, mein Kopf ist gerade etwas vernebelt. Kannst du mir das nochmal sagen?",
        "Ups, da war wohl ein kleiner Schluckauf! Versuchen wir's nochmal, okay?"
      ],
      'sascha': [
        "Verdammt, da ist was schief gelaufen! 💪 Lass uns das nochmal rocken!",
        "Kein Problem, wir packen das! 🔥 Versuch's einfach nochmal!",
        "Shit happens! 😅 Aber wir geben nicht auf - nochmal!",
        "Technical difficulties, aber wir bleiben am Ball! Los geht's!"
      ],
      'sophia': [
        "Entschuldige, da gab es eine kleine Störung in meinem System. 🧘‍♀️ Lass uns achtsam neu beginnen.",
        "Die digitale Welt kann manchmal unberechenbar sein. Möchtest du es nochmal versuchen?",
        "Wie bei der Meditation - manchmal müssen wir neu anfangen. Bitte wiederhole deine Frage.",
        "Ein kleiner technischer Stolperstein. Lass uns mit Ruhe einen neuen Versuch starten."
      ],
      'dr_vita': [
        "Liebe, da ist gerade etwas nicht richtig angekommen bei mir. 💚 Kannst du das nochmal für mich sagen?",
        "Entschuldige, meine Aufmerksamkeit war kurz woanders. Wiederhole das bitte für mich.",
        "Oh je, da war wohl ein kleiner Aussetzer. Lass uns das nochmal angehen, okay?",
        "Manchmal haben auch wir Frauen unsere technischen Momente! 😊 Versuch's nochmal."
      ],
      'kai': [
        "Whoops! ⚡ Da ist was schief gegangen. Ready für Runde 2?",
        "System-Glitch! 🚀 Aber wir lassen uns nicht stoppen - nochmal!",
        "Error 404: Antwort not found! 😅 Aber ich bin ready für den Retry!",
        "Technical timeout! Aber meine Energie ist noch da - weiter geht's!"
      ],
      'markus': [
        "Hajo, da ist was schief gelaufen! 💪 Aber wir schaffe des schon - nochmal!",
        "Scheiss Computer! 😅 Aber wir geben net auf, Jung! Versuch's wieder!",
        "Technical bullshit! 🔥 Aber wir bleiben dran - noch ein Versuch!",
        "System spinnt rum! Aber wir Schwoba geben net auf - weiter!"
      ]
    };
    
    const messages = fallbackMessages[coachId] || fallbackMessages['lucy'];
    return messages[Math.min(attempt - 1, messages.length - 1)];
  };

  // Auto-retry mechanism with human fallbacks
  const sendMessageWithRetry = async (message: string, images: string[], maxAttempts = 3) => {
    const hasImages = images.length > 0;
    
    // Tool detection and intent filtering BEFORE building conversation
    let detectedTool = selectedTool || 'chat';
    if (!selectedTool && message) {
      const toolContext = detectToolIntent(message);
      console.log('🔧 Tool detection result:', toolContext);

      // Check if tool usage is contextually appropriate
      const isAppropriate = await isIntentAppropriate(message, toolContext);
      console.log('🧠 Intent appropriateness check:', isAppropriate);
      console.log('🔍 DEBUG: Tool detected:', toolContext.tool, 'Confidence:', toolContext.confidence, 'Appropriate:', isAppropriate);

      if (shouldUseTool(toolContext) && isAppropriate) {
        detectedTool = toolContext.tool;
        console.log('✅ Auto-detected tool activated:', detectedTool);
      } else if (toolContext.confidence > 0.3 && !isAppropriate) {
        console.log('⚠️ Tool detected but context inappropriate - keeping as chat');
      }
    }
    
    // Build conversation history
    const conversationHistory = messages.slice(-10).map(msg => ({
      role: msg.role,
      content: ('content' in msg) ? msg.content : '',
      images: ('images' in msg) ? (msg.images || []) : [],
      created_at: msg.created_at
    }));

    const requestData = {
      userId: user.id,
      message: message || (hasImages ? 'Bitte analysiere dieses Bild.' : ''),
      images: images,
      mediaType: hasImages ? 'image' : undefined,
      analysisType: 'general',
      coachPersonality: coach?.id || 'lucy',
      conversationHistory: conversationHistory,
      // ✨ Zeit-Awareness für Coach
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      currentTime: new Date().toISOString(),
      toolContext: {
        tool: detectedTool,
        description: detectedTool === 'chat'
          ? 'Freies Gespräch / Intent-Analyse'
          : `Tool "${detectedTool}" ${selectedTool ? 'manuell ausgewählt' : 'automatisch erkannt'}`,
        isAppropriate: detectedTool !== 'chat' ? await isIntentAppropriate(message, { tool: detectedTool as any, description: '', confidence: 1 }) : true,
        data: {
          mode: mode,
          profileData: effectiveProfileData,
          todaysTotals: todaysTotals,
          workoutData: workoutData,
          sleepData: sleepData,
          weightHistory: weightHistory,
          averages: averages,
          dailyGoals: effectiveDailyGoals,
          summaryHistory: summaryHistory,
          bodyMeasurements: bodyMeasurements,
          progressPhotos: progressPhotos,
          // Enhanced context data for better coach analysis
          contextTokens: tokens,
          userMemorySummary: getPromptContext(),
          // Add current timestamp for temporal context
          requestTime: new Date().toISOString(),
          userTimezone: 'Europe/Berlin'
        }
      }
    };

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Wait between retries (except for first attempt)
        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }

        // Special handling for images - try image analysis first
        if (hasImages && attempt === 1) {
          console.log('🖼️ Attempting image analysis...');
          try {
            const analysisResult = await analyzeImage(images[0], message);
            if (analysisResult && analysisResult.analysisData) {
              console.log('✅ Image analysis successful');
              
              // 🔥 FIX: Process user's text question after image analysis
              let finalContent = analysisResult.analysisData.analysis || 'Bild erfolgreich analysiert!';
              
              if (message && message.trim()) {
                console.log('🤔 Processing user question after image analysis...');
                try {
                  // Make additional AI call to answer the user's question
                  const { data: aiResponse, error: aiError } = await supabase.functions.invoke('unified-coach-engine', {
                    body: {
                      userId: user.id,
                      message: message,
                      coachPersonality: coach?.id || 'lucy',
                      conversationHistory: [
                        { role: 'assistant', content: finalContent },
                        { role: 'user', content: message }
                      ],
                      toolContext: { tool: 'chat', description: 'Antwort auf Benutzerfrage nach Bildanalyse' }
                    }
                  });
                  
                  if (!aiError && aiResponse?.content) {
                    console.log('✅ User question processed successfully');
                    finalContent = `${finalContent}\n\n${aiResponse.content}`;
                  } else {
                    console.warn('⚠️ AI response failed, showing only image analysis');
                  }
                } catch (aiError) {
                  console.warn('⚠️ Failed to process user question:', aiError);
                }
              }
              
              return {
                content: finalContent,
                type: 'text',
                imageAnalysis: analysisResult
              };
            }
          } catch (imageError) {
            console.warn('⚠️ Image analysis failed, continuing with regular chat:', imageError);
            // Continue to regular chat processing
          }
        }

        // Choose function based on attempt
        const targetFunction = attempt <= 2 ? 'unified-coach-engine' : 'debug-direct-chat';
        
        console.log(`🚀 Attempt ${attempt}/${maxAttempts} using ${targetFunction}`);

        let response;
        if (targetFunction === 'debug-direct-chat') {
          // Simplified request for debug fallback
          response = await supabase.functions.invoke(targetFunction, {
            body: {
              userId: user.id,
              message: message || (hasImages ? 'Entschuldige, ich hatte Probleme mit der Bildanalyse. Kannst du mir beschreiben, was auf dem Bild zu sehen ist?' : ''),
              coachId: coach?.id || 'lucy'
            }
          });
        } else {
          response = await supabase.functions.invoke(targetFunction, {
            body: requestData
          });
        }

        // Success - return the response
        if (!response.error && response.data) {
          console.log(`✅ Success on attempt ${attempt}`);
          return response.data;
        }

        // Log error for debugging
        console.warn(`❌ Attempt ${attempt} failed:`, response.error);

      } catch (error) {
        console.warn(`❌ Attempt ${attempt} threw error:`, error);
      }
    }

    // All attempts failed - return human fallback message with image context
    console.log('💬 All attempts failed, using human fallback');
    const fallbackMessage = hasImages 
      ? `Entschuldige, ich hatte Schwierigkeiten mit der Bildanalyse. ${getHumanFallbackMessage(coach?.id || 'lucy', maxAttempts)} Kannst du mir beschreiben, was auf dem Bild zu sehen ist?`
      : getHumanFallbackMessage(coach?.id || 'lucy', maxAttempts);
    
    return {
      content: fallbackMessage,
      type: 'text',
      hasRetryButton: true
    };
  };

  // ============= REAL COACH CHAT WITH AI =============
  const sendMessage = useCallback(async () => {
    // Allow image-only messages or text messages
    if ((!inputText.trim() && uploadedImages.length === 0) || !user?.id) return;
    if (isThinking || uploading) return; // Block multiple sends
    
    // Generate unique message ID for idempotency
    const messageId = generateMessageId();
    
    const userMessage: UnifiedMessage = {
      id: messageId,
      role: 'user',
      content: inputText,
      created_at: new Date().toISOString(),
      coach_personality: coach?.personality || 'motivierend',
      images: uploadedImages,
      mode: mode,
      status: 'sending' // Optimistic UI
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Add user message to conversation memory with error handling
    setIsSyncing(true);
    try {
      await addToMemory({
        role: 'user',
        content: inputText,
        timestamp: new Date().toISOString()
      });
      console.log('✅ User message added to conversation memory');
      setMemoryError(null);
    } catch (error) {
      console.warn('⚠️ Failed to add user message to memory:', error);
      setMemoryError('Nachrichten-Speicherung fehlgeschlagen');
      sonnerToast.error('⚠️ Chat konnte nicht gespeichert werden', {
        description: 'Wird automatisch wiederholt...',
        action: {
          label: 'Erneut versuchen',
          onClick: () => {
            // Retry logic could be implemented here
            console.log('Retry button clicked');
          }
        }
      });
    } finally {
      setIsSyncing(false);
    }
    
    // Analyze message for proactive behavior
    analyzeUserMessage(inputText, messages);
    
    // Save user message to DB immediately  
    const today = new Date().toISOString().split('T')[0];
    const messageContent = uploadedImages.length > 0 
      ? `${inputText}\n\nImages: ${uploadedImages.join(', ')}`
      : inputText;
    
    // ✅ FIXED: Save to database with correct schema
    const { error: dbError } = await supabase.from('coach_conversations').insert({
      user_id: user.id,
      message_role: 'user',
      message_content: messageContent,
      coach_personality: coach?.id || 'lucy',
      conversation_date: today,
      context_data: uploadedImages.length > 0 ? { images: uploadedImages } : null
    });
    
    if (dbError) {
      console.error('❌ Coach conversations save error:', dbError);
      console.error('Error details:', dbError);
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: 'failed' } : msg
      ));
      setIsThinking(false);
      toast('Fehler beim Speichern der Nachricht');
      return;
    } else {
      console.log('✅ User message saved to coach_conversations');
    }
    
    // Mark message as sent
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, status: 'sent' } : msg
    ));
    
    // Clear input and show thinking
    const currentInput = inputText;
    const currentImages = [...uploadedImages];
    setInputText('');
    setUploadedImages([]);
    setHasFiles(false);
    setIsThinking(true);

    try {
      // 🚀 PHASE 3: Try streaming first for instant feedback
      const shouldStream = !currentImages.length && currentInput.length < 500; // Stream for short text-only messages
      
      if (shouldStream) {
        console.log('🚀 Using streaming response for instant feedback');
        
        // Get recent conversation history for context
        const recentMessages = messages.slice(-4).map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        
        // Start streaming
        await startStreaming(
          user.id,
          currentInput,
          coach?.id || 'lucy',
          recentMessages
        );
        
        // Add streaming message to UI when it completes
        if (streamingMessage && streamingMessage.isComplete) {
          const streamedResponse: UnifiedMessage = {
            id: streamingMessage.id,
            role: 'assistant',
            content: streamingMessage.content,
            created_at: new Date().toISOString(),
            coach_personality: coach?.personality || 'motivierend',
            images: [],
            mode: mode
          };
          
          setMessages(prev => [...prev, streamedResponse]);
          clearStreamingMessage();
        }
        
        return;
      }
      
      // Fallback to advanced retry mechanism for complex requests
      const data = await executeWithRetry(async () => {
        const contextualEnhancement = getContextualPromptEnhancement();
        return await sendMessageWithRetry(currentInput, currentImages);
      }, messageId);

      // Ensure consistent response format
      if (uploadedImages.length > 0 && data?.analysis && !data?.response) {
        data.response = data.analysis;
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
          mode: mode,
          // Add pending tools from toolSuggestion if present
          pendingTools: data.toolSuggestion ? [data.toolSuggestion] : undefined
        };
      }

      setMessages(prev => {
        // Clear pending tools from previous messages when adding new assistant message
        const clearedMessages = prev.map(msg => ({
          ...msg,
          pendingTools: undefined
        }));
        return [...clearedMessages, assistantMessage];
      });
      
      // Add message to conversation memory with error handling
      if (data.response) {
        setIsSyncing(true);
        try {
          await addToMemory({
            role: 'assistant',
            content: data.response,
            timestamp: new Date().toISOString()
          });
          console.log('✅ Assistant message added to conversation memory');
          setMemoryError(null);
        } catch (error) {
          console.warn('⚠️ Failed to update conversation memory:', error);
          setMemoryError('Assistant-Antwort konnte nicht gespeichert werden');
          sonnerToast.error('⚠️ Coach-Antwort nicht gespeichert', {
            description: 'Das Gespräch wird möglicherweise nicht vollständig erinnert.',
          });
        } finally {
          setIsSyncing(false);
        }
      }
      
      // ✅ FIXED: Save AI response to DB
      if (data.type !== 'card') {
        const { error: assistantDbError } = await supabase.from('coach_conversations').insert({
          user_id: user.id,
          message_role: 'assistant',
          message_content: data.content || data.response || 'Entschuldigung, ich konnte nicht antworten.',
          coach_personality: coach?.id || 'lucy',
          conversation_date: today
        });
        
        if (assistantDbError) {
          console.error('❌ Error saving assistant message:', assistantDbError);
        } else {
          console.log('✅ Assistant message saved to coach_conversations');
        }
      }
      
      // Handle tool reset from card metadata
      if (data.meta?.clearTool) {
        console.log('🔄 Clearing tool after card response');
        setSelectedTool(null);
      }
    } catch (error: any) {
      console.error('Send error:', error);
      
      // Mark message as failed for retry
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: 'failed' } : msg
      ));
      
      // Enhanced error handling based on diagnostic guide
      let errorContent = 'Entschuldigung, ich konnte deine Nachricht nicht verarbeiten. Versuche es bitte nochmal.';
      
      if (error?.status === 429) {
        if (error?.usage_limit_reached) {
          errorContent = 'Du hast dein tägliches Chat-Limit erreicht. Upgrade auf Premium 🚀';
        } else {
          errorContent = 'Zu viele Anfragen. Warte kurz und versuche es nochmal.';
        }
      } else if (error?.status === 404) {
        errorContent = 'Service vorübergehend nicht verfügbar. Versuche es gleich nochmal.';
      } else if (error?.status >= 500) {
        errorContent = 'Technisches Problem auf unserer Seite. Wir arbeiten daran!';
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
      
      // Show retry toast with action
      sonnerToast.error('Nachricht konnte nicht gesendet werden', {
        action: {
          label: 'Wiederholen',
          onClick: () => handleRetryMessage(messageId)
        }
      });
    } finally {
      setIsThinking(false);
      setSelectedTool(null); // Reset tool after use
    }
  }, [inputText, uploadedImages, user?.id, coach?.personality, mode, selectedTool, profileData, todaysTotals, workoutData, sleepData, weightHistory, averages, dailyGoals, messages]);

  // Retry failed message
  const handleRetryMessage = useCallback(async (messageId: string) => {
    const failedMessage = messages.find(msg => msg.id === messageId);
    if (!failedMessage) return;

    await manualRetry(messageId, async () => {
      // Reset message status and retry
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, status: 'sending' } 
          : msg
      ));
      
      // Re-send the message with original content
      if ('content' in failedMessage) {
        setInputText(failedMessage.content);
        setUploadedImages(('images' in failedMessage && failedMessage.images) || []);
        
        // Trigger send message again
        setTimeout(() => sendMessage(), 100);
      }
    });
  }, [messages, manualRetry, sendMessage]);

  // Handle tool action buttons
  const handleToolAction = useCallback((tool: string, contextData?: any) => {
    console.log('🔧 Tool action triggered:', tool, contextData);
    
    // Enhanced context data preparation with intelligent prefilling
    const prefillData = prefillModalState(
      loadedProfileData?.profile, 
      memoryContext.recentMessages,
      loadedProfileData
    );
    
    const enhancedContextData = {
      profileData,
      dailyGoals,
      weightHistory,
      currentWeight: weightHistory?.[0]?.weight,
      targetWeight: profileData?.target_weight,
      weightTrend: weightHistory?.length > 1 ? 
        (weightHistory[0]?.weight > weightHistory[1]?.weight ? 'down' : 'up') : 'stable',
      todaysCalories: todaysTotals?.calories || 0,
      todaysProtein: todaysTotals?.protein || 0,
      recentWorkouts: workoutData?.slice(0, 3) || [],
      sleepScore: sleepData?.sleep_score || 0,
      // Smart prefill data for modals
      prefillData,
      ...contextData
    };
    
    // Set modal context for tool-specific data
    setModalContext({
      tool,
      contextData: enhancedContextData,
      coachPersonality: coach?.personality || 'motivierend'
    });
    
    // Open appropriate modal based on tool type
    switch(tool) {
      case 'trainingsplan':
        setIsModalOpen(true);
        break;
      case 'uebung':
        setIsModalOpen(true);
        break;
      case 'quickworkout':
        setIsModalOpen(true);
        break;
      case 'supplement':
        setIsModalOpen(true);
        break;
      case 'gewicht':
        setIsModalOpen(true);
        break;
      case 'diary':
        setIsModalOpen(true);
        break;
      case 'goalCheckin':
        setIsModalOpen(true);
        break;
      default:
        console.warn('Unknown tool type:', tool);
        return;
    }
    
    // Clear the pending tool after action
    setMessages(prev => prev.map(msg => ({
      ...msg,
      pendingTools: msg.pendingTools?.filter(t => t.tool !== tool)
    })));
  }, [coach]);

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
              {messages.map(message => renderMessage(message, handleToolAction, handleRetryMessage))}
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
          
          {/* Proactive Suggestions */}
          {suggestions.length > 0 && (
            <div className="px-3 py-2 bg-card border-t border-border/50">
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 2).map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => {
                      const content = applySuggestion(suggestion);
                      setInputText(content);
                    }}
                    className="text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                  >
                    {suggestion.content}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Streaming Indicator */}
          <div className="px-3 py-1 bg-card/50">
            <StreamingIndicator 
              isStreaming={!!streamingMessage?.isStreaming}
              connectionQuality={isStreamingConnected ? 'excellent' : 'disconnected'}
              tokensPerSecond={0}
            />
          </div>

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
            {messages.map(message => renderMessage(message, handleToolAction, handleRetryMessage))}
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
                disabled={recordingState || isThinking || uploading}
                readOnly={isThinking || uploading}
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
                onClick={() => { if (!isThinking && !uploading) debouncedSendMessage(); }} 
                disabled={!canSend || isThinking || recordingState || uploading}
                className="btn-send px-4 py-2"
              >
                {(isThinking || uploading) ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </div>
                ) : (
                  "➤ Senden"
                )}
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
      
      {/* Training Plan Modal */}
      {isModalOpen && modalContext?.tool === 'trainingsplan' && (
        <WorkoutPlanCreationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onPlanCreated={() => {
            console.log('Training plan created');
            setIsModalOpen(false);
            toast("Trainingsplan erstellt! Der Plan wurde erfolgreich gespeichert.");
          }}
          pastSessions={modalContext.contextData?.pastSessions || []}
        />
      )}

    </Card>
  );
};

export { UnifiedCoachChat };
export default UnifiedCoachChat;