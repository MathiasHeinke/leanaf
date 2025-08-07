import React, { useState, useEffect } from 'react';
import { Brain, Mic, MicOff, Send, RefreshCw, Camera, Clock, TrendingUp, Sparkles, Heart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CollapsibleQuickInput } from '@/components/CollapsibleQuickInput';
import { PhotoUpload } from '@/components/PhotoUpload';
import { VoiceVisualizer } from '@/components/mindset-journal/VoiceVisualizer';
import { useEnhancedMindsetJournal } from '@/hooks/useEnhancedMindsetJournal';
import { useEnhancedVoiceRecording } from '@/hooks/useEnhancedVoiceRecording';
import { cn } from '@/lib/utils';

interface QuickMindsetInputProps {
  onMindsetAdded?: () => void;
}

export function QuickMindsetInput({ onMindsetAdded }: QuickMindsetInputProps) {
  const [manualText, setManualText] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);

  const {
    currentPrompt,
    todaysEntries,
    recentEntries = [],
    isLoading = false,
    isAnalyzing = false,
    lastAnalysis,
    saveJournalEntry,
    getTodaysWellnessSummary,
    getFormattedEntryTime,
    entryCount = 0
  } = useEnhancedMindsetJournal();

  const {
    isRecording = false,
    isProcessing = false,
    transcribedText = '',
    audioLevel = 0,
    startRecording = async () => {},
    stopRecording = async () => {},
    clearTranscription = () => {}
  } = useEnhancedVoiceRecording();

  // Auto-focus textarea after transcription
  useEffect(() => {
    if (transcribedText && !manualText) {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(transcribedText.length, transcribedText.length);
      }
    }
  }, [transcribedText, manualText]);

  const getCurrentTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'Morgen';
    if (hour >= 12 && hour < 18) return 'Mittag';
    return 'Abend';
  };

  const handleAnalyzeAndSave = async () => {
    const textToAnalyze = transcribedText || manualText;
    if (!textToAnalyze.trim()) return;

    try {
      await saveJournalEntry(textToAnalyze, selectedPhoto || undefined);
      
      // Clear inputs
      setManualText('');
      setSelectedPhoto(null);
      clearTranscription();
      
      onMindsetAdded?.();
    } catch (error) {
      console.error('Error saving mindset entry:', error);
    }
  };

  const getMoodBadgeColor = (score: number) => {
    if (score >= 70) return 'bg-success/20 text-success border-success/30';
    if (score >= 50) return 'bg-primary/20 text-primary border-primary/30';
    if (score >= 30) return 'bg-muted text-muted-foreground border-muted';
    if (score >= 20) return 'bg-warning/20 text-warning border-warning/30';
    return 'bg-destructive/20 text-destructive border-destructive/30';
  };

  // Get wellness summary for today
  const wellnessSummary = getTodaysWellnessSummary();

  return (
    <CollapsibleQuickInput
      title="Mindset Journal"
      icon={<Brain className="h-5 w-5" />}
      theme="violet"
      isCompleted={entryCount > 0}
      completedText={entryCount > 0 ? `${entryCount} Einträge heute` : undefined}
      defaultOpen={entryCount === 0}
    >
      {/* Smart Prompt Card - Elegant Design */}
      <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <span>Mindset Journal</span>
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {getCurrentTimeOfDay()}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              {wellnessSummary && (
                <Badge variant="secondary" className="text-xs px-2 py-0 bg-primary/10 text-primary">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {wellnessSummary.averageWellnessScore}/100
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Prompt */}
          {currentPrompt && (
            <div className="p-3 rounded-lg bg-background/50 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">
                  {entryCount + 1}. Eintrag
                </Badge>
              </div>
              <p className="text-sm font-medium text-foreground mb-2">
                {currentPrompt.question_text}
              </p>
              {currentPrompt.follow_up_text && (
                <p className="text-xs text-muted-foreground">
                  💡 {currentPrompt.follow_up_text}
                </p>
              )}
            </div>
          )}

          {/* Input Methods */}
          <div className="space-y-3">
            {/* Voice Input with Status */}
            <div className="space-y-2">
              <Button
                variant={isRecording ? "destructive" : "secondary"}
                size="sm"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className="w-full relative"
              >
                {isRecording ? (
                  <>
                    <MicOff className="h-4 w-4 mr-2" />
                    Aufnahme stoppen
                  </>
                ) : isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Verarbeitung...
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Voice Input
                  </>
                )}
              </Button>

              {/* Voice Visualizer */}
              {(isRecording || audioLevel > 0) && (
                <VoiceVisualizer audioLevel={audioLevel} isRecording={isRecording} />
              )}

              {/* Processing Status */}
              {isProcessing && (
                <div className="text-xs text-center text-muted-foreground">
                  Text wird transkribiert...
                </div>
              )}
            </div>

            {/* Photo Upload - Compact */}
            <PhotoUpload
              onPhotoSelect={setSelectedPhoto}
              onPhotoRemove={() => setSelectedPhoto(null)}
              selectedPhoto={selectedPhoto}
            />

            {/* Text Input - Shows transcribed text automatically */}
            <div className="relative">
              <Textarea
                placeholder="Oder schreibe deine Gedanken hier..."
                value={transcribedText || manualText}
                onChange={(e) => setManualText(e.target.value)}
                className="min-h-[80px] resize-none"
                disabled={isRecording || isProcessing}
              />
              
              {/* Clear transcribed text button */}
              {transcribedText && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearTranscription}
                  className="absolute top-2 right-2 h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Analysis Status */}
            {isAnalyzing && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  <span className="text-sm text-primary">KI analysiert deine Reflexion...</span>
                </div>
              </div>
            )}

            {/* Latest Analysis Results */}
            {lastAnalysis && (
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                  ✨ Analyse abgeschlossen
                </p>
                <div className="text-xs text-green-700 dark:text-green-300 space-y-1">
                  <div>Wellness-Score: {lastAnalysis.wellness_score}/100</div>
                  {lastAnalysis.insights.map((insight, index) => (
                    <div key={index}>• {insight}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Button */}
            <Button 
              onClick={handleAnalyzeAndSave}
              disabled={isLoading || isAnalyzing || isProcessing || (!(transcribedText || manualText.trim()))}
              size="sm"
              className="w-full"
            >
              {isLoading || isAnalyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {isAnalyzing ? 'KI analysiert...' : 'Speichere...'}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Speichern & KI-Analyse
                </>
              )}
            </Button>
          </div>

          {/* Recent Entries Timeline */}
          {todaysEntries && todaysEntries.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-muted-foreground">Heutige Einträge</h4>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                {todaysEntries.slice(0, 3).map((entry, index) => (
                  <div
                    key={entry.id || index}
                    className="flex items-center gap-1 p-2 rounded-md bg-background/30 border border-border/50"
                  >
                    <Badge
                      variant="outline"
                      className={cn("text-xs px-1", entry.wellness_score && getMoodBadgeColor(entry.wellness_score))}
                    >
                      {entry.wellness_score && entry.wellness_score >= 70 ? '😊' : 
                       entry.wellness_score && entry.wellness_score < 30 ? '😔' : '😐'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {getFormattedEntryTime(entry)}
                    </span>
                    {entry.photo_url && (
                      <Camera className="h-3 w-3 text-accent" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </CollapsibleQuickInput>
  );
}