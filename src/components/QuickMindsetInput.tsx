import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Brain, Mic, MicOff, Send, Sparkles, Clock, Heart, Camera } from "lucide-react";
import { CollapsibleQuickInput } from "./CollapsibleQuickInput";
import { useMindsetJournal } from "@/hooks/useMindsetJournal";
import { useEnhancedVoiceRecording } from "@/hooks/useEnhancedVoiceRecording";
import { VoiceVisualizer } from "@/components/mindset-journal/VoiceVisualizer";
import { PhotoUpload } from "./PhotoUpload";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface QuickMindsetInputProps {
  onMindsetAdded?: () => void;
}

export const QuickMindsetInput = ({ onMindsetAdded }: QuickMindsetInputProps) => {
  const [manualText, setManualText] = useState('');
  const [analysisMode, setAnalysisMode] = useState<'simple' | 'kai'>('simple');
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const { toast } = useToast();
  const mindsetJournal = useMindsetJournal();
  const voiceRecording = useEnhancedVoiceRecording();

  const {
    currentPrompt,
    recentEntries = [],
    isLoading = false,
    useMindsetPrompts = false,
    saveJournalEntry = async () => {},
    requestKaiAnalysis = async () => null,
    refreshPrompt = () => {},
    togglePromptMode = () => {}
  } = mindsetJournal || {};

  const {
    isRecording = false,
    isProcessing = false,
    isLoading: isVoiceLoading = false,
    transcribedText = '',
    audioLevel = 0,
    hasCachedAudio = false,
    hasPersistedAudio = false,
    startRecording = async () => {},
    stopRecording = async () => {},
    clearTranscription = () => {},
    retryTranscription = async () => null,
    retryFromServer = async () => null,
    clearPersistedAudio = () => {}
  } = voiceRecording || {};

  const getCurrentTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'Morgen';
    if (hour >= 12 && hour < 18) return 'Mittag';
    return 'Abend';
  };

  const handlePhotoSelect = (file: File) => {
    setSelectedPhoto(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const handlePhotoRemove = () => {
    setSelectedPhoto(null);
    setPhotoPreview('');
  };

  const handleAnalyzeAndSave = async () => {
    const textToAnalyze = transcribedText || manualText;
    if (!textToAnalyze.trim() && !selectedPhoto) return;

    try {
      setIsUploadingPhoto(true);

      if (analysisMode === 'kai' && textToAnalyze.length > 50) {
        // Use Kai's advanced analysis
        const kaiAnalysis = await requestKaiAnalysis(textToAnalyze);
        
        if (kaiAnalysis) {
          await saveJournalEntry({
            raw_text: textToAnalyze,
            mood_score: kaiAnalysis.mood_level || 0,
            sentiment_tag: kaiAnalysis.sentiment || 'neutral',
            gratitude_items: kaiAnalysis.gratitude_elements || [],
            highlight: kaiAnalysis.highlight,
            challenge: kaiAnalysis.challenge,
            prompt_used: currentPrompt?.question,
            photo_url: photoPreview || undefined
          });
        }
      } else {
        // Simple analysis
        const words = textToAnalyze.toLowerCase();
        const positiveWords = ['gut', 'super', 'toll', 'dankbar', 'glücklich', 'freude'];
        const negativeWords = ['schlecht', 'müde', 'stress', 'schwer', 'traurig'];
        
        const positiveCount = positiveWords.filter(word => words.includes(word)).length;
        const negativeCount = negativeWords.filter(word => words.includes(word)).length;
        
        let mood_score = 0;
        if (positiveCount > negativeCount) mood_score = Math.min(5, positiveCount);
        else if (negativeCount > positiveCount) mood_score = Math.max(-5, -negativeCount);

        const gratitudePattern = /(?:dankbar für|bin dankbar|grateful for)\s+([^.!?]+)/gi;
        const gratitudeMatches = [...textToAnalyze.matchAll(gratitudePattern)];
        const gratitude_items = gratitudeMatches.map(match => match[1].trim()).slice(0, 3);

        await saveJournalEntry({
          raw_text: textToAnalyze,
          mood_score,
          sentiment_tag: mood_score > 0 ? 'positive' : mood_score < 0 ? 'negative' : 'neutral',
          gratitude_items,
          prompt_used: currentPrompt?.question,
          photo_url: photoPreview || undefined
        });
      }

      // Clear inputs and notify parent
      setManualText('');
      clearTranscription();
      handlePhotoRemove();
      onMindsetAdded?.();
      
      toast({
        title: "Eintrag gespeichert ✨",
        description: selectedPhoto ? "Text und Foto wurden hinzugefügt" : "Dein Gedanke wurde gespeichert"
      });

    } catch (error) {
      toast({
        title: "Fehler",
        description: "Eintrag konnte nicht gespeichert werden",
        variant: "destructive"
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const getMoodBadgeColor = (score: number) => {
    if (score >= 3) return 'bg-success/20 text-success border-success/30';
    if (score >= 1) return 'bg-primary/20 text-primary border-primary/30';
    if (score === 0) return 'bg-muted text-muted-foreground border-muted';
    if (score >= -2) return 'bg-warning/20 text-warning border-warning/30';
    return 'bg-destructive/20 text-destructive border-destructive/30';
  };

  // Check if user has entries today
  const today = new Date().toISOString().split('T')[0];
  const hasEntriesToday = recentEntries.some(entry => 
    new Date(entry.date).toISOString().split('T')[0] === today
  );

  return (
    <CollapsibleQuickInput
      title="Mindset Journal"
      icon={<Brain className="h-5 w-5" />}
      theme="violet"
      isCompleted={hasEntriesToday}
      completedText={hasEntriesToday ? `${recentEntries.filter(entry => 
        new Date(entry.date).toISOString().split('T')[0] === today
      ).length} Einträge heute` : undefined}
      defaultOpen={!hasEntriesToday}
    >
      <div className="space-y-4">
        {/* Smart Prompt */}
        {currentPrompt && (
          <div className="p-3 rounded-lg bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/30 dark:to-violet-900/20 border border-violet-200/50 dark:border-violet-800/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                  {currentPrompt.expertise}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {getCurrentTimeOfDay()}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={useMindsetPrompts ? refreshPrompt : togglePromptMode}
                className="h-6 px-2 text-xs text-violet-600 hover:text-violet-700 dark:text-violet-400"
                title={useMindsetPrompts ? "Neue Mindset-Frage" : "Mindset-Fragen aktivieren"}
              >
                <Sparkles className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-sm font-medium text-violet-900 dark:text-violet-100 mb-1">
              {currentPrompt.question}
            </p>
            {currentPrompt.followUp && (
              <p className="text-xs text-violet-600 dark:text-violet-400">
                💡 {currentPrompt.followUp}
              </p>
            )}
          </div>
        )}

        {/* Input Methods */}
        <div className="space-y-3">
          {/* Voice Input & Analysis Mode */}
          <div className="flex items-center gap-2">
            <Button
              variant={isRecording ? "destructive" : "secondary"}
              size="sm"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing || isVoiceLoading}
              className="flex-1 relative"
            >
              {isRecording ? (
                <>
                  <MicOff className="h-4 w-4 mr-2" />
                  Stoppen
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Voice Input
                  {hasPersistedAudio && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-success rounded-full animate-pulse" />
                  )}
                </>
              )}
            </Button>

            {/* Analysis Mode Toggle */}
            <div className="flex border rounded-md">
              <Button
                variant={analysisMode === 'simple' ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setAnalysisMode('simple')}
                className="rounded-r-none border-0 text-xs px-2"
              >
                Basic
              </Button>
              <Button
                variant={analysisMode === 'kai' ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setAnalysisMode('kai')}
                className="rounded-l-none border-0 text-xs px-2"
              >
                <Brain className="h-3 w-3 mr-1" />
                Kai
              </Button>
            </div>
          </div>

          {/* Voice Visualizer */}
          {(isRecording || audioLevel > 0) && (
            <VoiceVisualizer audioLevel={audioLevel} isRecording={isRecording} />
          )}

          {/* Text Input */}
          <Textarea
            placeholder={isProcessing ? "Transkribiere..." : "Oder schreibe deine Gedanken hier..."}
            value={transcribedText || manualText}
            onChange={(e) => setManualText(e.target.value)}
            className="min-h-[60px] resize-none"
            disabled={isRecording || isProcessing}
          />

          {/* Processing Status & Audio Cache Info */}
          {(isProcessing || isVoiceLoading || hasPersistedAudio) && (
            <div className="space-y-2">
              {(isProcessing || isVoiceLoading) && (
                <div className="flex items-center gap-2 text-xs text-violet-600 dark:text-violet-400">
                  <div className="animate-spin h-3 w-3 border border-violet-300 border-t-violet-600 rounded-full"></div>
                  <span>{isProcessing ? "Transkribiere Aufnahme..." : "Verarbeite..."}</span>
                </div>
              )}
              
              {hasPersistedAudio && !isProcessing && !isVoiceLoading && (
                <div className="flex items-center justify-between p-2 bg-violet-50/50 dark:bg-violet-950/30 border border-violet-200/50 dark:border-violet-800/30 rounded-md">
                  <div className="flex items-center gap-2 text-xs text-violet-700 dark:text-violet-300">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                    <span>Audio permanent gespeichert</span>
                    <Badge variant="outline" className="text-xs border-success/30 text-success">
                      Persistent
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={retryTranscription}
                      className="h-6 px-2 text-xs text-violet-600 hover:text-violet-700 dark:text-violet-400"
                      title="Retry from LocalStorage"
                    >
                      Lokal
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={retryFromServer}
                      className="h-6 px-2 text-xs text-accent hover:text-accent/80"
                      title="Retry from Server"
                    >
                      Server
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearPersistedAudio}
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                      title="Clear all audio"
                    >
                      Löschen
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Photo Upload */}
          <PhotoUpload
            onPhotoSelect={handlePhotoSelect}
            onPhotoRemove={handlePhotoRemove}
            photoPreview={photoPreview}
            isUploading={isUploadingPhoto}
          />

          {/* Submit Button */}
          <Button
            onClick={handleAnalyzeAndSave}
            disabled={!(transcribedText || manualText.trim() || selectedPhoto) || isLoading || isProcessing || isUploadingPhoto}
            size="sm"
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {isUploadingPhoto ? 'Speichere...' : analysisMode === 'kai' ? 'Kai Analyse & Speichern' : 'Speichern'}
          </Button>
        </div>

        {/* Today's Entries Preview */}
        {hasEntriesToday && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">Heutige Einträge</h4>
            <div className="flex gap-2 flex-wrap">
              {recentEntries
                .filter(entry => new Date(entry.date).toISOString().split('T')[0] === today)
                .slice(0, 3)
                .map((entry, index) => (
                <div
                  key={entry.id || index}
                  className="flex items-center gap-1 p-2 rounded-md bg-violet-50/50 dark:bg-violet-950/30 border border-violet-200/50 dark:border-violet-800/30"
                >
                  <Badge
                    variant="outline"
                    className={cn("text-xs px-1", getMoodBadgeColor(entry.mood_score))}
                  >
                    {entry.mood_score > 0 ? '😊' : entry.mood_score < 0 ? '😔' : '😐'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.date).toLocaleTimeString('de-DE', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                  {entry.gratitude_items.length > 0 && (
                    <Heart className="h-3 w-3 text-violet-500" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </CollapsibleQuickInput>
  );
};