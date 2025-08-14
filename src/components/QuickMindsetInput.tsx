import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Brain, Mic, MicOff, Send, Sparkles, Clock, Heart, Camera, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { SmartChip } from "@/components/ui/smart-chip";
import { useMindsetJournal } from "@/hooks/useMindsetJournal";
import { useEnhancedVoiceRecording } from "@/hooks/useEnhancedVoiceRecording";
import { VoiceVisualizer } from "@/components/mindset-journal/VoiceVisualizer";
import { MindsetJournalDetailWidget } from "@/components/mindset-journal/MindsetJournalDetailWidget";
import { PhotoUpload } from "./PhotoUpload";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface QuickMindsetInputProps {
  onMindsetAdded?: () => void;
  currentDate?: Date;
}

export const QuickMindsetInput = ({ onMindsetAdded, currentDate = new Date() }: QuickMindsetInputProps) => {
  const [manualText, setManualText] = useState('');
  const [analysisMode, setAnalysisMode] = useState<'simple' | 'kai'>('simple');
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showDetailWidget, setShowDetailWidget] = useState(false);

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
    uploadPhoto = async () => null,
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
      let photoUrl = '';

      // Upload photo first if selected
      if (selectedPhoto && typeof selectedPhoto === 'object') {
        const uploadedUrl = await uploadPhoto(selectedPhoto);
        if (uploadedUrl) {
          photoUrl = uploadedUrl;
        } else {
          toast({
            title: "Fehler",
            description: "Fehler beim Hochladen des Fotos",
            variant: "destructive"
          });
          return;
        }
      } else if (photoPreview) {
        photoUrl = photoPreview;
      }

      if (analysisMode === 'kai' && textToAnalyze.length > 50) {
        // Use Kai's advanced analysis
        const kaiAnalysis = await requestKaiAnalysis(textToAnalyze);
        
        if (kaiAnalysis) {
          await saveJournalEntry({
            raw_text: textToAnalyze,
            mood_score: kaiAnalysis.mood_score || 0,
            sentiment_tag: kaiAnalysis.sentiment_tag || 'neutral',
            gratitude_items: kaiAnalysis.gratitude_items || [],
            ai_summary_md: kaiAnalysis.ai_summary_md,
            kai_insight: kaiAnalysis.kai_insight,
            transformation_themes: kaiAnalysis.transformation_themes,
            energy_level: kaiAnalysis.energy_level,
            stress_indicators: kaiAnalysis.stress_indicators,
            prompt_used: currentPrompt?.question,
            photo_url: photoUrl || undefined
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

  // Check if user has entries for current date
  const currentDateStr = currentDate.toISOString().split('T')[0];
  const hasEntriesForDate = recentEntries.some(entry => 
    new Date(entry.date).toISOString().split('T')[0] === currentDateStr
  );
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    if (transcribedText && isCollapsed) {
      setIsCollapsed(false);
    }
  }, [transcribedText, isCollapsed]);
  
  const todayEntries = recentEntries.filter(entry => 
    new Date(entry.date).toISOString().split('T')[0] === currentDateStr
  );
  const avgMoodScore = todayEntries.length > 0 
    ? todayEntries.reduce((sum, entry) => sum + (entry.mood_score || 0), 0) / todayEntries.length
    : 0;
  const moodProgress = ((avgMoodScore + 5) / 10) * 100; // Convert -5 to +5 scale to 0-100%

  // Smart chip actions
  const smartChips = [
    { label: "Dankbarkeit", action: () => { setManualText("Heute bin ich dankbar für "); } },
    { label: "Reflektion", action: () => { setManualText("Heute habe ich gelernt, dass "); } },
    { label: "Ziele", action: () => { setManualText("Morgen möchte ich "); } }
  ];

  return (
    <Card className="p-4">
      <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between hover:bg-muted/50 rounded-md p-2 -m-2"
          >
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              <h2 className="text-base font-semibold">Mindset Journal</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  startRecording();
                }}
                disabled={isRecording || isVoiceLoading}
                title="Schnellaufnahme"
              >
                <Mic className="h-4 w-4" />
              </Button>
              <div className="text-muted-foreground hover:text-foreground">
                {!isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Collapsed summary when card is closed - CaloriesCard style */}
        {isCollapsed && hasEntriesForDate && (
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex items-center gap-3">
              <div className="font-medium">
                {todayEntries.length} Einträge
              </div>
              <Progress value={moodProgress} className="h-2 w-24 md:w-32" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                Stimmung: {avgMoodScore > 0 ? '😊 Positiv' : avgMoodScore < 0 ? '😔 Negativ' : '😐 Neutral'}
              </span>
              <Badge variant="outline" className={getMoodBadgeColor(avgMoodScore)}>
                {avgMoodScore.toFixed(1)}
              </Badge>
            </div>
          </div>
        )}

        {/* Smart Chips & Journal Indicator */}
        <div className="mt-3 flex flex-wrap gap-3">
          {smartChips.map((chip, index) => (
            <SmartChip
              key={index}
              variant="mindset"
              size="default"
              icon={<Brain className="h-3.5 w-3.5" />}
              onClick={() => { 
                chip.action(); 
                if (isCollapsed) setIsCollapsed(false);
              }}
            >
              {chip.label}
            </SmartChip>
          ))}
          {hasEntriesForDate && (
            <SmartChip
              variant="timing"
              size="default"
              icon={<FileText className="h-3.5 w-3.5" />}
              onClick={() => setShowDetailWidget(true)}
            >
              Einträge anzeigen
            </SmartChip>
          )}
        </div>

        <CollapsibleContent>
          <div className="space-y-4">
            {/* Header numbers - CaloriesCard style grid */}
            {hasEntriesForDate && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Einträge heute</div>
                  <div className="text-lg font-medium">{todayEntries.length} Gedanken</div>
                </div>
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Durchschnittliche Stimmung</div>
                  <div className="text-lg font-medium flex items-center gap-2">
                    {avgMoodScore > 0 ? '😊' : avgMoodScore < 0 ? '😔' : '😐'}
                    <span>{avgMoodScore.toFixed(1)}/10</span>
                  </div>
                </div>
              </div>
            )}

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
                        <span>Audio für Journal gespeichert</span>
                        <Badge variant="outline" className="text-xs border-success/30 text-success">
                          Permanent
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

            {/* Entries list toggle - CaloriesCard style */}
            {hasEntriesForDate && (
              <div className="mt-4">
                <button
                  type="button"
                  className="w-full flex items-center justify-between rounded-md border bg-card px-3 py-2 hover:bg-muted/50"
                  onClick={() => setShowDetailWidget(!showDetailWidget)}
                >
                  <div className="text-sm font-medium">Einträge anzeigen</div>
                  {showDetailWidget ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showDetailWidget && (
                  <div className="mt-3 space-y-2">
                    {todayEntries.length === 0 ? (
                      <div className="text-sm text-muted-foreground">Keine Einträge für heute.</div>
                    ) : (
                      todayEntries.slice(0, 3).map((entry, index) => (
                        <div key={index} className="border rounded-md p-3">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className={getMoodBadgeColor(entry.mood_score || 0)}>
                              {entry.sentiment_tag || 'neutral'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(entry.date).toLocaleTimeString('de-DE', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                          <p className="text-sm">
                            {entry.raw_text?.substring(0, 100)}{entry.raw_text?.length > 100 ? '...' : ''}
                          </p>
                          {entry.gratitude_items && entry.gratitude_items.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs font-medium text-muted-foreground mb-1">Dankbarkeit:</div>
                              <div className="flex flex-wrap gap-1">
                                {entry.gratitude_items.slice(0, 2).map((item: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    <Heart className="h-3 w-3 mr-1" />
                                    {item}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Detail Widget Modal - Remove for now to fix build error */}
    </Card>
  );
};