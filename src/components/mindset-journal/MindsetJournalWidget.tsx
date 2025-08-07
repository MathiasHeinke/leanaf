import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Brain, Mic, MicOff, Send, Sparkles, Clock, Heart, Target } from 'lucide-react';
import { useMindsetJournal } from '@/hooks/useMindsetJournal';
import { useEnhancedVoiceRecording } from '@/hooks/useEnhancedVoiceRecording';
import { VoiceVisualizer } from './VoiceVisualizer';
import { InsightsPanel } from './InsightsPanel';
import { cn } from '@/lib/utils';

interface MindsetJournalWidgetProps {
  onKaiTransfer?: (text: string) => void;
  className?: string;
}

export const MindsetJournalWidget: React.FC<MindsetJournalWidgetProps> = ({ 
  onKaiTransfer, 
  className 
}) => {
  const [manualText, setManualText] = useState('');
  const [analysisMode, setAnalysisMode] = useState<'simple' | 'kai'>('simple');
  const [showInsights, setShowInsights] = useState(false);

  const {
    currentPrompt,
    recentEntries = [],
    insights = [],
    isLoading,
    saveJournalEntry,
    requestKaiAnalysis,
    refreshPrompt
  } = useMindsetJournal() || {};

  const {
    isRecording = false,
    isProcessing = false,
    transcribedText = '',
    audioLevel = 0,
    hasPermission = false,
    startRecording = () => {},
    stopRecording = () => {},
    clearTranscription = () => {}
  } = useEnhancedVoiceRecording() || {};

  const getCurrentTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'Morgen';
    if (hour >= 12 && hour < 18) return 'Mittag';
    return 'Abend';
  };

  const handleAnalyzeAndSave = async () => {
    const textToAnalyze = transcribedText || manualText;
    if (!textToAnalyze.trim()) return;

    if (analysisMode === 'kai' && textToAnalyze.length > 50) {
      // Use Kai's advanced analysis
      const kaiAnalysis = await requestKaiAnalysis(textToAnalyze);
      
      if (kaiAnalysis) {
        // Parse Kai's structured response and save enhanced entry
        await saveJournalEntry({
          raw_text: textToAnalyze,
          mood_score: kaiAnalysis.mood_level || 0,
          sentiment_tag: kaiAnalysis.sentiment || 'neutral',
          gratitude_items: kaiAnalysis.gratitude_elements || [],
          highlight: kaiAnalysis.highlight,
          challenge: kaiAnalysis.challenge,
          prompt_used: currentPrompt?.question
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
        prompt_used: currentPrompt?.question
      });
    }

    // Clear inputs
    setManualText('');
    clearTranscription();
  };

  const handleTransferToKai = () => {
    const textToTransfer = transcribedText || manualText;
    if (textToTransfer.trim() && onKaiTransfer) {
      onKaiTransfer(`Analysiere bitte diesen Tagebuch-Eintrag für mich: "${textToTransfer}"`);
      setManualText('');
      clearTranscription();
    }
  };

  const getMoodBadgeColor = (score: number) => {
    if (score >= 3) return 'bg-success/20 text-success border-success/30';
    if (score >= 1) return 'bg-primary/20 text-primary border-primary/30';
    if (score === 0) return 'bg-muted text-muted-foreground border-muted';
    if (score >= -2) return 'bg-warning/20 text-warning border-warning/30';
    return 'bg-destructive/20 text-destructive border-destructive/30';
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Smart Prompt Card */}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshPrompt}
              className="h-6 px-2 text-xs"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Neue Frage
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Prompt */}
          {currentPrompt && (
            <div className="p-3 rounded-lg bg-background/50 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">
                  {currentPrompt.expertise}
                </Badge>
              </div>
              <p className="text-sm font-medium text-foreground mb-2">
                {currentPrompt.question}
              </p>
              {currentPrompt.followUp && (
                <p className="text-xs text-muted-foreground">
                  💡 {currentPrompt.followUp}
                </p>
              )}
            </div>
          )}

          {/* Input Methods */}
          <div className="space-y-3">
            {/* Voice Input */}
            <div className="flex items-center gap-2">
              <Button
                variant={isRecording ? "destructive" : "secondary"}
                size="sm"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className="flex-1 relative z-10 cursor-pointer"
                type="button"
              >
                {isRecording ? (
                  <>
                    <MicOff className="h-4 w-4 mr-2" />
                    Aufnahme stoppen
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Voice Input
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
              placeholder="Oder schreibe deine Gedanken hier..."
              value={transcribedText || manualText}
              onChange={(e) => setManualText(e.target.value)}
              className="min-h-[80px] resize-none"
              disabled={isRecording || isProcessing}
            />

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleAnalyzeAndSave}
                disabled={!(transcribedText || manualText.trim()) || isLoading || isProcessing}
                size="sm"
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-2" />
                {analysisMode === 'kai' ? 'Kai Analyse & Speichern' : 'Speichern'}
              </Button>
              
              {onKaiTransfer && (
                <Button
                  variant="outline"
                  onClick={handleTransferToKai}
                  disabled={!(transcribedText || manualText.trim())}
                  size="sm"
                >
                  → Kai Chat
                </Button>
              )}
            </div>
          </div>

          {/* Recent Entries Preview */}
          {recentEntries.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-muted-foreground">Letzte Einträge</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInsights(!showInsights)}
                  className="h-6 px-2 text-xs"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Insights {showInsights ? '▲' : '▼'}
                </Button>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                {recentEntries.slice(0, 3).map((entry, index) => (
                  <div
                    key={entry.id || index}
                    className="flex items-center gap-1 p-2 rounded-md bg-background/30 border border-border/50"
                  >
                    <Badge
                      variant="outline"
                      className={cn("text-xs px-1", getMoodBadgeColor(entry.mood_score))}
                    >
                      {entry.mood_score > 0 ? '😊' : entry.mood_score < 0 ? '😔' : '😐'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.date).toLocaleDateString('de-DE', { 
                        day: '2-digit', 
                        month: '2-digit' 
                      })}
                    </span>
                    {entry.gratitude_items.length > 0 && (
                      <Heart className="h-3 w-3 text-accent" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights Panel */}
      {showInsights && insights.length > 0 && (
        <InsightsPanel insights={insights} />
      )}
    </div>
  );
};