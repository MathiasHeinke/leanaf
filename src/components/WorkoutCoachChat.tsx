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
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { 
  Send, 
  Mic, 
  Dumbbell, 
  Paperclip,
  ChevronDown,
  MessageSquare,
  X,
  Loader2
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
  const [analysisType, setAnalysisType] = useState<'exercise_form' | 'meal_analysis' | 'progress_photo' | 'general'>('exercise_form');
  const [isThinking, setIsThinking] = useState(false);
  
  // Voice recording hook
  const {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording
  } = useVoiceRecording();
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

  const getAnalysisPrompt = (analysisType: string) => {
    switch (analysisType) {
      case 'exercise_form':
        return 'Analysiere meine Trainingstechnik und Übungsausführung in diesen Bildern/Videos. Gib mir detailliertes Feedback zur Form und Verbesserungsvorschläge.';
      case 'meal_analysis':
        return 'Analysiere diese Mahlzeit und gib mir Feedback zur Nährwertverteilung und wie sie zu meinen Trainingszielen passt.';
      case 'progress_photo':
        return 'Analysiere meine Fortschrittsfotos und gib mir Feedback zu den sichtbaren Veränderungen und Tipps für weitere Verbesserungen.';
      case 'general':
        return 'Analysiere diese Medien und gib mir allgemeines Feedback dazu.';
      default:
        return 'Analysiere diese Trainingsbilder/videos und gib mir Feedback zur Technik und Ausführung.';
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

  const handleVoiceToggle = async () => {
    if (isRecording) {
      const transcribedText = await stopRecording();
      if (transcribedText) {
        setInputText(prev => prev ? prev + ' ' + transcribedText : transcribedText);
        toast.success('Spracheingabe hinzugefügt');
      }
    } else {
      try {
        await startRecording();
      } catch (error) {
        toast.error('Fehler bei der Sprachaufnahme');
      }
    }
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
      {/* Chat Area - with proper height calculation for fixed input */}
      <div className="flex-1 flex relative min-h-0">
        {/* Messages */}
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-4 pb-20">
              {messages.map((message) => (
                <div key={message.id} className="flex">
                  {message.role === "assistant" && (
                    <div className="w-full flex flex-col gap-2 items-start">
                      {/* Message bubble */}
                      <div className="bg-muted text-foreground rounded-lg px-3 py-2 max-w-[85%]">
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
                                    alt="Uploaded content" 
                                    className="w-full h-16 object-cover rounded"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <ReactMarkdown>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                      
                      {/* Profile picture and time row UNTER der Nachricht */}
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                          <img 
                            src="/lovable-uploads/a684839c-6310-41c3-bd23-9ba6fb3cdf31.png" 
                            alt="Sascha" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {message.timestamp.toLocaleTimeString('de-DE', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  
                  {message.role === "user" && (
                    <div className="w-full flex flex-col gap-2 items-end">
                      {/* Message bubble */}
                      <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 max-w-[85%]">
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
                                    alt="Uploaded content" 
                                    className="w-full h-16 object-cover rounded"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <ReactMarkdown>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                      
                      {/* Timestamp */}
                      <div className="text-xs text-muted-foreground">
                        {message.timestamp.toLocaleTimeString('de-DE', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="flex flex-col gap-2 items-start">
                  {/* Coach name */}
                  <div className="text-sm font-medium text-foreground">
                    Sascha
                  </div>
                  
                  {/* Typing bubble */}
                  <div className="bg-muted text-foreground rounded-lg px-3 py-2 max-w-[85%]">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                  
                  {/* Profile picture and "schreibt..." */}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                      <img 
                        src="/lovable-uploads/a684839c-6310-41c3-bd23-9ba6fb3cdf31.png" 
                        alt="Sascha" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      schreibt...
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

      {/* Exercise Preview */}
      {exercisePreview && (
        <div className="p-3 border-t border-border/20">
          <ExercisePreviewCard
            data={exercisePreview}
            onSave={handleExercisePreviewSave}
            onCancel={() => setExercisePreview(null)}
          />
        </div>
      )}

      {/* Formcheck Summary */}
      {formcheckSummary && (
        <div className="p-3 border-t border-border/20">
          <FormcheckSummaryCard
            data={formcheckSummary}
            onSave={handleFormcheckSummarySave}
            onCancel={handleFormcheckSummaryCancel}
          />
        </div>
      )}

      {/* Fixed Input Area at bottom */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border/20 bg-background/95 backdrop-blur-sm z-10">
        {/* Quick Actions */}
        <Collapsible open={showQuickActions} onOpenChange={setShowQuickActions}>
          <div className="px-3 pt-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Schnellaktionen</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", showQuickActions && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pb-2">
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInputText(action);
                      setShowQuickActions(false);
                    }}
                    className="text-xs h-auto p-2 text-left justify-start"
                  >
                    {action}
                  </Button>
                ))}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Media Upload */}
        <Collapsible open={showUpload} onOpenChange={setShowUpload}>
          <CollapsibleContent>
            <div className="p-3 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Medien hochladen</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUpload(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-4 gap-2 mb-3">
                <Button
                  variant={analysisType === 'exercise_form' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAnalysisType('exercise_form')}
                  className="text-xs"
                >
                  🏋️ Übung
                </Button>
                <Button
                  variant={analysisType === 'meal_analysis' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAnalysisType('meal_analysis')}
                  className="text-xs"
                >
                  🍽️ Essen
                </Button>
                <Button
                  variant={analysisType === 'progress_photo' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAnalysisType('progress_photo')}
                  className="text-xs"
                >
                  📸 Fortschritt
                </Button>
                <Button
                  variant={analysisType === 'general' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAnalysisType('general')}
                  className="text-xs"
                >
                  💬 Allgemein
                </Button>
              </div>
              
              <MediaUploadZone
                onMediaUploaded={handleMediaUploaded}
                maxFiles={3}
                accept={['image/*', 'video/*']}
                className="max-h-64"
              />
              
              {uploadedMedia.length > 0 && (
                <Button
                  onClick={() => analyzeWorkoutMedia(uploadedMedia, getAnalysisPrompt(analysisType))}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analysiere...
                    </>
                  ) : (
                    <>
                      Medien analysieren ({analysisType === 'exercise_form' ? 'Übung' : 
                                        analysisType === 'meal_analysis' ? 'Essen' : 
                                        analysisType === 'progress_photo' ? 'Fortschritt' : 'Allgemein'})
                    </>
                  )}
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Input */}
        <div className="p-3">
          <div className="flex items-stretch gap-3">
            {/* Textarea - takes full available height */}
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Frage Sascha nach Training, Übungen oder lade Medien hoch..."
              className="flex-1 min-h-[120px] resize-none border-input focus:border-primary"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            
            {/* Button column - vertically stacked */}
            <div className="flex flex-col gap-3 justify-between">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowUpload(!showUpload)}
                className="h-[38px] w-[38px] flex-shrink-0"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              
              <Button
                variant={isRecording ? "destructive" : "outline"}
                size="icon"
                onClick={handleVoiceToggle}
                disabled={isLoading || isProcessing}
                className="h-[38px] w-[38px] flex-shrink-0"
              >
                {isRecording ? (
                  <div className="h-4 w-4 bg-white rounded-full animate-pulse" />
                ) : isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
              
              <Button
                onClick={handleSendMessage}
                disabled={!inputText.trim() && uploadedMedia.length === 0}
                size="icon"
                className="h-[38px] w-[38px] flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Voice recording indicator */}
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
    </div>
  );
};