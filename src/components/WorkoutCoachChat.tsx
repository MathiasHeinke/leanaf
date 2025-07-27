import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MediaUploadZone } from '@/components/MediaUploadZone';
import { ExercisePreviewCard } from '@/components/ExercisePreviewCard';
import { ChatHistorySidebar } from '@/components/ChatHistorySidebar';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { 
  Send, 
  Mic, 
  Dumbbell, 
  Paperclip,
  ChevronDown
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
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [exercisePreview, setExercisePreview] = useState<any | null>(null);
  const [uploadedMedia, setUploadedMedia] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const currentDate = new Date().toISOString().split('T')[0];

  const quickActions = [
    "Analysiere meine Trainingsform",
    "Wie war meine Kraftentwicklung?", 
    "Gib mir Trainingstipps",
    "Was kann ich besser machen?"
  ];

  useEffect(() => {
    scrollAreaRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
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

  const handleSelectDate = (date: string) => {
    loadConversationHistory(date);
    setShowHistory(false);
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

      const assistantMessage: WorkoutMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.analysis,
        timestamp: new Date(),
        metadata: {
          suggestions: data.suggestions || []
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
      await saveMessage('assistant', data.analysis, data);

      toast.success('Training analysiert! Sascha hat dein Workout bewertet.');
    } catch (error) {
      console.error('Error analyzing media:', error);
      toast.error('Fehler bei der Trainingsanalyse');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() && uploadedMedia.length === 0) return;
    if (!user) return;

    const userMessage: WorkoutMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      mediaUrls: uploadedMedia.length > 0 ? [...uploadedMedia] : undefined,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    await saveMessage('user', inputText, { mediaUrls: uploadedMedia });

    // If media was uploaded, analyze it
    if (uploadedMedia.length > 0) {
      await analyzeWorkoutMedia(uploadedMedia, inputText);
      setUploadedMedia([]);
    } else {
      // Regular chat without media
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase.functions.invoke('coach-chat', {
          body: {
            message: inputText,
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

    setInputText('');
  };

  const handleExercisePreviewSave = async (exerciseData: any) => {
    try {
      // Logic for saving exercise data
      if (onExerciseLogged) {
        onExerciseLogged(exerciseData);
      }

      const successMessage: WorkoutMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ **Übung erfolgreich eingetragen!**\n\n**${exerciseData.exercise_name}**\n\nPerfekt! Deine Übung wurde ins Training eingetragen. 💪`,
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

  const handleVoiceToggle = () => {
    toast.success('Sprachfunktion in Entwicklung');
  };

  const handleSendMessage = () => {
    if (inputText.trim()) {
      sendMessage();
    }
  };

  const handleMediaUploaded = (urls: string[]) => {
    setUploadedMedia(prev => [...prev, ...urls]);
    analyzeWorkoutMedia(urls, '');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Chat Area */}
      <div className="flex-1 flex relative min-h-0">
        {/* Messages */}
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-3" ref={scrollAreaRef}>
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-6">
                <Dumbbell className="h-8 w-8 mx-auto mb-3 text-primary/30" />
                <p className="text-base font-medium mb-2">Willkommen beim Training!</p>
                <p className="text-sm">
                  Erzähle mir von deinem Training oder frage nach Übungen.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-3 py-2",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {message.mediaUrls && message.mediaUrls.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          {message.mediaUrls.map((url, index) => (
                            <div key={index} className="relative">
                              {url.includes('.mp4') || url.includes('.mov') || url.includes('.avi') ? (
                                <video 
                                  controls 
                                  className="w-full h-16 object-cover rounded"
                                >
                                  <source src={url} type="video/mp4" />
                                </video>
                              ) : (
                                <img
                                  src={url}
                                  alt={`Upload ${index + 1}`}
                                  className="w-full h-16 object-cover rounded"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
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
                    <div className="bg-muted text-muted-foreground rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span className="text-sm">Coach Sascha denkt nach...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Quick Actions */}
          {messages.length === 0 && (
            <div className="p-3 border-t border-border/20">
              <Collapsible 
                open={showQuickActions} 
                onOpenChange={setShowQuickActions}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-sm">
                    <span>Schnelle Aktionen</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="grid grid-cols-1 gap-2">
                    {quickActions.map((action, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setInputText(action)}
                        className="text-left justify-start h-auto py-2 whitespace-normal text-xs"
                      >
                        {action}
                      </Button>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </div>

        {/* Chat History Sidebar */}
        {showHistory && (
          <ChatHistorySidebar
            selectedCoach="sascha"
            onSelectDate={handleSelectDate}
            onClose={() => setShowHistory(false)}
          />
        )}
      </div>

      {/* Media Upload Zone */}
      {showUpload && (
        <div className="flex-shrink-0 p-3 border-t border-border/20 bg-card/50">
          <MediaUploadZone
            onMediaUploaded={handleMediaUploaded}
            maxFiles={3}
            accept={['image/*', 'video/*']}
            className="h-24"
          />
        </div>
      )}

      {/* Fixed Input Area */}
      <div className="flex-shrink-0 p-3 border-t border-border/20 bg-card/95 backdrop-blur-sm">
        <div className="space-y-2">
          <div className="flex items-end gap-2">
            <Textarea
              placeholder="Frage Coach Sascha..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="min-h-[40px] resize-none text-sm"
              rows={1}
            />
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpload(!showUpload)}
                className={cn(
                  "p-2 h-10 w-10",
                  showUpload && "bg-accent"
                )}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleVoiceToggle}
                className={cn(
                  "p-2 h-10 w-10",
                  (isRecording || isProcessing) && "bg-red-500 text-white"
                )}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isLoading}
                size="sm"
                className="p-2 h-10 w-10"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {(isRecording || isProcessing) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span>
                {isRecording ? "Aufnahme läuft..." : "Verarbeite Sprache..."}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};