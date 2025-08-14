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
interface EnhancedChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSendMessage: (message: string, mediaUrls?: string[], selectedTool?: string | null) => void;
  isLoading: boolean;
  placeholder?: string;
  className?: string;
  onTypingChange?: (typing: boolean) => void;
}

// Local type definition - no longer importing from unused hook
interface EnhancedChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  created_at?: string;
  coach_personality?: string;
  coach_name?: string;
  coach_avatar?: string;
  coach_color?: string;
  coach_accent_color?: string;
  metadata?: {
    traceId?: string;
    tokensUsed?: number;
    duration?: number;
    hasMemory?: boolean;
    hasRag?: boolean;
    hasDaily?: boolean;
  };
}
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import { ChatLayout } from '@/components/layouts/ChatLayout';
import { CollapsibleCoachHeader } from '@/components/CollapsibleCoachHeader';
import { EnhancedChatInput } from '@/components/EnhancedChatInput';
import { TrainingPlanQuickAction } from '@/components/TrainingPlanQuickAction';
import FireBackdrop, { FireBackdropHandle } from '@/components/FireBackdrop';
import { getCurrentDateString } from '@/utils/dateHelpers';
import { WorkoutPlanDraftCard } from '@/components/WorkoutPlanDraftCard';

import { generateNextDayPlan } from '@/utils/generateNextDayPlan';
import { PlanInlineEditor } from '@/components/PlanInlineEditor';

import { WeightEntryModal } from '@/components/WeightEntryModal';
import { v4 as uuidv4 } from 'uuid';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useOrchestrator, OrchestratorReply } from '@/hooks/useOrchestrator';
import ChoiceBar from '@/components/ChoiceBar';
import ConfirmMealModal from '@/components/ConfirmMealModal';
import ConfirmSupplementModal from '@/components/ConfirmSupplementModal';
import { usePointsSystem } from '@/hooks/usePointsSystem';
import { getMealBasePoints } from '@/utils/mealPointsHelper';
import { triggerDataRefresh } from '@/hooks/useDataRefresh';
import { humanize } from '@/utils/humanize';
import { useShadowState } from '@/hooks/useShadowState';

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
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);

  // Nutrition tool state (Meal analysis like on Index)
  const [showMealDialog, setShowMealDialog] = useState(false);
  const [mealAnalyzedData, setMealAnalyzedData] = useState<any | null>(null);
  const [mealUploadedImages, setMealUploadedImages] = useState<string[]>([]);
  const [mealSelectedType, setMealSelectedType] = useState<string>('other');

  // Weight modal state (auto intent: gewicht)
  const [showWeightModal, setShowWeightModal] = useState(false);

  // Feature flags
  const { isEnabled: isFlagEnabled } = useFeatureFlags();
  const autoTool = isFlagEnabled('auto_tool_orchestration');
  const legacyEnabled = isFlagEnabled('legacy_fallback_enabled');
  const { sendEvent } = useOrchestrator();

  // Points & streaks
  const { awardPoints, updateStreak } = usePointsSystem();

// Orchestrator UI states
const [clarify, setClarify] = useState<{ prompt: string; options: string[]; traceId?: string } | null>(null);
const [confirmMeal, setConfirmMeal] = useState<{ open: boolean; prompt: string; proposal: any; traceId?: string }>({ open: false, prompt: '', proposal: null, traceId: undefined });
const [confirmSupplement, setConfirmSupplement] = useState<{ open: boolean; prompt: string; proposal: any; traceId?: string }>({ open: false, prompt: '', proposal: null, traceId: undefined });
// Conversational-first: hold pending proposals until user decides
const [pendingSupplement, setPendingSupplement] = useState<{ prompt: string; proposal: any; traceId?: string } | null>(null);
const [pendingMeal, setPendingMeal] = useState<{ prompt: string; proposal: any; traceId?: string } | null>(null);
// PR-2: Conversation-first UI helpers
const [ephemeral, setEphemeral] = useState<string | null>(null);
const [isOrchestratorLoading, setIsOrchestratorLoading] = useState(false);
const CHOICE_DELAY_MS = 6000;
const [pendingChoices, setPendingChoices] = useState<null | { reply: OrchestratorReply, ts: number }>(null);
const [lastProposal, setLastProposal] = useState<any | null>(null);
const [choiceChips, setChoiceChips] = useState<string[]>([]);

// Shadow state for delayed chips
const {
  shadowTraceId, pendingChips,
  saveShadowTraceId, clearShadowTraceId,
  scheduleChips, clearChips, setUserTyping
} = useShadowState();

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

// Central reply handler (conversation-first)
const renderOrchestratorReply = useCallback((res: OrchestratorReply) => {
  if (!res) return;

  console.debug('[orchestrator.reply]', { traceId: (res as any)?.traceId, kind: (res as any)?.kind, text: (res as any)?.text?.slice?.(0, 60) || (res as any)?.prompt?.slice?.(0, 60) });
  // Reflect-first: render natural bubble immediately
  if ((res as any).kind === 'reflect') {
    const text = humanize((res as any).text, ""); // No additional ask
    const assistantMessage: EnhancedChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: text,
      created_at: new Date().toISOString(),
      coach_personality: coach?.id || 'lucy',
      coach_name: coach?.name || 'Coach',
      coach_avatar: coach?.imageUrl,
      coach_color: coach?.color,
      coach_accent_color: coach?.accentColor,
      metadata: (res as any).traceId ? { traceId: (res as any).traceId } : undefined,
    };
    setMessages(prev => [...prev, assistantMessage]);
    persistConversation('assistant', text);
    
    // Shadow state: save traceId and schedule delayed chips
    if ((res as any).traceId) {
      saveShadowTraceId((res as any).traceId);
      scheduleChips((res as any).traceId, 6500);
    }
    return;
  }

  // Defer options: clarify / choice_suggest / confirm_* → schedule after delay
  if (res.kind === 'clarify' || (res as any).kind === 'choice_suggest' || res.kind === 'confirm_save_meal' || (res as any).kind === 'confirm_save_supplement') {
    // Show the conversational prompt as a bubble immediately
    const promptText = (res as any).prompt || 'Wie sollen wir fortfahren?';
    const assistantMessage: EnhancedChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: humanize(promptText, ""), // No additional ask
      created_at: new Date().toISOString(),
      coach_personality: coach?.id || 'lucy',
      coach_name: coach?.name || 'Coach',
      coach_avatar: coach?.imageUrl,
      coach_color: coach?.color,
      coach_accent_color: coach?.accentColor,
      metadata: res.traceId ? { traceId: res.traceId } : undefined,
    };
    setMessages(prev => [...prev, assistantMessage]);

    setPendingChoices({ reply: res, ts: Date.now() });
    window.setTimeout(() => {
      setPendingChoices(prev => {
        if (!prev) return prev;
        const idle = Date.now() - prev.ts >= CHOICE_DELAY_MS;
        if (!idle) return prev;
        showChoices(prev.reply);
        return null;
      });
    }, CHOICE_DELAY_MS + 50);
    return;
  }

  // Default: message – humanized
  if (res.kind === 'message') {
    const text = humanize(res.text, ""); // No additional ask
    const assistantMessage: EnhancedChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: text,
      created_at: new Date().toISOString(),
      coach_personality: coach?.id || 'lucy',
      coach_name: coach?.name || 'Coach',
      coach_avatar: coach?.imageUrl,
      coach_color: coach?.color,
      coach_accent_color: coach?.accentColor,
      metadata: res.traceId ? { traceId: res.traceId } : undefined,
    };
    setMessages(prev => [...prev, assistantMessage]);
    persistConversation('assistant', text);
    setClarify(null);
    // first_paint metric
    if (awaitingFirstPaintRef.current && lastSendTimeRef.current) {
      const ms = Math.round(performance.now() - lastSendTimeRef.current);
      queueMicrotask(async () => { try { await supabase.rpc('log_trace_event', { p_trace_id: res.traceId, p_stage: 'first_print', p_data: { first_paint_ms: ms } }); } catch { /* ignore */ } });
      awaitingFirstPaintRef.current = false;
    }
    return;
  }
}, [coach]);

// Show choices now
function showChoices(reply: OrchestratorReply) {
  const anyReply: any = reply as any;
  const opts = anyReply.options ?? (anyReply.kind?.toString().startsWith('confirm_save')
    ? ['Speichern', 'Dosis/Timing anpassen', 'Später']
    : ['Kurze Analyse', 'Speichern', 'Später']
  );

  // Hold pending proposals but do NOT open modals yet
  if (reply.kind === 'confirm_save_meal') {
    setPendingMeal({ prompt: reply.prompt, proposal: reply.proposal, traceId: reply.traceId });
  } else if (anyReply.kind === 'confirm_save_supplement') {
    setPendingSupplement({ prompt: anyReply.prompt, proposal: anyReply.proposal, traceId: anyReply.traceId });
  }

  setChoiceChips(opts);
}

  const handleClarifyPick = useCallback(async (value: string) => {
    if (!user?.id) return;
    const reply = await sendEvent(user.id, { type: 'TEXT', text: value, clientEventId: uuidv4(), context: { source: 'chat', coachMode: (mode === 'specialized' ? 'general' : mode), coachId: coach?.id || 'lucy', followup: true } });
    renderOrchestratorReply(reply);
  }, [user?.id, mode, sendEvent, renderOrchestratorReply, coach?.id]);

// Chip-Klick → Follow-up senden
const onChipClick = useCallback(async (label: string) => {
  setChoiceChips([]);
  if (!user?.id) return;

  if (label === 'Später') {
    const assistantMessage: EnhancedChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: 'Alles klar – sag Bescheid, wenn wir’s speichern sollen. Was interessiert dich gerade am meisten?',
      created_at: new Date().toISOString(),
      coach_personality: coach?.id || 'lucy',
      coach_name: coach?.name || 'Coach',
      coach_avatar: coach?.imageUrl,
      coach_color: coach?.color,
      coach_accent_color: coach?.accentColor
    };
    setMessages(prev => [...prev, assistantMessage]);
    persistConversation('assistant', assistantMessage.content);
    return;
  }

  // Map Label → Follow-up Text
  let text = '';
  if (label.startsWith('Kurze Analyse')) text = 'mehr info';
  else if (label.startsWith('Speichern')) text = 'speichern';
  else if (label.toLowerCase().includes('dosis') || label.toLowerCase().includes('timing')) text = 'dosis timing anpassen';
  if (!text) return;

  const clientEventId = uuidv4();
  const ctx: any = { source: 'chat', coachMode: (mode === 'specialized' ? 'general' : mode), followup: true, coachId: coach?.id || 'lucy' };
  if (pendingSupplement) ctx.last_proposal = { kind: 'supplement', data: pendingSupplement.proposal };
  if (pendingMeal) ctx.last_proposal = { kind: 'meal', data: pendingMeal.proposal };

  try {
    const reply = await sendEvent(user.id, { type:'TEXT', text, clientEventId, context: ctx } as any);
    renderOrchestratorReply(reply);
  } catch {
    toast.error('Konnte Auswahl nicht senden – bitte nochmal versuchen.');
  }
}, [user?.id, mode, sendEvent, renderOrchestratorReply, pendingSupplement, pendingMeal, coach]);

// Tipp: brich die Chips ab sobald der User tippt
useEffect(() => {
  const onKey = () => setChoiceChips([]);
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, []);

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
const lastSendTimeRef = useRef<number | null>(null);
const awaitingFirstPaintRef = useRef<boolean>(false);

// FireBackdrop for ARES
const fireBackdropRef = useRef<FireBackdropHandle>(null);
const isAres = coach?.id === 'ares';

  // Legacy enhanced chat removed – orchestrator-only path

  
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
        metadata: undefined
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
    if (!message.trim() || !user?.id || isOrchestratorLoading) return;
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
      // Special routing for training mode → use training-orchestrator
      if (mode === 'training') {
        const clientEventId = uuidv4();
        let payload: any = { clientEventId, event: { type: 'TEXT', text: messageText } };

        if (mediaUrls && mediaUrls.length > 0) {
          payload = { clientEventId, event: { type: 'IMAGE', url: mediaUrls[0] } };
        } else if (messageText.toLowerCase() === '/end' || messageText.toLowerCase() === 'end') {
          payload = { clientEventId, event: { type: 'END' } };
        }

        const { data, error } = await supabase.functions.invoke('coach-orchestrator', { body: { ...payload, mode: 'training' } });
        if (error) {
          console.error('training-orchestrator error:', error);
          toast.error('Training-Orchestrator nicht erreichbar');
          return;
        }

        const assistantMessage: EnhancedChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data?.text ?? 'OK.',
          created_at: new Date().toISOString(),
          coach_personality: coach?.id || 'lucy',
          coach_name: coach?.name || 'Coach',
          coach_avatar: coach?.imageUrl,
          coach_color: coach?.color,
          coach_accent_color: coach?.accentColor,
          metadata: data?.state ?? undefined
        };
        setMessages(prev => [...prev, assistantMessage]);
        return;
      }

      // Default: route via Orchestrator
      await handleEnhancedSendMessage(messageText, mediaUrls, selectedTool);
      return;

    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [user?.id, coach, isOrchestratorLoading, mode]);

  // Handle training plan creation
  const handleCreateTrainingPlan = useCallback(async () => {
    if (!user?.id || isOrchestratorLoading || isCreatingPlan) return;
    setShowQuickAction(false);
    setIsCreatingPlan(true);

    try {
      // Try to align the generated plan with what the Coach just suggested
      const lastAssistantText = [...messages]
        .reverse()
        .find((m) => m.role === 'assistant')?.content?.toLowerCase() || '';

      const detectSplit = (): 'upper' | 'lower' | 'full' | null => {
        if (lastAssistantText.includes('oberkörper')) return 'upper';
        if (lastAssistantText.includes('unterkörper')) return 'lower';
        if (lastAssistantText.includes('ganzkörper')) return 'full';
        return null;
      };

      const split = detectSplit();

      if (split) {
        const presets: Record<string, { day: string; focus: string; exercises: string[] }> = {
          upper: { day: 'Oberkörper', focus: 'Oberkörper Stärke/Hypertrophie', exercises: ['Bankdrücken', 'Rudern', 'Schulterdrücken', 'Klimmzüge', 'Trizepsdrücken', 'Bizepscurls'] },
          lower: { day: 'Unterkörper', focus: 'Unterkörper Kraft/Hypertrophie', exercises: ['Kniebeugen', 'Kreuzheben', 'Beinpresse', 'Ausfallschritte', 'Wadenheben'] },
          full: { day: 'Ganzkörper', focus: 'Ganzkörper Grundübungen', exercises: ['Kniebeugen', 'Bankdrücken', 'Rudern', 'Schulterdrücken', 'Klimmzüge', 'Bauch'] },
        };
        const preset = presets[split];
        const exercises = preset.exercises.map((name) => ({
          name,
          sets: 3,
          reps: '8-12',
          rpe: 7,
          rest_seconds: 120,
          sets_detail: [
            { set_number: 1, weight: '', reps: '8-12', rpe: 7 },
            { set_number: 2, weight: '', reps: '8-12', rpe: 7 },
            { set_number: 3, weight: '', reps: '8-12', rpe: 7 },
          ],
        }));

        const planDraft = {
          name: `Nächster Trainingstag – ${preset.day}`,
          goal: preset.focus,
          analysis: `Plan basierend auf deiner letzten Anfrage (${preset.day}).`,
          structure: {
            weekly_structure: [
              { day: preset.day, focus: preset.focus, exercises },
            ],
          },
        };
        setPendingPlanData(planDraft);
      } else {
        // Fallback: history-based generator
        const inline = await generateNextDayPlan(user.id, 28);
        setPendingPlanData(inline);
      }

      // Add assistant confirmation message
      const assistantMessage: EnhancedChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '✅ Ich habe deinen nächsten Trainingstag erstellt. Du kannst ihn unten anpassen und speichern.',
        created_at: new Date().toISOString(),
        coach_personality: coach?.id || 'lucy',
        coach_name: coach?.name || 'Coach',
        coach_avatar: coach?.imageUrl,
        coach_color: coach?.color,
        coach_accent_color: coach?.accentColor
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error creating training plan:', err);
      toast.error('Fehler beim Erstellen des Trainingsplans');
      setShowQuickAction(true);
    } finally {
      setIsCreatingPlan(false);
    }
  }, [user?.id, coach, isOrchestratorLoading, isCreatingPlan, messages]);

  // ============= PLAN HANDLERS =============
  const handleSavePlan = useCallback(async (planData: any) => {
    if (!user?.id) return;
    try {
      // Map inline editor structure to workout_plans.exercises JSON
      const day = planData?.structure?.weekly_structure?.[0];
      const exercises = (day?.exercises || [])
        .filter((ex: any) => ex?.name && ex.name.trim().length > 1)
        .map((ex: any) => ({
          name: ex.name,
          sets: ex.sets ?? 3,
          reps: ex.reps ?? '8-12',
          rpe: ex.rpe ?? 7,
          rest_seconds: ex.rest_seconds ?? 120,
          sets_detail: (ex.sets_detail || []).slice(0, 3)
        }));

      const estimatedDuration = exercises.length * 8; // ~8 Min pro Übung

      const { error } = await supabase
        .from('workout_plans')
        .insert({
          name: planData.name || 'Nächster Trainingstag',
          category: 'kraft',
          description: planData.analysis || day?.focus || null,
          exercises: exercises as any,
          created_by: user.id,
          estimated_duration_minutes: estimatedDuration,
          is_public: false,
          target_frequency: planData.daysPerWeek || 1,
          status: 'draft',
          plan_type: 'custom'
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

// Persist chat bubbles to coach_conversations
async function persistConversation(role: 'user'|'assistant', content: string) {
  try {
    if (!user?.id) return;
    const today = getCurrentDateString();
    await supabase.from('coach_conversations').insert({
      user_id: user.id,
      coach_personality: coach?.id || 'lucy',
      conversation_date: today,
      message_role: role,
      message_content: content
    });
  } catch (e) {
    console.warn('persistConversation failed', e);
  }
}

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
                <AvatarImage src={message.coach_avatar || coach?.imageUrl} />
                <AvatarFallback className="text-xs bg-muted">
                  {message.coach_name?.[0] || coach?.name?.[0] || 'C'}
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
  if (!isOrchestratorLoading) return null;
  return <TypingIndicator name={coach?.name || 'Coach'} />;
};

// ============= CHIP CLICK HANDLER =============
const handleChipClick = useCallback(async (label: string) => {
  if (!user?.id || isOrchestratorLoading) return;
  clearChips(); setUserTyping(false); setIsOrchestratorLoading(true);
  try {
    const reply = await sendEvent(user.id, {
      type: "TEXT",
      text: label,
      clientEventId: crypto.randomUUID(),
      context: {
        source: "chat",
        coachMode: (mode === "specialized" ? "general" : mode),
        coachId: coach?.id || "lucy",
        followup: true,
        shadowTraceId,
        last_proposal: lastProposal ?? undefined
      }
    } as any);
    renderOrchestratorReply(reply);
  } catch {
    toast.error("Konnte Auswahl nicht senden – bitte nochmal versuchen.");
  } finally {
    setIsOrchestratorLoading(false);
  }
}, [user?.id, isOrchestratorLoading, clearChips, setUserTyping, mode, coach?.id, shadowTraceId, lastProposal, sendEvent, renderOrchestratorReply]);

// ============= ENHANCED SEND MESSAGE HANDLER =============
const handleEnhancedSendMessage = useCallback(async (message: string, mediaUrls?: string[], selectedTool?: string | null) => {
  if (!message.trim() || isOrchestratorLoading || !user?.id) return;
  clearChips(); setUserTyping(false); setIsOrchestratorLoading(true);
  const msg = message.trim();

  // Create user-visible message immediately
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
    persistConversation('user', msg);
  } else if (mediaUrls && mediaUrls.length > 0) {
    // Show a bubble for pure image sends so users see immediate feedback
    const url = mediaUrls[0];
    const userImageMessage: EnhancedChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: `![📷 Bild gesendet](${url})`,
      created_at: new Date().toISOString(),
      coach_personality: coach?.id || 'lucy',
      coach_name: coach?.name || 'Coach',
      coach_avatar: coach?.imageUrl,
      coach_color: coach?.color,
      coach_accent_color: coach?.accentColor
    };
    setMessages(prev => [...prev, userImageMessage]);
    persistConversation('user', `![📷 Bild gesendet](${url})`);
  }

  try {
    if (!user?.id) return;
    const clientEventId = uuidv4();

    // Ephemeral ack + typing
    setEphemeral('Alles klar – ich schau’s mir kurz an …');
    setIsOrchestratorLoading(true);
    lastSendTimeRef.current = performance.now();
    awaitingFirstPaintRef.current = true;

    // Decide event type
    let event: { type: 'TEXT'|'IMAGE'|'END'; text?: string; url?: string } = { type: 'TEXT', text: msg };
    if (mediaUrls && mediaUrls.length > 0 && !msg) {
      event = { type: 'IMAGE', url: mediaUrls[0] };
    }
    if (msg === '/end' || msg.toLowerCase() === 'end') {
      event = { type: 'END' };
    }

    const t0 = performance.now();
    const reply = await sendEvent(
      user.id,
      { ...event, clientEventId, context: { source: 'chat', coachMode: (mode === 'specialized' ? 'general' : mode), coachId: coach?.id || 'lucy', followup: messages.some(m => m.role === 'assistant'), ...(pendingSupplement ? { last_proposal: { kind: 'supplement', data: pendingSupplement.proposal } } : {}) } } as any
    );

    // Client metric: server_ack_ms
    queueMicrotask(async () => { try { await supabase.rpc('log_trace_event', { p_trace_id: (reply as any)?.traceId ?? clientEventId, p_stage: 'client_ack', p_data: { server_ack_ms: Math.round(performance.now() - t0) } }); } catch { /* ignore */ } });

    setEphemeral(null);
    setIsOrchestratorLoading(false);

    renderOrchestratorReply(reply);
    setInputText('');
    return;
  } catch (e) {
    console.warn('Orchestrator routing failed:', e);
    setEphemeral(null);
    setIsOrchestratorLoading(false);
    if (legacyEnabled && mode === 'training') {
      await handleSendMessage(msg, mediaUrls);
      return;
    }
    toast.error('Coach-Verbindung fehlgeschlagen. Bitte kurz erneut senden.');
    return;
  }
}, [coach, user?.id, mode, sendEvent, renderOrchestratorReply, handleSendMessage, legacyEnabled, pendingSupplement]);

    // ============= FULLSCREEN LAYOUT =============
  if (useFullscreenLayout) {
    return (
      <>
        {/* ARES Fire Backdrop */}
        {isAres && (
          <FireBackdrop 
            ref={fireBackdropRef}
            chatMode={true}
            devFastCycle={false}
          />
        )}
        
        <ChatLayout
chatInput={
          <div>
          {pendingChips.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {pendingChips.map((c) => (
                <button
                  key={c}
                  onClick={() => handleChipClick(c)}
                  className="rounded-full px-3 py-1 text-sm border border-neutral-300 hover:bg-neutral-100"
                >
                  {c}
                </button>
              ))}
              <button
                onClick={() => clearChips()}
                className="rounded-full px-3 py-1 text-sm border border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                aria-label="Chips schließen"
              >
                ×
              </button>
            </div>
          )}
            <EnhancedChatInput
              inputText={inputText}
              setInputText={setInputText}
              onSendMessage={handleEnhancedSendMessage}
              isLoading={isOrchestratorLoading}
              placeholder="Nachricht eingeben..."
              onTypingChange={setUserTyping}
            />
          </div>
        }
        bannerCollapsed={bannerCollapsed}
      >
        {/* Collapsible Coach Header */}
        <CollapsibleCoachHeader
          coach={{
            ...coach,
            id: coach?.id
          }}
          onCollapseChange={setBannerCollapsed}
          onDailyReset={() => {
            setMessages([]);
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
            {/* ChoiceBar deprecated for conversation-first; using delayed choiceChips instead */}
            
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
                isLoading={isCreatingPlan}
              />
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
        <WeightEntryModal isOpen={showWeightModal} onClose={() => setShowWeightModal(false)} />
        <ConfirmMealModal
          open={confirmMeal.open}
          prompt={confirmMeal.prompt}
          proposal={confirmMeal.proposal}
          onConfirm={async () => {
            try {
              if (!user?.id || !confirmMeal.proposal) return;
              const p = confirmMeal.proposal as any;
              const clientEventId = crypto.randomUUID();
              const { data: mealInsert, error: mealError } = await supabase
                .from('meals')
                .insert({
                  user_id: user.id,
                  client_event_id: clientEventId,
                  text: p.title || 'Mahlzeit',
                  calories: Math.round(p.calories || 0),
                  protein: Math.round(p.protein || 0),
                  carbs: Math.round(p.carbs || 0),
                  fats: Math.round(p.fats || 0),
                })
                .select('id')
                .single();
              if (mealError) throw mealError;
              const newMealId = (mealInsert as any)?.id;
              if (p.imageUrl && newMealId) {
                await supabase.from('meal_images').insert({
                  user_id: user.id,
                  meal_id: newMealId,
                  image_url: p.imageUrl,
                });
              }
              const hasPhoto = !!p.imageUrl;
              const basePoints = getMealBasePoints(hasPhoto);
              await awardPoints(hasPhoto ? 'meal_tracked_with_photo' : 'meal_tracked', basePoints, 'Chat-Mahlzeit');
              await updateStreak('meal_tracking');
              triggerDataRefresh();
              toast.success('Mahlzeit gespeichert');
            } catch (e) {
              toast.error('Speichern fehlgeschlagen');
            } finally {
              setConfirmMeal(prev => ({ ...prev, open: false }));
            }
          }}
          onClose={() => setConfirmMeal(prev => ({ ...prev, open: false }))}
        />
        <ConfirmSupplementModal
          open={confirmSupplement.open}
          prompt={confirmSupplement.prompt}
          proposal={confirmSupplement.proposal}
          onConfirm={async (pickedIdx) => {
            try {
              if (!user?.id || !confirmSupplement.proposal) return;
              const p: any = confirmSupplement.proposal;
              const idx = typeof pickedIdx === 'number' ? pickedIdx : (p.topPickIdx ?? 0);
              const item = p.items?.[idx];
              if (!item) return;
              const clientEventId = crypto.randomUUID();
              const { data, error } = await supabase.functions.invoke('supplement-save', {
                body: { userId: user.id, item, clientEventId },
                headers: { 'x-trace-id': confirmSupplement.traceId || crypto.randomUUID(), 'x-source': 'chat' }
              });
              if (error) throw error;
              window.dispatchEvent(new CustomEvent('supplement-recommendations-saved'));
              toast.success('Supplement gespeichert');
            } catch (e) {
              console.error('supplement-save failed', e);
              toast.error('Speichern fehlgeschlagen');
            } finally {
              setConfirmSupplement(prev => ({ ...prev, open: false }));
            }
          }}
          onClose={() => setConfirmSupplement(prev => ({ ...prev, open: false }))}
        />
      </ChatLayout>
      </>
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
              
              {/* Ephemeral status bubble */}
              {ephemeral && (
                <div className="mx-3 my-2 text-sm text-muted-foreground">
                  {ephemeral}
                </div>
              )}
              
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
                  isLoading={isCreatingPlan}
                />
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="border-t bg-background p-4">
          {pendingChips.length > 0 && (
            <div className="mt-2 mb-2 flex flex-wrap gap-2">
              {pendingChips.map((c) => (
                <button
                  key={c}
                  onClick={() => handleChipClick(c)}
                  className="rounded-full px-3 py-1 text-sm border border-neutral-300 hover:bg-neutral-100"
                >
                  {c}
                </button>
              ))}
              <button
                onClick={() => clearChips()}
                className="rounded-full px-3 py-1 text-sm border border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                aria-label="Chips schließen"
              >
                ×
              </button>
            </div>
          )}
          <EnhancedChatInput
            inputText={inputText}
            setInputText={setInputText}
            onSendMessage={handleEnhancedSendMessage}
            isLoading={isOrchestratorLoading}
            placeholder="Nachricht eingeben..."
            onTypingChange={setUserTyping}
          />
        </div>
      </CardContent>
      <WeightEntryModal isOpen={showWeightModal} onClose={() => setShowWeightModal(false)} />
      <ConfirmMealModal
        open={confirmMeal.open}
        prompt={confirmMeal.prompt}
        proposal={confirmMeal.proposal}
        onConfirm={async () => {
          try {
            if (!user?.id || !confirmMeal.proposal) return;
            const p = confirmMeal.proposal as any;
            const clientEventId = crypto.randomUUID();
            const { data: mealInsert, error: mealError } = await supabase
              .from('meals')
              .insert({
                user_id: user.id,
                client_event_id: clientEventId,
                text: p.title || 'Mahlzeit',
                calories: Math.round(p.calories || 0),
                protein: Math.round(p.protein || 0),
                carbs: Math.round(p.carbs || 0),
                fats: Math.round(p.fats || 0),
              })
              .select('id')
              .single();
            if (mealError) throw mealError;
            const newMealId = (mealInsert as any)?.id;
            if (p.imageUrl && newMealId) {
              await supabase.from('meal_images').insert({
                user_id: user.id,
                meal_id: newMealId,
                image_url: p.imageUrl,
              });
            }
            const hasPhoto = !!p.imageUrl;
            const basePoints = getMealBasePoints(hasPhoto);
            await awardPoints(hasPhoto ? 'meal_tracked_with_photo' : 'meal_tracked', basePoints, 'Chat-Mahlzeit');
            await updateStreak('meal_tracking');
            triggerDataRefresh();
            toast.success('Mahlzeit gespeichert');
          } catch (e) {
            toast.error('Speichern fehlgeschlagen');
          } finally {
            setConfirmMeal(prev => ({ ...prev, open: false }));
          }
        }}
        onClose={() => setConfirmMeal(prev => ({ ...prev, open: false }))}
      />
    </Card>
  );
};

// ============= HELPER FUNCTIONS =============
function getSimpleGreeting(coachId: string): string {
  const greetings = {
    'lucy': ['Hey! ✨', 'Hi! 💗', 'Hallo! 🌟'],
    'sascha': ['Moin!', 'Hey! 💪', 'Servus!'],
    'ares': ['ARES ist bereit!', 'Zeit für totale Dominanz!', 'Ultimate Intelligence aktiviert!'],
    'kai': ['Hey! 🙏', 'Namaste!', 'Hi!'],
    'dr_vita': ['Hallo! 🌸', 'Hi!', 'Hey!']
  };
  
  const options = greetings[coachId] || ['Hey! 👋'];
  return options[Math.floor(Math.random() * options.length)];
}

export default EnhancedUnifiedCoachChat;