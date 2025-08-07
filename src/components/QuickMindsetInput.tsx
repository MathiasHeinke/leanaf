import React, { useState } from 'react';
import { Brain, Mic, MicOff, Send, RefreshCw, Camera, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CollapsibleQuickInput } from '@/components/CollapsibleQuickInput';
import { PhotoUpload } from '@/components/PhotoUpload';
import { useEnhancedMindsetJournal } from '@/hooks/useEnhancedMindsetJournal';
import { useEnhancedVoiceRecording } from '@/hooks/useEnhancedVoiceRecording';

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
      <div className="space-y-4">
        {/* Smart Prompt with Entry Counter */}
        {currentPrompt && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-foreground">
                {currentPrompt.question_text}
              </p>
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {entryCount + 1}. Eintrag
              </Badge>
            </div>
            {currentPrompt.follow_up_text && (
              <p className="text-xs text-muted-foreground">
                {currentPrompt.follow_up_text}
              </p>
            )}
          </div>
        )}

        {/* Wellness Summary */}
        {wellnessSummary && (
          <div className="mb-4 p-2 bg-primary/5 rounded-lg border border-primary/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Heutiger Wellness-Score</span>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-primary" />
                <span className="text-sm font-medium text-primary">
                  {wellnessSummary.averageWellnessScore}/100
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Input Methods */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Button
                variant="outline"
                size="sm"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`w-full ${isRecording ? 'bg-destructive/10 border-destructive text-destructive' : ''}`}
              >
                {isRecording ? (
                  <>
                    <MicOff className="h-4 w-4 mr-2" />
                    Aufnahme beenden
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Sprechen
                  </>
                )}
              </Button>
              
              {/* Audio Level Visualizer */}
              {isRecording && (
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-destructive transition-all duration-100 ease-out"
                    style={{ width: `${Math.min(audioLevel * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Photo Upload */}
          <PhotoUpload
            onPhotoSelect={setSelectedPhoto}
            onPhotoRemove={() => setSelectedPhoto(null)}
            selectedPhoto={selectedPhoto}
          />

          {/* Transcribed or Manual Text */}
          <Textarea
            placeholder="Oder schreibe deine Gedanken hier..."
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            className="min-h-[100px] resize-none"
          />

          {transcribedText && (
            <div className="p-3 bg-muted/50 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">Aufgenommener Text:</p>
              <p className="text-sm">{transcribedText}</p>
            </div>
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
          disabled={isLoading || isAnalyzing || (!transcribedText && !manualText.trim())}
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

        {/* Today's Entries Preview */}
        {todaysEntries && todaysEntries.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium text-foreground mb-3">
              Heutige Einträge ({todaysEntries.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {todaysEntries.slice(0, 3).map((entry, index) => (
                <div key={entry.id || index} className="p-2 bg-muted/50 rounded text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-muted-foreground">
                      {getFormattedEntryTime(entry)}
                    </span>
                    {entry.wellness_score && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs px-2 py-0 bg-primary/10 text-primary"
                      >
                        {entry.wellness_score}/100
                      </Badge>
                    )}
                  </div>
                  <p className="text-foreground line-clamp-2">
                    {(entry.raw_text || '').length > 80 ? `${(entry.raw_text || '').substring(0, 80)}...` : (entry.raw_text || '')}
                  </p>
                  {entry.photo_url && (
                    <div className="mt-1 flex items-center gap-1 text-muted-foreground">
                      <Camera className="h-3 w-3" />
                      <span className="text-xs">Mit Foto</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </CollapsibleQuickInput>
  );
}