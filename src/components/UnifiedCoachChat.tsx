import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ✅ EMPTY_ARRAY als echte Konstante außerhalb der Komponente
const EMPTY_ARRAY: any[] = [];
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
  X
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useUniversalImageAnalysis } from '@/hooks/useUniversalImageAnalysis';
import { useGlobalCoachMemory } from '@/hooks/useGlobalCoachMemory';
import { useWorkoutPlanDetection } from '@/hooks/useWorkoutPlanDetection';
import { useMediaUpload } from '@/hooks/useMediaUpload';

import { SimpleMessageList } from '@/components/SimpleMessageList';
import { MediaUploadZone } from '@/components/MediaUploadZone';
import { ChatLayout } from '@/components/layouts/ChatLayout';
import { ExercisePreviewCard } from '@/components/ExercisePreviewCard';
import { CoachWorkoutPlanSaver } from '@/components/CoachWorkoutPlanSaver';

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [chatInitialized, setChatInitialized] = useState(false);
  
  
  // ============= REFS =============
  const scrollRef = useRef<HTMLDivElement>(null);
  const initializationRef = useRef(false);
  
  // ============= HOOKS =============
  const { memory, isGlobalMemoryLoaded } = useGlobalCoachMemory();
  const { isRecording, isProcessing, transcribedText, startRecording, stopRecording } = useVoiceRecording();
  const { analyzeImage, isAnalyzing } = useUniversalImageAnalysis();
  const { uploadFiles, uploading } = useMediaUpload();
  
  // ============= SIMPLE INITIALIZATION =============
  useEffect(() => {
    if (!user?.id || initializationRef.current) return;
    
    initializationRef.current = true;
    
    const init = async () => {
      try {
        // Simple welcome message without complex logic
        const welcomeMsg: ChatMessage = {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: `Hallo! Ich bin ${coach?.name || 'dein Coach'}. Wie kann ich dir helfen?`,
          created_at: new Date().toISOString(),
          coach_personality: coach?.personality || 'motivierend',
          images: [],
          mode: mode
        };
        
        setMessages([welcomeMsg]);
        setIsLoading(false);
        setChatInitialized(true);
      } catch (error) {
        console.error('Init error:', error);
        setIsLoading(false);
        setChatInitialized(true);
      }
    };
    
    init();
  }, [user?.id, coach?.name, coach?.personality, mode]);
  
  // ============= SIMPLE SEND MESSAGE =============
  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || !user?.id) return;
    
    const userMessage: ChatMessage = {
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
      // Simple response for now
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: 'Danke für deine Nachricht! Ich arbeite daran, dir zu helfen.',
        created_at: new Date().toISOString(),
        coach_personality: coach?.personality || 'motivierend',
        images: [],
        mode: mode
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Send error:', error);
    } finally {
      setIsThinking(false);
    }
  }, [inputText, user?.id, coach?.personality, mode]);

  // Handle voice recording
  const handleVoiceToggle = useCallback(async () => {
    if (isRecording) {
      const transcript = await stopRecording();
      if (transcript) {
        setInputText(prev => prev + (prev ? ' ' : '') + transcript);
      }
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      const uploadedUrls = await uploadFiles(Array.from(files));
      // Add uploaded images to message
      if (uploadedUrls.length > 0) {
        setInputText(prev => prev + (prev ? '\n' : '') + `[Uploaded files: ${uploadedUrls.join(', ')}]`);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
    
    // Reset file input
    event.target.value = '';
  }, [uploadFiles]);

  // Effect to handle transcribed text
  useEffect(() => {
    if (transcribedText && !isRecording) {
      setInputText(prev => prev + (prev ? ' ' : '') + transcribedText);
    }
  }, [transcribedText, isRecording]);

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
      <div className="relative">
        <Textarea
          id="chatInput"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Nachricht eingeben ..."
          rows={4}
          disabled={isRecording}
          className="w-full min-h-[96px] rounded-xl px-4 py-3
                     bg-white/60 dark:bg-black/40 backdrop-blur
                     border border-white/40 dark:border-white/20
                     focus:outline-none resize-none overflow-auto"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        
        {/* Recording-Overlay */}
        <div 
          className={`absolute inset-0 z-20 rounded-xl
                      bg-white/70 dark:bg-black/50 backdrop-blur
                      flex items-center justify-between px-4 transition-opacity duration-200 ${
                        isRecording ? 'opacity-100' : 'opacity-0 pointer-events-none'
                      }`}
        >
          {/* Cancel-Button */}
          <Button
            onClick={async () => {
              await stopRecording();
            }}
            variant="outline"
            size="sm"
            className="flex shrink-0 items-center gap-1 px-3 py-2
                       text-sm font-medium rounded-md
                       border border-red-200 dark:border-red-400
                       text-red-600 dark:text-red-400
                       hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <X className="h-3 w-3" />
            Abbrechen
          </Button>

          {/* Equalizer + Status */}
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

          {/* Send-Button */}
          <Button
            onClick={async () => {
              const transcript = await stopRecording();
              if (transcript) {
                setInputText(prev => prev + (prev ? ' ' : '') + transcript);
              }
            }}
            size="sm"
            className="flex shrink-0 items-center gap-1 px-3 py-2
                       text-sm font-medium rounded-md
                       bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Send className="h-3 w-3" />
            Senden
          </Button>
        </div>

        {/* File Upload & Voice Button */}
        <div className="flex justify-between items-center mt-3">
          <div className="flex gap-2">
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
              multiple
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={uploading || isRecording}
              className="bg-card/50 border-border hover:bg-card"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleVoiceToggle}
              disabled={isProcessing}
              className={`bg-card/50 border-border hover:bg-card ${isRecording ? 'bg-red-500/20 border-red-500' : ''}`}
            >
              <Mic className={`h-4 w-4 ${isRecording ? 'text-red-500' : ''}`} />
            </Button>
          </div>
          
          <Button 
            onClick={sendMessage}
            disabled={!inputText.trim() || isThinking || isRecording}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            <Send className="h-4 w-4 mr-2" />
            Senden
          </Button>
        </div>
      </div>
    );

    return (
      <>
        <ChatLayout chatInput={chatInput}>
          <SimpleMessageList 
            messages={messages.map(msg => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.created_at),
              images: msg.images || []
            }))}
            coach={{
              name: coach?.name || 'Coach',
              avatar: coach?.imageUrl || '',
              primaryColor: coach?.color || 'blue',
              secondaryColor: coach?.accentColor || 'blue',
              personality: coach?.personality || 'motivierend'
            }}
          />
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
          <SimpleMessageList 
            messages={messages.map(msg => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.created_at),
              images: msg.images || []
            }))}
            coach={{
              name: coach?.name || 'Coach',
              avatar: coach?.imageUrl || '',
              primaryColor: coach?.color || 'blue',
              secondaryColor: coach?.accentColor || 'blue',
              personality: coach?.personality || 'motivierend'
            }}
          />
        </ScrollArea>
        
        <div className="flex-none">
          <div className="relative">
            <Textarea
              id="chatInputCard"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Nachricht eingeben ..."
              rows={4}
              disabled={isRecording}
              className="w-full min-h-[96px] rounded-xl px-4 py-3
                         bg-white/60 dark:bg-black/40 backdrop-blur
                         border border-white/40 dark:border-white/20
                         focus:outline-none resize-none overflow-auto"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            
            {/* Recording-Overlay */}
            <div 
              className={`absolute inset-0 z-20 rounded-xl
                          bg-white/70 dark:bg-black/50 backdrop-blur
                          flex items-center justify-between px-4 transition-opacity duration-200 ${
                            isRecording ? 'opacity-100' : 'opacity-0 pointer-events-none'
                          }`}
            >
              {/* Cancel-Button */}
              <Button
                onClick={async () => {
                  await stopRecording();
                }}
                variant="outline"
                size="sm"
                className="flex shrink-0 items-center gap-1 px-3 py-2
                           text-sm font-medium rounded-md
                           border border-red-200 dark:border-red-400
                           text-red-600 dark:text-red-400
                           hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <X className="h-3 w-3" />
                Abbrechen
              </Button>

              {/* Equalizer + Status */}
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

              {/* Send-Button */}
              <Button
                onClick={async () => {
                  const transcript = await stopRecording();
                  if (transcript) {
                    setInputText(prev => prev + (prev ? ' ' : '') + transcript);
                  }
                }}
                size="sm"
                className="flex shrink-0 items-center gap-1 px-3 py-2
                           text-sm font-medium rounded-md
                           bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Send className="h-3 w-3" />
                Senden
              </Button>
            </div>

            {/* File Upload & Voice Button */}
            <div className="flex justify-between items-center mt-3">
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload-card"
                  multiple
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('file-upload-card')?.click()}
                  disabled={uploading || isRecording}
                  className="bg-card/50 border-border hover:bg-card"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleVoiceToggle}
                  disabled={isProcessing}
                  className={`bg-card/50 border-border hover:bg-card ${isRecording ? 'bg-red-500/20 border-red-500' : ''}`}
                >
                  <Mic className={`h-4 w-4 ${isRecording ? 'text-red-500' : ''}`} />
                </Button>
              </div>
              
              <Button 
                onClick={sendMessage}
                disabled={!inputText.trim() || isThinking || isRecording}
                size="sm"
                className="bg-primary hover:bg-primary/90"
              >
                <Send className="h-4 w-4 mr-2" />
                Senden
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export { UnifiedCoachChat };
export default UnifiedCoachChat;