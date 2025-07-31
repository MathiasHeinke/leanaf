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
import { generateDynamicCoachGreeting, createGreetingContext } from '@/utils/dynamicCoachGreetings';

import { SimpleMessageList } from '@/components/SimpleMessageList';
import { MediaUploadZone } from '@/components/MediaUploadZone';
import { ChatLayout } from '@/components/layouts/ChatLayout';
import { ExercisePreviewCard } from '@/components/ExercisePreviewCard';
import { CoachWorkoutPlanSaver } from '@/components/CoachWorkoutPlanSaver';
import { ToolPicker } from '@/components/ToolPicker';
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
  
  
  // ============= REFS =============
  const scrollRef = useRef<HTMLDivElement>(null);
  const initializationRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // ============= HOOKS =============
  const { memory, isGlobalMemoryLoaded } = useGlobalCoachMemory();
  const { isRecording, isProcessing, transcribedText, startRecording, stopRecording } = useVoiceRecording();
  const { analyzeImage, isAnalyzing } = useUniversalImageAnalysis();
  const { uploadFiles, uploading } = useMediaUpload();
  const { tokens } = useContextTokens(user?.id);
  
  // ============= SIMPLE INITIALIZATION =============
  useEffect(() => {
    if (!user?.id || initializationRef.current) return;
    
    initializationRef.current = true;
    
    const init = async () => {
      try {
        // Get user's first name for personalization
        const getUserName = () => {
          if (profileData?.display_name) {
            return profileData.display_name.split(' ')[0];
          }
          if (user?.email) {
            const emailName = user.email.split('@')[0];
            if (/^[a-zA-Z]/.test(emailName)) {
              return emailName.split('.')[0];
            }
          }
          return 'Du';
        };

        // Generate personalized greeting
        const firstName = getUserName();
        const context = createGreetingContext(firstName, coach?.id || 'lucy', memory, false);
        const personalizedGreeting = generateDynamicCoachGreeting(context);
        
        // Add context-based personalization
        let enhancedGreeting = personalizedGreeting;
        
        if (tokens.calLeft && tokens.calLeft > 0) {
          enhancedGreeting += ` Du hast noch ${tokens.calLeft} kcal übrig für heute.`;
        }
        
        if (coach?.id === 'sascha' && tokens.timeOfDay === 'Morgen') {
          enhancedGreeting += " Bereit für ein starkes Training heute? 💪";
        } else if (coach?.id === 'lucy' && tokens.timeOfDay === 'Morgen') {
          enhancedGreeting += " Was steht heute auf dem Speiseplan? 🍎";
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
        
        setMessages([welcomeMsg]);
        setIsLoading(false);
        setChatInitialized(true);
      } catch (error) {
        console.error('Init error:', error);
        // Fallback greeting
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
  }, [user?.id, coach?.name, coach?.personality, mode, tokens, memory, profileData]);
  
  // ============= SIMPLE SEND MESSAGE =============
  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || !user?.id) return;
    
    const userMessage: UnifiedMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputText,
      created_at: new Date().toISOString(),
      coach_personality: coach?.personality || 'motivierend',
      images: [],
      mode: mode
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsThinking(true);

    try {
      // Demo: Create SmartCard response for supplement tool
      if (selectedTool === 'supplement') {
        const supplementCard = createCardMessage('supplement', {
          supplements: [
            { name: 'Whey Protein', dosage: '25g', timing: 'Post-Workout' },
            { name: 'Kreatin', dosage: '5g', timing: 'Täglich' },
            { name: 'Omega-3', dosage: '1000mg', timing: 'Zu den Mahlzeiten' }
          ],
          onConfirm: () => console.log('Supplements confirmed'),
          onReject: () => console.log('Supplements rejected')
        }, coach?.personality || 'motivierend');
        
        setMessages(prev => [...prev, supplementCard]);
      } else {
        // Simple text response
        const assistantMessage: UnifiedMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: 'Danke für deine Nachricht! Ich arbeite daran, dir zu helfen.',
          created_at: new Date().toISOString(),
          coach_personality: coach?.personality || 'motivierend',
          images: [],
          mode: mode
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Send error:', error);
    } finally {
      setIsThinking(false);
      setSelectedTool(null); // Reset tool after use
    }
  }, [inputText, user?.id, coach?.personality, mode]);

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
      // Add uploaded images to message
      if (uploadedUrls.length > 0) {
        setInputText(prev => prev + (prev ? '\n' : '') + `[Uploaded files: ${uploadedUrls.join(', ')}]`);
        setHasFiles(true);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
    
    // Reset file input
    event.target.value = '';
  }, [uploadFiles]);

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
    return inputText.trim() || hasFiles || selectedTool;
  }, [inputText, hasFiles, selectedTool]);

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
          </div>
        </ScrollArea>
        
        <div className="flex-none">
          <div className="space-y-2 px-3 py-2">
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