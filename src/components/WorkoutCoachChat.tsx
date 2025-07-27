import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MediaUploadZone } from '@/components/MediaUploadZone';
import { ExercisePreviewCard } from '@/components/ExercisePreviewCard';
import { FormcheckSummaryCard } from '@/components/FormcheckSummaryCard';
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
  ChevronDown,
  MessageSquare
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
    isWelcome?: boolean;
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
  const [formcheckSummary, setFormcheckSummary] = useState<any>(null);
  const [isFormcheckMode, setIsFormcheckMode] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const currentDate = new Date().toISOString().split('T')[0];

  const quickActions = [
    "Analysiere meine Trainingsform",
    "Bewerte meine Ausführung",
    "Gib mir Trainingstipps",
    "Wie kann ich mich verbessern?",
    "Erstelle mir einen Trainingsplan",
    "Welche Übungen für heute?"
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

  // Add initial welcome message
  useEffect(() => {
    if (user && messages.length === 0) {
      const timer = setTimeout(() => {
        const welcomeMessage: WorkoutMessage = {
          id: 'welcome-' + Date.now(),
          role: 'assistant',
          content: 'Hallo! Ich bin Coach Sascha, dein persönlicher Trainer. Erzähle mir von deinem Training oder frage mich nach Übungen und Trainingsplänen!',
          timestamp: new Date(),
          metadata: { isWelcome: true }
        };
        setMessages([welcomeMessage]);
      }, 200);
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

      // Determine if this is a formcheck or workout logging request
      const isFormcheck = userMessage.toLowerCase().includes('form') || 
                         userMessage.toLowerCase().includes('technik') ||
                         userMessage.toLowerCase().includes('ausführung') ||
                         userMessage.toLowerCase().includes('korrekt') ||
                         userMessage.toLowerCase().includes('bewert');

      const analysisType = isFormcheck ? 'form_analysis' : 'workout_analysis';
      setIsFormcheckMode(isFormcheck);

      const { data, error } = await supabase.functions.invoke('coach-media-analysis', {
        body: {
          userId: user.id,
          mediaUrls,
          mediaType: 'mixed',
          analysisType,
          coachPersonality: 'sascha',
          userQuestion: userMessage || (isFormcheck ? 'Bewerte meine Trainingsform.' : 'Analysiere mein Training und gib mir Feedback.'),
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

      // If it's a formcheck, trigger the extraction of summary data after the analysis
      if (isFormcheck && data?.analysis) {
        setTimeout(() => {
          extractFormcheckSummary(mediaUrls, data.analysis, userMessage);
        }, 2000); // Wait 2 seconds after the analysis is shown
      }

      // If it's workout logging, try to extract exercise data
      if (!isFormcheck) {
        try {
          const { data: exerciseData, error: extractError } = await supabase.functions.invoke('extract-exercise-data', {
            body: {
              userId: user.id,
              mediaUrls,
              userMessage
            }
          });

          if (!extractError && exerciseData?.success && exerciseData?.exercises?.length > 0) {
            setExercisePreview({
              exercise_name: exerciseData.exercises[0].name,
              sets: exerciseData.exercises[0].sets || [],
              overall_rpe: exerciseData.exercises[0].rpe
            });
          }
        } catch (extractError) {
          console.error('Exercise extraction error:', extractError);
        }
      }

      toast.success(isFormcheck ? 'Formcheck abgeschlossen!' : 'Training analysiert! Sascha hat dein Workout bewertet.');
    } catch (error) {
      console.error('Error analyzing media:', error);
      toast.error('Fehler bei der Trainingsanalyse');
    } finally {
      setIsLoading(false);
    }
  };

  const extractFormcheckSummary = async (mediaUrls: string[], coachAnalysis: string, userMessage: string) => {
    try {
      // Extract key information from the coach analysis
      const exerciseName = extractExerciseName(userMessage, coachAnalysis);
      const formRating = extractFormRating(coachAnalysis);
      const keyPoints = extractKeyPoints(coachAnalysis);
      const improvementTips = extractImprovementTips(coachAnalysis);

      setFormcheckSummary({
        exercise_name: exerciseName,
        media_urls: mediaUrls,
        coach_analysis: coachAnalysis,
        key_points: keyPoints,
        form_rating: formRating,
        improvement_tips: improvementTips
      });
    } catch (error) {
      console.error('Error extracting formcheck summary:', error);
    }
  };

  const extractExerciseName = (userMessage: string, analysis: string): string => {
    // Try to extract exercise name from user message or analysis
    const exerciseKeywords = ['squat', 'deadlift', 'bench', 'press', 'curl', 'row', 'pullup', 'pushup'];
    const germanKeywords = ['kniebeuge', 'kreuzheben', 'bankdrücken', 'schulterdrücken', 'rudern', 'klimmzug', 'liegestütz'];
    
    const combined = (userMessage + ' ' + analysis).toLowerCase();
    
    for (let i = 0; i < exerciseKeywords.length; i++) {
      if (combined.includes(exerciseKeywords[i]) || combined.includes(germanKeywords[i] || '')) {
        return exerciseKeywords[i].charAt(0).toUpperCase() + exerciseKeywords[i].slice(1);
      }
    }
    
    return 'Unbekannte Übung';
  };

  const extractFormRating = (analysis: string): number => {
    // Look for rating patterns in the analysis
    const ratingMatch = analysis.match(/(\d+)\/10|(\d+) von 10|(\d+) punkte/i);
    if (ratingMatch) {
      return parseInt(ratingMatch[1] || ratingMatch[2] || ratingMatch[3]);
    }
    
    // Default rating based on tone
    if (analysis.toLowerCase().includes('sehr gut') || analysis.toLowerCase().includes('excellent')) return 9;
    if (analysis.toLowerCase().includes('gut') || analysis.toLowerCase().includes('good')) return 7;
    if (analysis.toLowerCase().includes('okay') || analysis.toLowerCase().includes('average')) return 6;
    if (analysis.toLowerCase().includes('verbesserung') || analysis.toLowerCase().includes('needs work')) return 5;
    
    return 7; // Default
  };

  const extractKeyPoints = (analysis: string): string[] => {
    const points: string[] = [];
    
    // Look for bullet points or numbered lists
    const bulletPoints = analysis.match(/[•\-\*]\s*([^\n\r]+)/g);
    if (bulletPoints) {
      points.push(...bulletPoints.map(point => point.replace(/[•\-\*]\s*/, '').trim()));
    }
    
    // Look for key phrases
    if (analysis.includes('wichtig')) {
      const importantMatch = analysis.match(/wichtig[^.]*\./i);
      if (importantMatch) points.push(importantMatch[0]);
    }
    
    if (analysis.includes('achte')) {
      const achtMatch = analysis.match(/achte[^.]*\./i);
      if (achtMatch) points.push(achtMatch[0]);
    }
    
    return points.slice(0, 5); // Limit to 5 key points
  };

  const extractImprovementTips = (analysis: string): string[] => {
    const tips: string[] = [];
    
    // Look for improvement suggestions
    const tipPhrases = ['verbessern', 'tipp', 'empfehlung', 'solltest', 'versuche'];
    
    for (const phrase of tipPhrases) {
      const regex = new RegExp(`[^.]*${phrase}[^.]*\\.`, 'gi');
      const matches = analysis.match(regex);
      if (matches) {
        tips.push(...matches.map(tip => tip.trim()));
      }
    }
    
    return [...new Set(tips)].slice(0, 4); // Remove duplicates and limit to 4 tips
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

  const handleFormcheckSummarySave = async (savedData: any) => {
    console.log('Formcheck saved:', savedData);
    
    const successMessage: WorkoutMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `✅ **Formcheck erfolgreich gespeichert!**\n\n**${savedData.exercise_name}**\n\nDein Formcheck wurde gespeichert und kann später abgerufen werden. 🎯`,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, successMessage]);
    await saveMessage('assistant', successMessage.content);
    setFormcheckSummary(null);
    setIsFormcheckMode(false);
  };

  const handleFormcheckSummaryCancel = () => {
    setFormcheckSummary(null);
    setIsFormcheckMode(false);
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
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="flex items-start gap-3 w-full max-w-[85%]">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Dumbbell className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">Coach Sascha</span>
                          <span className="text-xs text-muted-foreground">
                            {message.timestamp.toLocaleTimeString('de-DE', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="bg-muted text-muted-foreground rounded-lg px-3 py-2">
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
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {message.role === "user" && (
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-3 py-2",
                        "bg-primary text-primary-foreground"
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
                   )}
                 </div>
               ))}

               {/* Exercise Preview Card */}
                {exercisePreview && !isFormcheckMode && (
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

                {/* Formcheck Summary Card */}
                {formcheckSummary && isFormcheckMode && (
                  <div className="flex justify-center">
                    <div className="w-full max-w-md">
                      <FormcheckSummaryCard
                        data={formcheckSummary}
                        onSave={handleFormcheckSummarySave}
                        onCancel={handleFormcheckSummaryCancel}
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
           </ScrollArea>

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

      {/* Quick Actions / Suggestions - Permanent but collapsible */}
      <div className="border-t border-border/20 bg-card/95 backdrop-blur-sm">
        <Collapsible open={showQuickActions} onOpenChange={setShowQuickActions}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-3 h-auto rounded-none text-sm font-medium">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>Vorschläge ({quickActions.length})</span>
              </div>
              <ChevronDown className={cn("h-4 w-4 transition-transform", showQuickActions && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pb-3">
            <div className="space-y-2">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2 px-3 text-sm"
                  onClick={() => {
                    setInputText(action);
                  }}
                >
                  {action}
                </Button>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Fixed Input Area - Identical to CoachChat */}
      <div className="flex-shrink-0 p-3 border-t border-border/20 bg-card/95 backdrop-blur-sm">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Frage Sascha etwas über Training..."
              className="min-h-[120px] max-h-[300px] resize-y"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isLoading}
            />
          </div>
          
          <div className="flex flex-col gap-2">
            {/* Upload Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUpload(!showUpload)}
              disabled={isLoading}
              className="h-10 w-10 p-0"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            {/* Voice Button */}
            <Button
              variant={isRecording ? "destructive" : "outline"}
              size="sm"
              onClick={handleVoiceToggle}
              disabled={isLoading || isProcessing}
              className="h-10 w-10 p-0"
            >
              {isRecording ? (
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              ) : isProcessing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            
            {/* Send Button */}
            <Button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
              className="h-10 w-10 p-0"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        {(isRecording || isProcessing) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg mt-2">
            <div className="flex gap-1">
              <div className="w-1 h-3 bg-red-500 animate-pulse rounded-full" />
              <div className="w-1 h-4 bg-red-500 animate-pulse rounded-full" style={{ animationDelay: '0.1s' }} />
              <div className="w-1 h-3 bg-red-500 animate-pulse rounded-full" style={{ animationDelay: '0.2s' }} />
            </div>
            <span>
              {isRecording ? 'Aufnahme läuft...' : 'Verarbeite Spracheingabe...'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};