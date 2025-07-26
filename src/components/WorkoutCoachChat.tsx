import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MediaUploadZone } from '@/components/MediaUploadZone';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Send, 
  Mic, 
  MicOff, 
  Dumbbell, 
  Camera, 
  Target,
  TrendingUp,
  Bot
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
  const [messages, setMessages] = useState<WorkoutMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<string[]>([]);
  const [waitingForRpe, setWaitingForRpe] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const loadConversationHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('coach_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('coach_personality', 'sascha')
        .order('created_at', { ascending: true })
        .limit(20);

      if (error) throw error;

      const conversationMessages: WorkoutMessage[] = data.map(msg => ({
        id: msg.id,
        role: msg.message_role as 'user' | 'assistant',
        content: msg.message_content,
        timestamp: new Date(msg.created_at),
        metadata: (typeof msg.context_data === 'object' && msg.context_data) ? msg.context_data as any : undefined
      }));

      setMessages(conversationMessages);
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
          context_data: contextData || {}
        });
    } catch (error) {
      console.error('Error saving message:', error);
    }
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
            // Add relevant user profile data
            goal: 'muscle_building',
            experience_level: 'intermediate'
          }
        }
      });

      if (error) throw error;

      const analysis = data.analysis;
      
      // Parse exercise data from analysis
      const exerciseData = parseExerciseFromAnalysis(analysis);
      
      // Add assistant response
      const assistantMessage: WorkoutMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: analysis,
        timestamp: new Date(),
        metadata: {
          exerciseData: exerciseData,
          suggestions: data.suggestions || [],
          needsRpeInput: exerciseData && !exerciseData.rpe,
          pendingExercise: exerciseData
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
      await saveMessage('assistant', analysis, data);

      // Check if we need to ask for RPE or can log immediately
      if (exerciseData) {
        console.log('🎯 Exercise detected, checking if RPE is needed...');
        
        if (exerciseData.rpe) {
          // RPE already provided, log directly
          try {
            await logExerciseSession(exerciseData);
            if (onExerciseLogged) {
              onExerciseLogged(exerciseData);
            }
            
            // Format sets for display
            let setsDisplay = '';
            if (exerciseData.sets_data && Array.isArray(exerciseData.sets_data)) {
              setsDisplay = exerciseData.sets_data.map((set: any, i: number) => 
                `  **Satz ${i + 1}:** ${set.reps} Wdh. × ${set.weight} kg`
              ).join('\n');
            } else {
              // Legacy format fallback (shouldn't happen with new parsing)
              setsDisplay = `  **1 Satz:** Nicht angegeben`;
            }
            
            const successMessage: WorkoutMessage = {
              id: (Date.now() + 2).toString(),
              role: 'assistant', 
              content: `✅ **Übung automatisch eingetragen!**\n\n**${exerciseData.exercise_name}**\n${setsDisplay}\n- **RPE:** ${exerciseData.rpe}/10\n\nDa du bereits die Intensität angegeben hast, habe ich die Übung direkt eingetragen. Stark! 💪`,
              timestamp: new Date()
            };
            
            setMessages(prev => [...prev, successMessage]);
            await saveMessage('assistant', successMessage.content);
            toast.success('Übung automatisch eingetragen!');
            
          } catch (error) {
            console.error('Error logging exercise:', error);
            toast.error('Fehler beim Eintragen der Übung');
          }
        } else {
          // Ask for RPE
          setWaitingForRpe(exerciseData);
          
          // Format sets for RPE prompt
          let setsDisplay = '';
          if (exerciseData.sets_data && Array.isArray(exerciseData.sets_data)) {
            setsDisplay = exerciseData.sets_data.map((set: any, i: number) => 
              `  **Satz ${i + 1}:** ${set.reps} Wdh. × ${set.weight} kg`
            ).join('\n');
          } else {
            // Legacy format fallback (shouldn't happen with new parsing)
            setsDisplay = `  **1 Satz:** Nicht angegeben`;
          }
          
          const rpeMessage: WorkoutMessage = {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: `\n\n✅ **Erkannte Übung: ${exerciseData.exercise_name}**\n${setsDisplay}\n\n🎯 **Wie intensiv war dein Training?**\n\nBitte gib deine RPE (Rate of Perceived Exertion) von **1-10** an:\n- 1-3: Sehr leicht\n- 4-6: Mittel\n- 7-8: Schwer\n- 9-10: Maximal\n\nEinfach eine Zahl eingeben (z.B. "8") und ich trage die Übung für dich ein! 💪`,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, rpeMessage]);
          await saveMessage('assistant', rpeMessage.content);
        }
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
          // Update exercise with RPE and log it
          const exerciseWithRpe = { ...waitingForRpe, rpe: rpeValue };
          
          try {
            await logExerciseSession(exerciseWithRpe);
            if (onExerciseLogged) {
              onExerciseLogged(exerciseWithRpe);
            }
            
            // Format sets information
            let setsInfo = '';
            if (exerciseWithRpe.sets_data && Array.isArray(exerciseWithRpe.sets_data)) {
              setsInfo = exerciseWithRpe.sets_data.map((set: any, i: number) => 
                `  **Satz ${i + 1}:** ${set.reps} Wdh. × ${set.weight} kg`
              ).join('\n');
            } else {
              // Legacy format fallback (shouldn't happen with new parsing)
              setsInfo = `  **1 Satz:** Nicht angegeben`;
            }

            const confirmationMessage: WorkoutMessage = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `✅ **Übung eingetragen!**\n\n**${exerciseWithRpe.exercise_name}**\n${setsInfo}\n- **RPE:** ${rpeValue}/10\n\nDie Übung wurde in deinen Trainingsplan eingetragen. Weiter so! 💪`,
              timestamp: new Date()
            };
            
            setMessages(prev => [...prev, confirmationMessage]);
            await saveMessage('assistant', confirmationMessage.content);
            setWaitingForRpe(null);
            toast.success('Übung mit RPE eingetragen!');
            
          } catch (error) {
            console.error('Error logging exercise:', error);
            toast.error('Fehler beim Eintragen der Übung');
          }
          
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

  // Parse exercise data from coach analysis - NEW multi-set handling
  const parseExerciseFromAnalysis = (analysis: string) => {
    try {
      console.log('🔍 Parsing exercise data from analysis:', analysis);
      
      // Look for exercise names
      const exercisePatterns = [
        /(?:Übung|Exercise):\s*([^\n]+)/i,
        /(Latzug|Rudern|Bankdrücken|Kniebeugen|Kreuzheben|Curls|Press)/i,
        /(?:Du hast|machst|trainierst)\s+([^\n]+?)\s+(?:gemacht|trainiert|geübt)/i
      ];

      // Multi-set patterns like "12x 53kg; 8x 73kg; 6x 86kg"
      const multiSetPattern = /(\d+)(?:x|×|\s*Wdh\.?)\s*(\d+(?:\.\d+)?)\s*kg/gi;
      
      // Single set patterns
      const singleSetPatterns = [
        /(\d+)\s*(?:Wiederholungen|Wdh\.?|x)\s*(?:mit\s*)?(\d+(?:\.\d+)?)\s*kg/i,
        /(\d+(?:\.\d+)?)\s*kg\s*(?:für\s*)?(\d+)\s*(?:Wiederholungen|Wdh\.?)/i
      ];

      const rpePatterns = [
        /(?:RPE|Anstrengung|Intensität):\s*(\d+(?:\.\d+)?)/i,
        /RPE\s*(\d+(?:\.\d+)?)/i
      ];

      let exerciseName = null;
      let exerciseSets: Array<{reps: number, weight: number}> = [];
      let rpe = null;

      // Find exercise name
      for (const pattern of exercisePatterns) {
        const match = analysis.match(pattern);
        if (match) {
          exerciseName = match[1].trim();
          break;
        }
      }

      // Parse multi-set data (e.g., "12x 53kg; 8x 73kg; 6x 86kg")
      let match;
      while ((match = multiSetPattern.exec(analysis)) !== null) {
        const reps = parseInt(match[1]);
        const weight = parseFloat(match[2]);
        exerciseSets.push({ reps, weight });
      }

      // If no multi-sets found, try single set patterns
      if (exerciseSets.length === 0) {
        for (const pattern of singleSetPatterns) {
          const singleMatch = analysis.match(pattern);
          if (singleMatch) {
            const reps = parseInt(singleMatch[1]);
            const weight = parseFloat(singleMatch[2]);
            exerciseSets.push({ reps, weight });
            break;
          }
        }
      }

      // Find RPE
      for (const pattern of rpePatterns) {
        const rpeMatch = analysis.match(pattern);
        if (rpeMatch) {
          rpe = parseFloat(rpeMatch[1]);
          break;
        }
      }
      if (exerciseName && exerciseSets.length > 0) {
        const exerciseData = {
          exercise_name: exerciseName,
          sets_data: exerciseSets, // Array of {reps, weight} objects
          rpe: rpe,
          date: new Date().toISOString().split('T')[0]
        };
        
        console.log('✅ Parsed exercise data:', exerciseData);
        return exerciseData;
      }
      
      console.log('❌ No exercise data found in analysis');
      return null;
    } catch (error) {
      console.error('Error parsing exercise data:', error);
      return null;
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
        .single();

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
        .single();

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

      // Create exercise sets - handle both new multi-set and legacy format
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
            rpe: exerciseData.rpe
          });
        });
      } else {
        // Legacy single set format
        for (let i = 1; i <= (exerciseData.sets || 1); i++) {
          sets.push({
            user_id: user.id,
            session_id: sessionId,
            exercise_id: exerciseId,
            set_number: i,
            reps: exerciseData.reps,
            weight_kg: exerciseData.weight_kg,
            rpe: exerciseData.rpe
          });
        }
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
    <div className="space-y-4 h-full flex flex-col">
      {/* Coach Header */}
      <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <img 
                src="/coach-images/markus-ruehl.jpg" 
                alt="Coach Sascha"
                className="w-10 h-10 rounded-full object-cover"
              />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <Dumbbell className="h-5 w-5" />
                Coach Sascha
              </CardTitle>
              <p className="text-sm text-orange-600">
                Dein AI-Trainingsspezialist für Krafttraining & Form-Check
              </p>
            </div>
            <Badge className="bg-orange-100 text-orange-800 border-orange-200 ml-auto">
              <Bot className="h-3 w-3 mr-1" />
              AI Coach
            </Badge>
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
                          <img
                            key={index}
                            src={url}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-24 object-cover rounded"
                          />
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
  );
};