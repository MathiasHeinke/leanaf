import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { Send, Loader2, Brain, Database, Clock, Zap, Users } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { TypingIndicator } from '@/components/TypingIndicator';
import { useAuth } from '@/hooks/useAuth';
import { useEnhancedChat, EnhancedChatMessage } from '@/hooks/useEnhancedChat';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import { ChatLayout } from '@/components/layouts/ChatLayout';
import { CollapsibleCoachHeader } from '@/components/CollapsibleCoachHeader';
import { EnhancedChatInput } from '@/components/EnhancedChatInput';
import { TrainingPlanQuickAction } from '@/components/TrainingPlanQuickAction';
import { getCurrentDateString } from '@/utils/dateHelpers';
import { WorkoutPlanDraftCard } from '@/components/WorkoutPlanDraftCard';
import { MealConfirmationDialog } from '@/components/MealConfirmationDialog';
import { generateNextDayPlan } from '@/utils/generateNextDayPlan';
import { PlanInlineEditor } from '@/components/PlanInlineEditor';

// ============= HELPER FUNCTIONS =============
async function generateIntelligentGreeting(
  userId: string, 
  coachId: string, 
  options: { firstName?: string; isFirstConversation?: boolean; alreadyGreeted?: boolean } = {}
): Promise<string | null> {
  try {
    console.log('🎯 Calling intelligent greeting function...');
    
    const { data, error } = await supabase.functions.invoke('generate-intelligent-greeting', {
      body: {
        userId,
        coachId,
        firstName: options.firstName || 'User',
        isFirstConversation: options.isFirstConversation || false,
        alreadyGreeted: options.alreadyGreeted || false,
        contextData: {}
      }
    });

    if (error) {
      console.error('❌ Error calling greeting function:', error);
      return null;
    }

    console.log('✅ Intelligent greeting generated:', data?.greeting);
    return data?.greeting || null;
  } catch (error) {
    console.error('❌ Exception in greeting function:', error);
    return null;
  }
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

export interface EnhancedUnifiedCoachChatProps {
  mode: 'general' | 'nutrition' | 'training' | 'specialized';
  coach?: CoachProfile;
  onBack?: () => void;
  useFullscreenLayout?: boolean;
  enableAdvancedFeatures?: boolean;
}

const EnhancedUnifiedCoachChat: React.FC<EnhancedUnifiedCoachChatProps> = ({
  mode = 'general',
  coach,
  onBack,
  useFullscreenLayout = false,
  enableAdvancedFeatures = true
}) => {
  
  // ============= BASIC STATE =============
  const { user } = useAuth();
  const [messages, setMessages] = useState<EnhancedChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [chatInitialized, setChatInitialized] = useState(false);
  const [bannerCollapsed, setBannerCollapsed] = useState(false);
  const [showQuickAction, setShowQuickAction] = useState(false);
  const [pendingPlanData, setPendingPlanData] = useState<any>(null);

  // Nutrition tool state (Meal analysis like on Index)
  const [showMealDialog, setShowMealDialog] = useState(false);
  const [mealAnalyzedData, setMealAnalyzedData] = useState<any | null>(null);
  const [mealUploadedImages, setMealUploadedImages] = useState<string[]>([]);
  const [mealSelectedType, setMealSelectedType] = useState<string>('other');

  // ============= USER PROFILE (for plan generation) =============
  const [userProfile, setUserProfile] = useState<any>(null);
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('profile_avatar_url, avatar_type, avatar_preset_id, goal')
        .eq('user_id', user.id)
        .maybeSingle();
      setUserProfile(data);
    };
    fetchUserProfile();
  }, [user?.id]);

  // Helper: normalize analyze-meal responses
  const parseAnalyzeResponse = useCallback((data: any) => {
    if (data?.total && typeof data.total === 'object') {
      return {
        title: data.title || 'Analysierte Mahlzeit',
        calories: data.total.calories || 0,
        protein: data.total.protein || 0,
        carbs: data.total.carbs || 0,
        fats: data.total.fats || 0,
        meal_type: 'other',
        confidence: data.confidence || 0.85
      };
    }
    if (data?.calories !== undefined) {
      return {
        title: data.title || 'Analysierte Mahlzeit',
        calories: data.calories || 0,
        protein: data.protein || 0,
        carbs: data.carbs || 0,
        fats: data.fats || 0,
        meal_type: data.meal_type || 'other',
        confidence: data.confidence || 0.85
      };
    }
    return null;
  }, []);
  
  // ============= REFS =============
  const initializationRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // ============= ENHANCED CHAT INTEGRATION =============
  const { 
    sendMessage: sendEnhancedMessage, 
    isLoading: isChatLoading, 
    error: chatError,
    lastMetadata,
    clearError,
    clearHistory,
    getConversationStats,
    conversationHistory,
    memoryContext,
    isMemoryUpdating
  } = useEnhancedChat({
    onError: (error) => {
      console.error('❌ Enhanced chat error:', error);
      
      const errorMessage: EnhancedChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '❌ Entschuldigung, es gab ein technisches Problem. Meine erweiterten Funktionen sind momentan nicht verfügbar, aber ich versuche es weiter.',
        created_at: new Date().toISOString(),
        coach_personality: coach?.id || 'lucy',
        coach_name: coach?.name || 'Coach',
        coach_avatar: coach?.imageUrl,
        coach_color: coach?.color,
        coach_accent_color: coach?.accentColor
      };
      
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Erweiterte Coach-Funktionen nicht verfügbar', {
        description: 'Grundfunktionen sind weiterhin verfügbar.'
      });
    },
    onSuccess: (response, metadata) => {
      console.log('✅ Enhanced chat response received:', { 
        responseLength: response.length,
        metadata
      });
      
      if (metadata?.hasMemory || metadata?.hasRag || metadata?.hasDaily) {
        toast.success('Coach-Antwort mit vollem Kontext', {
          description: `Memory: ${metadata.hasMemory ? '✅' : '❌'}, Wissen: ${metadata.hasRag ? '✅' : '❌'}, Tagesverlauf: ${metadata.hasDaily ? '✅' : '❌'}`
        });
      }
    },
    enableMemory: enableAdvancedFeatures,
    enableRag: enableAdvancedFeatures,
    enableProactive: enableAdvancedFeatures
  });
  
  // ============= CHAT INITIALIZATION =============
  useEffect(() => {
    if (!user?.id) {
      console.warn('ℹ️ No authenticated user found, showing simple greeting');
      const fallbackGreeting = getSimpleGreeting(coach?.id || 'lucy');
      const welcomeMsg: EnhancedChatMessage = {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: fallbackGreeting,
        created_at: new Date().toISOString(),
        coach_personality: coach?.id || 'lucy',
        coach_name: coach?.name || 'Coach',
        coach_avatar: coach?.imageUrl,
        coach_color: coach?.color,
        coach_accent_color: coach?.accentColor
      };
      setMessages([welcomeMsg]);
      setIsLoading(false);
      setChatInitialized(true);
      return;
    }
    
    // Always reinitialize when user or coach changes
    const init = async () => {
      console.log(`🔄 Initializing chat for user ${user.id}, coach ${coach?.id || 'lucy'}`);
      initializationRef.current = true;
    
      try {
        setIsLoading(true);
        setMessages([]);  // Clear old messages first
        
        // Load existing chat history for today
        const today = getCurrentDateString();
        console.log(`🔍 Loading chat history for user ${user.id}, coach ${coach?.id || 'lucy'}, date ${today}`);
        
        const { data: existingMessages, error: historyError } = await supabase
          .from('coach_conversations')
          .select('*')
          .eq('user_id', user.id)
          .eq('coach_personality', coach?.id || 'lucy')
          .eq('conversation_date', today)
          .order('created_at', { ascending: true });

        console.log(`📊 History query result:`, { error: historyError, count: existingMessages?.length || 0 });

        if (!historyError && existingMessages && existingMessages.length > 0) {
          const loadedMessages: EnhancedChatMessage[] = existingMessages.map(msg => ({
            id: msg.id,
            role: msg.message_role as 'user' | 'assistant',
            content: msg.message_content,
            created_at: msg.created_at,
            coach_personality: msg.coach_personality || coach?.id || 'lucy',
            coach_name: coach?.name || 'Coach',
            coach_avatar: coach?.imageUrl,
            coach_color: coach?.color,
            coach_accent_color: coach?.accentColor
          }));

          console.log(`📜 Successfully loaded ${loadedMessages.length} existing messages for today`);
          setMessages(loadedMessages);
          setIsLoading(false);
          setChatInitialized(true);
          return;
        } else if (historyError) {
          console.error('❌ Error loading chat history:', historyError);
        } else {
          console.log('ℹ️ No existing chat history found for today');
        }

        // Create intelligent greeting using enhanced system
        console.log('🎯 No existing chat found, generating intelligent greeting...');
        
        // Show immediate simple greeting placeholder
        const placeholderId = `welcome-${Date.now()}`;
        const placeholderGreeting = getSimpleGreeting(coach?.id || 'lucy');
        const placeholderMsg: EnhancedChatMessage = {
          id: placeholderId,
          role: 'assistant',
          content: placeholderGreeting,
          created_at: new Date().toISOString(),
          coach_personality: coach?.id || 'lucy',
          coach_name: coach?.name || 'Coach',
          coach_avatar: coach?.imageUrl,
          coach_color: coach?.color,
          coach_accent_color: coach?.accentColor
        };
        setMessages([placeholderMsg]);
        
if (enableAdvancedFeatures) {
  // Fire and append dynamic follow-up as a second bubble (no salutation)
  generateIntelligentGreeting(user.id, coach?.id || 'lucy', {
    firstName: user.user_metadata?.name || 'User',
    isFirstConversation: true,
    alreadyGreeted: true
  })
    .then((greeting) => {
      if (!greeting) return;
      const cleaned = (greeting || '')
        .replace(/^(moin|hi|hallo|servus|hey|guten\s+(morgen|tag|abend|nachmittag|mittag))[,!\s]*([–-]\s*)?/i, '')
        .trim();
      if (!cleaned) return;
      if (cleaned.toLowerCase() === (placeholderGreeting || '').toLowerCase()) return;

      const followupMsg: EnhancedChatMessage = {
        id: `welcome-followup-${Date.now()}`,
        role: 'assistant',
        content: cleaned,
        created_at: new Date().toISOString(),
        coach_personality: coach?.id || 'lucy',
        coach_name: coach?.name || 'Coach',
        coach_avatar: coach?.imageUrl,
        coach_color: coach?.color,
        coach_accent_color: coach?.accentColor,
        metadata: lastMetadata
      };
      setMessages(prev => [...prev, followupMsg]);
    })
    .catch((e) => {
      console.warn('⚠️ Intelligent greeting failed:', e);
    });
}
        
        setIsLoading(false);
        setChatInitialized(true);
        
      } catch (error) {
        console.error('Error initializing enhanced chat:', error);
        setIsLoading(false);
        setChatInitialized(true);
      }
    };
    
    // Always reset and initialize on user/coach change
    initializationRef.current = false;
    init();
  }, [user?.id, coach?.id]);

  // ============= AUTO SCROLL =============
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ============= SEND MESSAGE =============
  const handleSendMessage = useCallback(async (message: string, mediaUrls?: string[], selectedTool?: string | null) => {
    if (!message.trim() || !user?.id || isChatLoading) return;
    
    const messageText = message.trim();
    
    // Check if this is a training plan analysis request
    const isTrainingPlanAnalysis = messageText.toLowerCase().includes('trainingsplan') && 
                                  !messageText.toLowerCase().includes('erstellen');
    
    // Create user message
    const userMessage: EnhancedChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      created_at: new Date().toISOString(),
      coach_personality: coach?.id || 'lucy',
      coach_name: coach?.name || 'Coach',
      coach_avatar: coach?.imageUrl,
      coach_color: coach?.color,
      coach_accent_color: coach?.accentColor
    };
    
    // Add user message to UI immediately
    setMessages(prev => [...prev, userMessage]);
    
    try {
      // Send to enhanced AI system
      const response = await sendEnhancedMessage(messageText, coach?.id || 'lucy');
      
      if (response) {
        // Create assistant message with metadata
        const assistantMessage: EnhancedChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response,
          created_at: new Date().toISOString(),
          coach_personality: coach?.id || 'lucy',
          coach_name: coach?.name || 'Coach',
          coach_avatar: coach?.imageUrl,
          coach_color: coach?.color,
          coach_accent_color: coach?.accentColor,
          metadata: lastMetadata
        };
        
        // Add assistant message to UI
        setMessages(prev => [...prev, assistantMessage]);

        // Show quick action button after training plan analysis
        if (isTrainingPlanAnalysis) {
          setShowQuickAction(true);
        }

        // Check if response contains plan data
        if (lastMetadata?.planData) {
          setPendingPlanData(lastMetadata.planData);
        }
      }
      
    } catch (error) {
      console.error('Error sending enhanced message:', error);
    }
  }, [user?.id, coach, sendEnhancedMessage, isChatLoading, lastMetadata]);

  // Handle training plan creation
  const handleCreateTrainingPlan = useCallback(async () => {
    if (!user?.id || isChatLoading) return;
    setShowQuickAction(false);

    try {
      const { data, error } = await supabase.functions.invoke('generate-enhanced-training-plan', {
        body: {
          userProfile: userProfile || {},
          goals: [userProfile?.goal || 'Hypertrophy'],
          planName: 'Nächster Trainingstag',
          coachId: coach?.id || 'sascha',
          useAI: false,
          mode: 'next_day',
          lookbackDays: 28
        }
      });
      if (error) throw error;

      const mapToInline = (plan: any) => {
        const firstDay = (plan?.days || []).find((d: any) => !d.isRestDay) || (plan?.days || [])[0];
        const exercises = (firstDay?.exercises || []).map((ex: any) => ({
          name: ex.exerciseName,
          sets: Array.isArray(ex.sets) ? ex.sets.length : 3,
          reps: ex.sets?.[0]?.targetRepsRange || String(ex.sets?.[0]?.targetReps || '8-12'),
          weight: '',
          rpe: ex.sets?.[0]?.targetRPE ?? 7,
          rest_seconds: ex.sets?.[0]?.restSeconds ?? 120,
          sets_detail: (ex.sets || []).slice(0,3).map((s: any) => ({
            weight: '',
            reps: s.targetRepsRange || String(s.targetReps || ''),
            rpe: s.targetRPE ?? 7
          }))
        }));
        return {
          name: plan.name || 'Nächster Trainingstag',
          goal: plan.planType || 'custom',
          daysPerWeek: 1,
          structure: {
            weekly_structure: [
              { day: firstDay?.dayName || 'Training', focus: firstDay?.focus || '', exercises }
            ],
            principles: plan.scientificBasis?.appliedPrinciples || []
          },
          analysis: plan.scientificBasis?.methodology || ''
        };
      };

      const inline = mapToInline(data?.plan || data);
      setPendingPlanData(inline);

      // Add assistant confirmation message
      const assistantMessage: EnhancedChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '✅ Ich habe deinen nächsten Trainingstag basierend auf deinen letzten Einheiten erstellt. Du kannst ihn unten noch anpassen und speichern.',
        created_at: new Date().toISOString(),
        coach_personality: coach?.id || 'lucy',
        coach_name: coach?.name || 'Coach',
        coach_avatar: coach?.imageUrl,
        coach_color: coach?.color,
        coach_accent_color: coach?.accentColor
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error creating training plan:', err);
      toast.error('Fehler beim Erstellen des Trainingsplans');
    }
  }, [user?.id, coach, isChatLoading, userProfile]);

  // ============= PLAN HANDLERS =============
  const handleSavePlan = useCallback(async (planData: any) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('workout_plan_drafts')
        .insert({
          user_id: user.id,
          name: planData.name,
          goal: planData.goal,
          days_per_wk: planData.daysPerWeek,
          structure_json: planData.structure,
          notes: planData.analysis || null,
        });
      if (error) throw error;
      toast.success('Trainingsplan gespeichert!');
      // nicht schließen – wir wollen die Nachfrage anzeigen
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Fehler beim Speichern');
    }
  }, [user?.id]);

  const handleCreateNextDay = useCallback(async () => {
    if (!user?.id) return;
    try {
      const nextPlan = await generateNextDayPlan(user.id, 28);
      setPendingPlanData(nextPlan);
    } catch (e) {
      console.error('Error generating next-day plan:', e);
      toast.error('Konnte nächsten Tag nicht erstellen');
    }
  }, [user?.id]);

  const handleEditPlan = useCallback((planData: any) => {
    setPendingPlanData(planData);
  }, []);

  // User avatar helper derived from profile
  const getUserAvatarUrl = () => {
    if (!userProfile) return null;
    if (userProfile.avatar_type === 'uploaded' && userProfile.profile_avatar_url) {
      return userProfile.profile_avatar_url;
    }
    if (userProfile.avatar_type === 'preset' && userProfile.avatar_preset_id) {
      return `/avatars/preset/avatar-${userProfile.avatar_preset_id}.png`;
    }
    return null;
  };

  // ============= RENDER MESSAGE =============
  const renderMessage = (message: EnhancedChatMessage) => {
    const isUser = message.role === 'user';
    const userAvatarUrl = getUserAvatarUrl();
    
    return (
      <div key={message.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-4`}>
        {/* Message Bubble */}
        <div
          className={`max-w-[75%] px-3 py-2 ${
            isUser
              ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md'
              : 'bg-muted rounded-2xl rounded-bl-md'
          }`}
        >
          <div className="text-sm whitespace-pre-wrap">
            <ReactMarkdown
              skipHtml={true}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                li: ({ children }) => <li>{children}</li>,
                code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-sm">{children}</code>,
                blockquote: ({ children }) => <blockquote className="border-l-4 border-muted pl-4 italic mb-2">{children}</blockquote>,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    {children}
                  </a>
                )
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Footer unter der Bubble */}
        <div className="mt-3">
          {/* Coach layout: Avatar left, time right */}
          {!isUser && (
            <div className="flex items-center justify-start gap-2 text-xs">
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarImage src={message.coach_avatar} />
                <AvatarFallback className="text-xs bg-muted">
                  {message.coach_name?.[0] || 'C'}
                </AvatarFallback>
              </Avatar>
              <span className="text-muted-foreground">
                {new Date(message.created_at).toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              
              {/* Advanced features indicators */}
              {enableAdvancedFeatures && message.metadata && (
                <div className="flex gap-1">
                  <TooltipProvider>
                    {message.metadata.hasMemory && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="secondary" className="h-4 px-1 text-xs">
                            <Users className="w-3 h-3" />
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Mit persönlichem Gedächtnis</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    
                    {message.metadata.hasRag && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="secondary" className="h-4 px-1 text-xs">
                            <Database className="w-3 h-3" />
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Mit Wissensdatenbank</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    
                    {message.metadata.hasDaily && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="secondary" className="h-4 px-1 text-xs">
                            <Clock className="w-3 h-3" />
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Mit Tagesverlauf</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    
                    {message.metadata.tokensUsed && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className="h-4 px-1 text-xs">
                            {message.metadata.tokensUsed}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Tokens verwendet: {message.metadata.tokensUsed}</p>
                          <p>Dauer: {message.metadata.duration}ms</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TooltipProvider>
                </div>
              )}
            </div>
          )}
          
          {/* User layout: Time left, avatar right */}
          {isUser && (
            <div className="flex items-center justify-end gap-2 text-xs">
              <span className="text-muted-foreground">
                {new Date(message.created_at).toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarImage src={userAvatarUrl || undefined} />
                <AvatarFallback className="text-xs bg-muted">Du</AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============= RENDER TYPING INDICATOR =============
  const renderTypingIndicator = () => {
    if (!isChatLoading) return null;
    
    return <TypingIndicator name={coach?.name || 'Coach'} />;
  };

  // ============= ENHANCED SEND MESSAGE HANDLER =============
  const handleEnhancedSendMessage = useCallback(async (message: string, mediaUrls?: string[], selectedTool?: string | null) => {
    const msg = (message || '').trim();

    // Route Tool Picker actions
    if (selectedTool === 'mahlzeit') {
      try {
        // Show user message in chat
        if (msg) {
          const userMessage: EnhancedChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: msg,
            created_at: new Date().toISOString(),
            coach_personality: coach?.id || 'lucy',
            coach_name: coach?.name || 'Coach',
            coach_avatar: coach?.imageUrl,
            coach_color: coach?.color,
            coach_accent_color: coach?.accentColor
          };
          setMessages(prev => [...prev, userMessage]);
        }

        const { data, error } = await supabase.functions.invoke('analyze-meal', {
          body: {
            text: msg || null,
            images: mediaUrls && mediaUrls.length > 0 ? mediaUrls : null
          }
        });
        if (error) throw error;

        const parsed = parseAnalyzeResponse(data);
        if (!parsed) {
          toast.error('Analyse lieferte keine verwertbaren Daten');
          return;
        }

        setMealAnalyzedData(parsed);
        setMealUploadedImages(mediaUrls || []);
        setMealSelectedType(parsed.meal_type || 'other');
        setShowMealDialog(true);

        // Assistant acknowledgement
        const ack: EnhancedChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: '🍽️ Analyse bereit – bitte bestätige die Werte im Dialog unten.',
          created_at: new Date().toISOString(),
          coach_personality: coach?.id || 'lucy',
          coach_name: coach?.name || 'Coach',
          coach_avatar: coach?.imageUrl,
          coach_color: coach?.color,
          coach_accent_color: coach?.accentColor
        };
        setMessages(prev => [...prev, ack]);
        setInputText('');
        return;
      } catch (e: any) {
        console.error('Meal analysis failed:', e);
        toast.error('Mahlzeit-Analyse fehlgeschlagen');
        return;
      }
    }

    if (selectedTool === 'supplement') {
      try {
        if (msg) {
          const userMessage: EnhancedChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: msg,
            created_at: new Date().toISOString(),
            coach_personality: coach?.id || 'lucy',
            coach_name: coach?.name || 'Coach',
            coach_avatar: coach?.imageUrl,
            coach_color: coach?.color,
            coach_accent_color: coach?.accentColor
          };
          setMessages(prev => [...prev, userMessage]);
        }

        const firstImage = mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : undefined;
        const { data, error } = await supabase.functions.invoke('supplement-recognition', {
          body: {
            imageUrl: firstImage,
            userId: user?.id,
            userQuestion: msg || 'Bitte Supplements analysieren'
          }
        });
        if (error) throw error;

        const summary = typeof data === 'object' ? JSON.stringify(data).slice(0, 800) : String(data);
        const assistantMessage: EnhancedChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `💊 Supplement-Analyse abgeschlossen:\n${summary}${summary.length >= 800 ? '…' : ''}`,
          created_at: new Date().toISOString(),
          coach_personality: coach?.id || 'lucy',
          coach_name: coach?.name || 'Coach',
          coach_avatar: coach?.imageUrl,
          coach_color: coach?.color,
          coach_accent_color: coach?.accentColor
        };
        setMessages(prev => [...prev, assistantMessage]);
        setInputText('');
        return;
      } catch (e: any) {
        console.error('Supplement analysis failed:', e);
        toast.error('Supplement-Analyse fehlgeschlagen');
        return;
      }
    }

    // Default: normal chat flow (preserve existing behavior)
    let fullMessage = msg;
    if (mediaUrls && mediaUrls.length > 0) {
      fullMessage += `\n\nAngehängte Medien: ${mediaUrls.join(', ')}`;
    }
    if (selectedTool) {
      fullMessage += `\n\nAusgewähltes Tool: ${selectedTool}`;
    }
    setInputText(fullMessage);
    await handleSendMessage(fullMessage);
  }, [coach, user?.id, parseAnalyzeResponse, handleSendMessage]);

  // ============= FULLSCREEN LAYOUT =============
  if (useFullscreenLayout) {
    return (
      <ChatLayout 
        chatInput={
          <EnhancedChatInput
            inputText={inputText}
            setInputText={setInputText}
            onSendMessage={handleEnhancedSendMessage}
            isLoading={isChatLoading}
            placeholder="Nachricht eingeben..."
          />
        }
        bannerCollapsed={bannerCollapsed}
      >
        {/* Collapsible Coach Header */}
        <CollapsibleCoachHeader
          coach={coach}
          onCollapseChange={setBannerCollapsed}
          onDailyReset={() => {
            setMessages([]);
            clearHistory();
          }}
        />

        {/* Messages */}
        {isLoading ? (
          <div className="space-y-4 py-4">
            <TypingIndicator name={coach?.name || 'Coach'} />
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {messages.map(renderMessage)}
            {renderTypingIndicator()}
            
            {/* Training Plan Draft Card */}
            {pendingPlanData && (
              <div className="my-4">
                <PlanInlineEditor
                  initialPlan={pendingPlanData}
                  onSave={handleSavePlan}
                  onRequestMoreDays={handleCreateNextDay}
                />
              </div>
            )}
            
            {/* Quick Action Button */}
            {showQuickAction && (
              <TrainingPlanQuickAction
                onCreatePlan={handleCreateTrainingPlan}
                isLoading={isChatLoading}
              />
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </ChatLayout>
    );
  }

  // ============= CARD LAYOUT =============
  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          {coach?.imageUrl && (
            <Avatar className="w-8 h-8">
              <AvatarImage src={coach.imageUrl} />
              <AvatarFallback>{coach.name?.[0] || 'C'}</AvatarFallback>
            </Avatar>
          )}
          <span>{coach?.name || 'Coach'}</span>
          {enableAdvancedFeatures && (
            <Badge variant="secondary" className="ml-2">
              <Zap className="w-3 h-3 mr-1" />
              Enhanced
            </Badge>
          )}
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="ml-auto">
              Zurück
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <ScrollArea className="flex-1 px-4">
          {isLoading ? (
            <div className="space-y-4 py-4">
              <TypingIndicator name={coach?.name || 'Coach'} />
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map(renderMessage)}
              {renderTypingIndicator()}
              
              {/* Training Plan Draft Card */}
              {pendingPlanData && (
                <div className="my-4">
                  <PlanInlineEditor
                    initialPlan={pendingPlanData}
                    onSave={handleSavePlan}
                    onRequestMoreDays={handleCreateNextDay}
                  />
                </div>
              )}
              
              {/* Quick Action Button */}
              {showQuickAction && (
                <TrainingPlanQuickAction
                  onCreatePlan={handleCreateTrainingPlan}
                  isLoading={isChatLoading}
                />
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="border-t bg-background p-4">
          <EnhancedChatInput
            inputText={inputText}
            setInputText={setInputText}
            onSendMessage={handleEnhancedSendMessage}
            isLoading={isChatLoading}
            placeholder="Nachricht eingeben..."
          />
        </div>
      </CardContent>
    </Card>
  );
};

// ============= HELPER FUNCTIONS =============
function getSimpleGreeting(coachId: string): string {
  const greetings = {
    'lucy': ['Hey! ✨', 'Hi! 💗', 'Hallo! 🌟'],
    'sascha': ['Moin!', 'Hey! 💪', 'Servus!'],
    'markus': ['Ei gude!', 'Hey!', 'Morsche!'],
    'kai': ['Hey! 🙏', 'Namaste!', 'Hi!'],
    'dr_vita': ['Hallo! 🌸', 'Hi!', 'Hey!']
  };
  
  const options = greetings[coachId] || ['Hey! 👋'];
  return options[Math.floor(Math.random() * options.length)];
}

export default EnhancedUnifiedCoachChat;