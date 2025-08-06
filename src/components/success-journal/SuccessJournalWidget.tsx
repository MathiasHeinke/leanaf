import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Brain, Mic, MicOff, Send, Sparkles, Clock, Trophy, Target, Star } from 'lucide-react';
import { useEnhancedVoiceRecording } from '@/hooks/useEnhancedVoiceRecording';
import { SuccessVisualizer } from './SuccessVisualizer';
import { AchievementsPanel } from './AchievementsPanel';
import { cn } from '@/lib/utils';

interface SuccessJournalWidgetProps {
  onKaiTransfer?: (text: string) => void;
  className?: string;
}

export const SuccessJournalWidget: React.FC<SuccessJournalWidgetProps> = ({ 
  onKaiTransfer, 
  className 
}) => {
  const [manualText, setManualText] = useState('');
  const [analysisMode, setAnalysisMode] = useState<'simple' | 'kai'>('simple');
  const [showAchievements, setShowAchievements] = useState(false);
  const [successEntries, setSuccessEntries] = useState<any[]>([]);

  const {
    isRecording,
    isProcessing,
    transcribedText,
    audioLevel,
    startRecording,
    stopRecording,
    clearTranscription
  } = useEnhancedVoiceRecording();

  const getCurrentTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'Morgen';
    if (hour >= 12 && hour < 18) return 'Mittag';
    return 'Abend';
  };

  const getSuccessPrompt = () => {
    const prompts = [
      {
        category: 'achievement',
        question: 'Was war heute dein größter Erfolg?',
        followUp: 'Denke auch an kleine Siege und Fortschritte.',
        expertise: 'Erfolg'
      },
      {
        category: 'progress',
        question: 'Welchen Fortschritt hast du heute gemacht?',
        followUp: 'Jeder Schritt zählt, egal wie klein.',
        expertise: 'Fortschritt'
      },
      {
        category: 'learning',
        question: 'Was hast du heute Neues gelernt?',
        followUp: 'Neue Erkenntnisse sind auch Erfolge.',
        expertise: 'Lernen'
      },
      {
        category: 'challenge',
        question: 'Welche Herausforderung hast du heute gemeistert?',
        followUp: 'Überwundene Hindernisse zeigen deine Stärke.',
        expertise: 'Mut'
      }
    ];
    
    return prompts[Math.floor(Math.random() * prompts.length)];
  };

  const [currentPrompt] = useState(getSuccessPrompt());

  const handleAnalyzeAndSave = async () => {
    const textToAnalyze = transcribedText || manualText;
    if (!textToAnalyze.trim()) return;

    // Simple success analysis
    const words = textToAnalyze.toLowerCase();
    const successWords = ['geschafft', 'erfolgreich', 'stolz', 'gelungen', 'erreicht', 'gewonnen'];
    const learningWords = ['gelernt', 'entdeckt', 'verstanden', 'erkannt', 'entwickelt'];
    
    const successCount = successWords.filter(word => words.includes(word)).length;
    const learningCount = learningWords.filter(word => words.includes(word)).length;
    
    let successScore = Math.min(5, successCount + learningCount);
    if (successScore === 0) successScore = 1; // Jeden Eintrag als Erfolg werten

    const newEntry = {
      id: Date.now(),
      text: textToAnalyze,
      score: successScore,
      category: currentPrompt.category,
      date: new Date().toISOString(),
      prompt: currentPrompt.question
    };

    setSuccessEntries(prev => [newEntry, ...prev.slice(0, 4)]);
    
    // Clear inputs
    setManualText('');
    clearTranscription();
  };

  const handleTransferToKai = () => {
    const textToTransfer = transcribedText || manualText;
    if (textToTransfer.trim() && onKaiTransfer) {
      onKaiTransfer(`Analysiere bitte diesen Erfolg für mich: "${textToTransfer}"`);
      setManualText('');
      clearTranscription();
    }
  };

  const getSuccessBadgeColor = (score: number) => {
    if (score >= 4) return 'bg-success/20 text-success border-success/30';
    if (score >= 3) return 'bg-primary/20 text-primary border-primary/30';
    if (score >= 2) return 'bg-warning/20 text-warning border-warning/30';
    return 'bg-muted text-muted-foreground border-muted';
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Success Prompt Card */}
      <Card className="border-success/20 bg-gradient-to-br from-background to-success/5">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-success" />
              <span>Erfolgsjournal</span>
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {getCurrentTimeOfDay()}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
              className="h-6 px-2 text-xs"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Neue Frage
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Prompt */}
          <div className="p-3 rounded-lg bg-background/50 border border-success/10">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs bg-success/20 text-success">
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

          {/* Input Methods */}
          <div className="space-y-3">
            {/* Voice Input */}
            <div className="flex items-center gap-2">
              <Button
                variant={isRecording ? "destructive" : "default"}
                size="sm"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className="flex-1 relative z-10 cursor-pointer bg-success hover:bg-success/80"
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
              <SuccessVisualizer audioLevel={audioLevel} isRecording={isRecording} />
            )}

            {/* Text Input */}
            <Textarea
              placeholder="Oder schreibe deinen Erfolg hier..."
              value={transcribedText || manualText}
              onChange={(e) => setManualText(e.target.value)}
              className="min-h-[80px] resize-none"
              disabled={isRecording || isProcessing}
            />

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleAnalyzeAndSave}
                disabled={!(transcribedText || manualText.trim()) || isProcessing}
                size="sm"
                className="flex-1 bg-success hover:bg-success/80"
              >
                <Send className="h-4 w-4 mr-2" />
                {analysisMode === 'kai' ? 'Kai Analyse & Speichern' : 'Erfolg speichern'}
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

          {/* Recent Success Entries */}
          {successEntries.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-muted-foreground">Letzte Erfolge</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAchievements(!showAchievements)}
                  className="h-6 px-2 text-xs"
                >
                  <Trophy className="h-3 w-3 mr-1" />
                  Erfolge {showAchievements ? '▲' : '▼'}
                </Button>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                {successEntries.slice(0, 3).map((entry, index) => (
                  <div
                    key={entry.id || index}
                    className="flex items-center gap-1 p-2 rounded-md bg-background/30 border border-border/50"
                  >
                    <Badge
                      variant="outline"
                      className={cn("text-xs px-1", getSuccessBadgeColor(entry.score))}
                    >
                      {Array(entry.score).fill('⭐').join('')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.date).toLocaleDateString('de-DE', { 
                        day: '2-digit', 
                        month: '2-digit' 
                      })}
                    </span>
                    <Trophy className="h-3 w-3 text-success" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Achievements Panel */}
      {showAchievements && successEntries.length > 0 && (
        <AchievementsPanel entries={successEntries} />
      )}
    </div>
  );
};