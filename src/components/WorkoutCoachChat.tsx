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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load coach conversation history
    loadConversationHistory();
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
      
      // Add assistant response
      const assistantMessage: WorkoutMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: analysis,
        timestamp: new Date(),
        metadata: {
          exerciseData: data.extractedData,
          suggestions: data.suggestions || []
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
      await saveMessage('assistant', analysis, data);

      // Parse and log exercise data automatically
      if (analysis && onExerciseLogged) {
        try {
          // Extract structured exercise data from analysis
          const exerciseData = parseExerciseFromAnalysis(analysis);
          if (exerciseData) {
            await logExerciseSession(exerciseData);
            onExerciseLogged(exerciseData);
            toast.success('Übung automatisch eingetragen!');
          }
        } catch (error) {
          console.error('Error logging exercise:', error);
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

  // Parse exercise data from coach analysis
  const parseExerciseFromAnalysis = (analysis: string) => {
    try {
      // Look for structured exercise information in the analysis
      const exercisePattern = /(?:Übung|Exercise):\s*(.+?)(?:\n|$)/i;
      const repsPattern = /(?:Wiederholungen|Reps):\s*(\d+)/i;
      const setsPattern = /(?:Sätze|Sets):\s*(\d+)/i;
      const weightPattern = /(?:Gewicht|Weight):\s*(\d+(?:\.\d+)?)\s*(?:kg|KG)/i;
      const rpePattern = /(?:RPE|Anstrengung):\s*(\d+(?:\.\d+)?)/i;

      const exerciseMatch = analysis.match(exercisePattern);
      const repsMatch = analysis.match(repsPattern);
      const setsMatch = analysis.match(setsPattern);
      const weightMatch = analysis.match(weightPattern);
      const rpeMatch = analysis.match(rpePattern);

      if (exerciseMatch) {
        return {
          exercise_name: exerciseMatch[1].trim(),
          reps: repsMatch ? parseInt(repsMatch[1]) : null,
          sets: setsMatch ? parseInt(setsMatch[1]) : 1,
          weight_kg: weightMatch ? parseFloat(weightMatch[1]) : null,
          rpe: rpeMatch ? parseFloat(rpeMatch[1]) : null,
          date: new Date().toISOString().split('T')[0]
        };
      }
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

      // Create exercise sets
      const sets = [];
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
              placeholder="Beschreibe dein Training oder stelle eine Frage..."
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

          {uploadedMedia.length > 0 && (
            <div className="mt-3 p-2 bg-orange-50 rounded border border-orange-200">
              <p className="text-sm text-orange-700 mb-2">
                {uploadedMedia.length} Datei(en) bereit für Analyse
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUploadedMedia([])}
                className="text-orange-600"
              >
                Medien entfernen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};