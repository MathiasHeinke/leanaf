import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MediaUploadZone } from '@/components/MediaUploadZone';
import { ExercisePreviewCard } from '@/components/ExercisePreviewCard';
import { ChatHistorySidebar } from '@/components/ChatHistorySidebar';
import { toast } from 'sonner';
import { useGlobalCoachChat } from '@/hooks/useGlobalCoachChat';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { 
  Send, 
  Mic, 
  MicOff, 
  Dumbbell, 
  Camera, 
  Target,
  TrendingUp,
  Bot,
  History,
  Trash2
} from 'lucide-react';

interface WorkoutMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mediaUrls?: string[];
  timestamp: Date;
  metadata?: {
    exerciseData?: any;
    suggestions?: string[];
    needsRpeInput?: boolean;
    pendingExercise?: any;
  };
}

interface WorkoutCoachChatProps {
  onExerciseLogged?: (exerciseData: any) => void;
}

export const WorkoutCoachChat: React.FC<WorkoutCoachChatProps> = ({
  onExerciseLogged
}) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<WorkoutMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [waitingForRpe, setWaitingForRpe] = useState<any | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string, content: string}>>([]);
  const [exercisePreview, setExercisePreview] = useState<any | null>(null);
  const [uploadedMedia, setUploadedMedia] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentDate = new Date().toISOString().split('T')[0];

  // Enhanced exercise parsing with better pattern matching
  const extractExerciseFromText = (text: string): any | null => {
    console.log('🔍 Analyzing text for exercise data:', text.substring(0, 200) + '...');
    
    // Look for exercise names in various formats
    const exercisePatterns = [
      /(?:Übung|Training|Workout):\s*([A-Za-zäöüßÄÖÜ\s-]+)/i,
      /\*\*([A-Za-zäöüßÄÖÜ\s-]+)-(?:Einheit|Training|Übung)\*\*/i,
      /(?:dein|deiner|das)\s+([A-Za-zäöüßÄÖÜ\s-]+?)[-\s](?:Training|Einheit|Übung)/i,
      /([A-Za-zäöüßÄÖÜ\s-]{3,}?)(?:\s*[-–]\s*(?:Training|Einheit|Übung))/i
    ];
    
    let exerciseName = '';
    for (const pattern of exercisePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        exerciseName = match[1].trim();
        console.log('🎯 Found exercise name:', exerciseName);
        break;
      }
    }
    
    if (!exerciseName) {
      // Try to find exercise names in parentheses or after common words
      const fallbackPatterns = [
        /(?:beim|für|das|dein|deiner)\s+([A-Za-zäöüßÄÖÜ\s-]{3,}?)(?:\s|$|,|\.|!)/i,
        /([A-Za-zäöüßÄÖÜ\s-]{3,}?)[-\s]*\(/i
      ];
      
      for (const pattern of fallbackPatterns) {
        const match = text.match(pattern);
        if (match && match[1] && !match[1].includes('Analyse') && !match[1].includes('Training')) {
          exerciseName = match[1].trim();
          console.log('🎯 Found exercise name (fallback):', exerciseName);
          break;
        }
      }
    }
    
    if (!exerciseName) return null;
    
    // Look for weight and reps patterns
    const sets = [];
    
    // Pattern 1: "3x 12kg, 20/16/12 Wdh" format
    const detailedPattern = /(\d+)x?\s*(\d+(?:[.,]\d+)?)\s*kg[^0-9]*(\d+(?:\/\d+)*)\s*(?:Wdh|Wiederholungen)/i;
    const detailedMatch = text.match(detailedPattern);
    
    if (detailedMatch) {
      const weight = parseFloat(detailedMatch[2].replace(',', '.'));
      const repsStr = detailedMatch[3];
      const repsArray = repsStr.split('/').map(r => parseInt(r));
      
      repsArray.forEach(reps => {
        sets.push({ reps, weight });
      });
      
      console.log('🎯 Parsed sets from detailed pattern:', sets);
    } else {
      // Pattern 2: Look for individual weight/reps mentions
      const simplePatterns = [
        /(\d+)\s*(?:Wdh|Wiederholungen)[^0-9]*(\d+(?:[.,]\d+)?)\s*kg/gi,
        /(\d+(?:[.,]\d+)?)\s*kg[^0-9]*(\d+)\s*(?:Wdh|Wiederholungen)/gi,
        /(\d+)\s*x\s*(\d+(?:[.,]\d+)?)\s*kg/gi
      ];
      
      for (const pattern of simplePatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const reps = parseInt(match[1]);
          const weight = parseFloat(match[2]?.replace(',', '.') || match[1]);
          
          if (reps > 0 && weight > 0) {
            sets.push({ reps: reps, weight: weight });
          }
        }
      }
    }
    
    if (sets.length === 0) {
      // If no specific sets found, create a default one
      const weightMatch = text.match(/(\d+(?:[.,]\d+)?)\s*kg/i);
      const repsMatch = text.match(/(\d+)\s*(?:Wdh|Wiederholungen|x)/i);
      
      if (weightMatch || repsMatch) {
        sets.push({
          reps: repsMatch ? parseInt(repsMatch[1]) : 10,
          weight: weightMatch ? parseFloat(weightMatch[1].replace(',', '.')) : 0
        });
      }
    }
    
    if (sets.length === 0) return null;
    
    return {
      exercise_name: exerciseName,
      sets: sets
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load coach conversation history with delay to ensure auth is ready
    if (user) {
      const timer = setTimeout(() => {
        loadConversationHistory();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const loadConversationHistory = async (date?: string) => {
    if (!user) return;

    try {
      const targetDate = date || currentDate;
      const { data, error } = await supabase
        .from('coach_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('coach_personality', 'sascha')
        .eq('conversation_date', targetDate)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const conversationMessages: WorkoutMessage[] = data.map(msg => ({
        id: msg.id,
        role: msg.message_role as 'user' | 'assistant',
        content: msg.message_content,
        timestamp: new Date(msg.created_at),
        metadata: (typeof msg.context_data === 'object' && msg.context_data) ? msg.context_data as any : undefined
      }));

      setMessages(conversationMessages);
      setSelectedDate(targetDate);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const saveMessage = async (role: 'user' | 'assistant', content: string, contextData?: any) => {
    if (!user) return;

    try {
      await supabase
        .from('coach_conversations')
        .insert({
          user_id: user.id,
          coach_personality: 'sascha',
          message_role: role,
          message_content: content,
          conversation_date: selectedDate || currentDate,
          context_data: contextData || {}
        });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const clearChat = async () => {
    if (!user) return;

    try {
      const targetDate = selectedDate || currentDate;
      await supabase
        .from('coach_conversations')
        .delete()
        .eq('user_id', user.id)
        .eq('coach_personality', 'sascha')
        .eq('conversation_date', targetDate);
      
      setMessages([]);
      toast.success('Chat-Verlauf gelöscht');
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast.error('Fehler beim Löschen des Chats');
    }
  };

  const handleSelectDate = (date: string) => {
    loadConversationHistory(date);
    setShowHistory(false);
  };

  const handleMediaUpload = (urls: string[]) => {
    setUploadedMedia(prev => [...prev, ...urls]);
  };

  const analyzeWorkoutMedia = async (mediaUrls: string[], userMessage: string) => {
    if (!user) return;

    try {
      setIsLoading(true);

      const { data, error } = await supabase.functions.invoke('coach-media-analysis', {
        body: {
          userId: user.id,
          mediaUrls,
          mediaType: 'mixed',
          analysisType: 'workout_analysis',
          coachPersonality: 'sascha',
          userQuestion: userMessage || 'Analysiere mein Training und gib mir Feedback.',
          userProfile: {
            goal: 'muscle_building',
            experience_level: 'intermediate'
          }
        }
      });

      if (error) throw error;

      const analysis = data.analysis;
      
      // Add assistant response
      const assistantMessage: WorkoutMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: analysis,
        timestamp: new Date(),
        metadata: {
          suggestions: data.suggestions || []
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
      await saveMessage('assistant', analysis, data);

      // Try to extract exercise data from the analysis text
      let extractedExercise = extractExerciseFromText(analysis);
      
      // Show exercise preview if found
      if (extractedExercise) {
        console.log('🎯 Extracted exercise data:', extractedExercise);
        setExercisePreview(extractedExercise);
      } else {
        console.log('❌ No exercise data could be extracted from analysis');
      }

      toast.success('Training analysiert! Sascha hat dein Workout bewertet.');
    } catch (error) {
      console.error('Error analyzing media:', error);
      toast.error('Fehler bei der Trainingsanalyse');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() && uploadedMedia.length === 0) return;
    if (!user) return;

    const userMessage: WorkoutMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      mediaUrls: uploadedMedia.length > 0 ? [...uploadedMedia] : undefined,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    await saveMessage('user', input, { mediaUrls: uploadedMedia });

    // If media was uploaded, analyze it
    if (uploadedMedia.length > 0) {
      await analyzeWorkoutMedia(uploadedMedia, input);
      setUploadedMedia([]);
    } else {
      // Check if user is providing RPE for pending exercise
      if (waitingForRpe && /^\d+(\.\d+)?$/.test(input.trim())) {
        const rpeValue = parseFloat(input.trim());
        if (rpeValue >= 1 && rpeValue <= 10) {
          await handleRpeSubmit(rpeValue);
          setInput('');
          return;
        }
      }
      
      // Regular chat without media
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase.functions.invoke('coach-chat', {
          body: {
            message: input,
            userId: user.id,
            coachPersonality: 'sascha',
            context: 'workout_coaching'
          }
        });

        if (error) throw error;

        const assistantMessage: WorkoutMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
        await saveMessage('assistant', data.response);
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error('Fehler beim Senden der Nachricht');
      } finally {
        setIsLoading(false);
      }
    }

    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleRpeSubmit = async (rpe: number) => {
    if (!waitingForRpe) return;

    try {
      const exerciseWithRpe = { ...waitingForRpe, rpe };
      await logExerciseSession(exerciseWithRpe);
      
      if (onExerciseLogged) {
        onExerciseLogged(exerciseWithRpe);
      }

      const successMessage: WorkoutMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ **Übung erfolgreich eingetragen!**\n\n**${exerciseWithRpe.exercise_name}**\n- **RPE:** ${rpe}/10\n\nSuper! Deine Übung wurde ins Training eingetragen. Weiter so! 💪`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, successMessage]);
      await saveMessage('assistant', successMessage.content);
      setWaitingForRpe(null);
      toast.success('Übung erfolgreich eingetragen!');
    } catch (error) {
      console.error('Error logging exercise with RPE:', error);
      toast.error('Fehler beim Eintragen der Übung');
    }
  };

  const handleExercisePreviewSave = async (exerciseData: any) => {
    try {
      // Convert to the format expected by logExerciseSession
      const exerciseToLog = {
        exercise_name: exerciseData.exercise_name,
        sets_data: exerciseData.sets.map((set: any, index: number) => ({
          set_number: index + 1,
          reps: set.reps,
          weight: set.weight,
          rpe: set.rpe || exerciseData.overall_rpe
        })),
        rpe: exerciseData.overall_rpe || (exerciseData.sets[0]?.rpe)
      };

      await logExerciseSession(exerciseToLog);
      
      if (onExerciseLogged) {
        onExerciseLogged(exerciseToLog);
      }

      const successMessage: WorkoutMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ **Übung erfolgreich eingetragen!**\n\n**${exerciseData.exercise_name}**\n${exerciseData.sets.map((set: any, i: number) => 
          `  **Satz ${i + 1}:** ${set.reps} Wdh. × ${set.weight} kg`
        ).join('\n')}\n- **RPE:** ${exerciseData.overall_rpe || exerciseData.sets[0]?.rpe}/10\n\nPerfekt! Deine Übung wurde ins Training eingetragen. 💪`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, successMessage]);
      await saveMessage('assistant', successMessage.content);
      setExercisePreview(null);
      
    } catch (error) {
      console.error('Error saving exercise from preview:', error);
      throw error;
    }
  };

  // Log exercise session to database
  const logExerciseSession = async (exerciseData: any) => {
    if (!user) return;

    try {
      // First create or get exercise session for today
      const today = new Date().toISOString().split('T')[0];
      
      const { data: existingSession, error: sessionError } = await supabase
        .from('exercise_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      let sessionId = existingSession?.id;

      if (!sessionId) {
        const { data: newSession, error: createError } = await supabase
          .from('exercise_sessions')
          .insert({
            user_id: user.id,
            date: today,
            session_name: 'Sascha Analyse Session',
            workout_type: 'strength',
            start_time: new Date().toISOString()
          })
          .select('id')
          .single();

        if (createError) throw createError;
        sessionId = newSession.id;
      }

      // Find or create exercise
      let exerciseId;
      const { data: existingExercise } = await supabase
        .from('exercises')
        .select('id')
        .ilike('name', exerciseData.exercise_name)
        .maybeSingle();

      if (existingExercise) {
        exerciseId = existingExercise.id;
      } else {
        const { data: newExercise, error: exerciseError } = await supabase
          .from('exercises')
          .insert({
            name: exerciseData.exercise_name,
            category: 'strength',
            muscle_groups: ['unknown'],
            created_by: user.id
          })
          .select('id')
          .single();

        if (exerciseError) throw exerciseError;
        exerciseId = newExercise.id;
      }

      // Create exercise sets
      const sets = [];
      
      if (exerciseData.sets_data && Array.isArray(exerciseData.sets_data)) {
        // New multi-set format
        exerciseData.sets_data.forEach((setData: any, index: number) => {
          sets.push({
            user_id: user.id,
            session_id: sessionId,
            exercise_id: exerciseId,
            set_number: index + 1,
            reps: setData.reps,
            weight_kg: setData.weight,
            rpe: setData.rpe || exerciseData.rpe
          });
        });
      } else {
        // Legacy single set format
        sets.push({
          user_id: user.id,
          session_id: sessionId,
          exercise_id: exerciseId,
          set_number: 1,
          reps: exerciseData.reps || 10,
          weight_kg: exerciseData.weight_kg || 0,
          rpe: exerciseData.rpe
        });
      }

      const { error: setsError } = await supabase
        .from('exercise_sets')
        .insert(sets);

      if (setsError) throw setsError;

      console.log('✅ Exercise logged successfully');
    } catch (error) {
      console.error('Error logging exercise:', error);
      throw error;
    }
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Main Chat Area */}
      <div className="flex-1 space-y-4 flex flex-col">
        {/* Coach Header */}
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <img 
                  src="/coach-images/9e4f4475-6b1f-4563-806d-89f78ba853e6.png" 
                  alt="Coach Sascha"
                  className="w-10 h-10 rounded-full object-cover"
                />
              </div>
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <Dumbbell className="h-5 w-5" />
                  Coach Sascha
                  {selectedDate && selectedDate !== currentDate && (
                    <Badge variant="outline" className="text-xs">
                      {new Date(selectedDate).toLocaleDateString('de-DE')}
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-orange-600">
                  Performance- & Trainingsexperte
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory(true)}
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                >
                  <History className="h-4 w-4" />
                  {!isMobile && <span className="ml-1">History</span>}
                </Button>
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearChat}
                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                  >
                    <Trash2 className="h-4 w-4" />
                    {!isMobile && <span className="ml-1">Clear</span>}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Chat Messages */}
        <Card className="flex-1">
          <CardContent className="p-0">
            <ScrollArea className="h-[400px] p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <Dumbbell className="h-12 w-12 mx-auto mb-4 text-orange-500" />
                    <h3 className="text-lg font-semibold mb-2">Willkommen bei Coach Sascha!</h3>
                    <p className="text-muted-foreground mb-4">
                      Lade Bilder oder Videos von deinem Training hoch und ich analysiere:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-orange-600">
                        <Camera className="h-4 w-4" />
                        Übungsausführung
                      </div>
                      <div className="flex items-center gap-2 text-orange-600">
                        <Target className="h-4 w-4" />
                        RPE Einschätzung
                      </div>
                      <div className="flex items-center gap-2 text-orange-600">
                        <TrendingUp className="h-4 w-4" />
                        Trainingsempfehlungen
                      </div>
                    </div>
                  </div>
                )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-orange-50 text-orange-900 border border-orange-200'
                    }`}
                  >
                    {message.mediaUrls && message.mediaUrls.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        {message.mediaUrls.map((url, index) => (
                          <div key={index} className="relative">
                            {url.includes('.mp4') || url.includes('.mov') || url.includes('.avi') ? (
                              <video 
                                controls 
                                className="w-full h-24 object-cover rounded"
                                style={{ maxHeight: '96px' }}
                              >
                                <source src={url} type="video/mp4" />
                                Your browser does not support the video tag.
                              </video>
                            ) : (
                              <img
                                src={url}
                                alt={`Upload ${index + 1}`}
                                className="w-full h-24 object-cover rounded"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold text-orange-800">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
                            li: ({ children }) => <li className="text-sm">{children}</li>,
                            code: ({ children }) => <code className="bg-orange-100 text-orange-800 px-1 py-0.5 rounded text-xs">{children}</code>,
                            h3: ({ children }) => <h3 className="font-semibold text-orange-800 mb-1 text-sm">{children}</h3>,
                            h4: ({ children }) => <h4 className="font-medium text-orange-700 mb-1 text-sm">{children}</h4>
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                    <div className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString('de-DE', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {/* Exercise Preview Card */}
              {exercisePreview && (
                <div className="flex justify-center">
                  <div className="w-full max-w-md">
                    <ExercisePreviewCard
                      data={exercisePreview}
                      onSave={handleExercisePreviewSave}
                      onCancel={() => setExercisePreview(null)}
                      onEdit={(data) => console.log('Exercise edited:', data)}
                    />
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-orange-50 text-orange-900 border border-orange-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent"></div>
                      Sascha analysiert dein Training...
                    </div>
                  </div>
                </div>
              )}
            </div>
              <div ref={messagesEndRef} />
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Media Upload */}
        {uploadedMedia.length === 0 && (
          <MediaUploadZone
            onMediaUploaded={handleMediaUpload}
            maxFiles={3}
            className="border-orange-200"
          />
        )}

        {/* Input Area */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  waitingForRpe 
                    ? "Bewerte die Intensität (1-10)..." 
                    : "Beschreibe dein Training oder stelle eine Frage..."
                }
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || (!input.trim() && uploadedMedia.length === 0)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {(uploadedMedia.length > 0 || waitingForRpe) && (
              <div className="mt-3 p-2 bg-orange-50 rounded border border-orange-200">
                {waitingForRpe ? (
                  <p className="text-sm text-orange-700 mb-2">
                    ⏳ Warte auf RPE-Bewertung für: <strong>{waitingForRpe.exercise_name}</strong>
                  </p>
                ) : (
                  <p className="text-sm text-orange-700 mb-2">
                    {uploadedMedia.length} Datei(en) bereit für Analyse
                  </p>
                )}
                {!waitingForRpe && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUploadedMedia([])}
                    className="text-orange-600"
                  >
                    Medien entfernen
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chat History Sidebar */}
      {showHistory && !isMobile && (
        <ChatHistorySidebar
          selectedCoach="sascha"
          onSelectDate={handleSelectDate}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Mobile Chat History */}
      {showHistory && isMobile && (
        <ChatHistorySidebar
          selectedCoach="sascha"
          onSelectDate={handleSelectDate}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
};