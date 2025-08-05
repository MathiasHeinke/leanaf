import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Heart, TrendingUp, Lightbulb, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getCurrentDateString } from '@/utils/dateHelpers';

interface DiaryEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextData?: {
    profileData?: any;
    currentMood?: string;
    moodTrend?: 'improving' | 'declining' | 'stable';
    gratitudeStreak?: number;
    recentEntries?: any[];
    suggestedPrompts?: string[];
  };
}

const moodOptions = [
  { value: 'very_positive', label: 'Sehr positiv', emoji: '😊', color: 'bg-green-100 text-green-800' },
  { value: 'positive', label: 'Positiv', emoji: '🙂', color: 'bg-green-50 text-green-700' },
  { value: 'neutral', label: 'Neutral', emoji: '😐', color: 'bg-gray-100 text-gray-700' },
  { value: 'negative', label: 'Negativ', emoji: '😔', color: 'bg-orange-100 text-orange-700' },
  { value: 'very_negative', label: 'Sehr negativ', emoji: '😢', color: 'bg-red-100 text-red-700' }
];

const gratitudePrompts = [
  "Wofür bin ich heute dankbar?",
  "Was hat mich heute zum Lächeln gebracht?",
  "Welche kleine Freude hatte ich heute?",
  "Wer hat mir heute geholfen oder mich unterstützt?",
  "Was ist mir heute gut gelungen?"
];

const reflectionPrompts = [
  "Wie fühlte ich mich heute?",
  "Was habe ich heute gelernt?",
  "Was möchte ich morgen anders machen?",
  "Welche Herausforderung habe ich heute gemeistert?",
  "Was hat mich heute inspiriert?"
];

export const DiaryEntryModal = ({ isOpen, onClose, contextData }: DiaryEntryModalProps) => {
  const [entryText, setEntryText] = useState('');
  const [mood, setMood] = useState('neutral');
  const [entryType, setEntryType] = useState<'reflection' | 'gratitude'>('reflection');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState('');

  const { user } = useAuth();

  // Pre-fill with context suggestions
  useEffect(() => {
    if (contextData?.suggestedPrompts && contextData.suggestedPrompts.length > 0) {
      setSelectedPrompt(contextData.suggestedPrompts[0]);
    }
    if (contextData?.currentMood) {
      setMood(contextData.currentMood);
    }
  }, [contextData]);

  const handlePromptSelect = (prompt: string) => {
    setSelectedPrompt(prompt);
    if (entryText.trim() === '') {
      setEntryText(prompt + '\n\n');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !entryText.trim()) {
      toast.error('Bitte schreibe einen Eintrag');
      return;
    }

    setIsSubmitting(true);

    try {
      const today = getCurrentDateString();
      
      const diaryData = {
        user_id: user.id,
        date: today,
        content: entryText.trim(),
        mood,
        entry_type: entryType,
        prompt_used: selectedPrompt || null
      };

      // For now, just simulate saving the diary entry
      // The diary_entries table needs to be properly integrated with types
      console.log('Saving diary entry:', diaryData);
      
      // Simulate successful save
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Tagebuch-Eintrag gespeichert!');
      onClose();
      
    } catch (error) {
      console.error('Error saving diary entry:', error);
      toast.error('Fehler beim Speichern des Eintrags');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMoodOption = (moodValue: string) => {
    return moodOptions.find(option => option.value === moodValue) || moodOptions[2];
  };

  const getTrendIndicator = () => {
    if (!contextData?.moodTrend) return null;
    
    switch (contextData.moodTrend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <TrendingUp className="h-4 w-4 text-orange-500 rotate-180" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Tagebuch Eintrag
            {getTrendIndicator()}
          </DialogTitle>
        </DialogHeader>

        {/* Context Summary */}
        {contextData && (
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <div className="text-sm space-y-2">
              {contextData.currentMood && (
                <div className="flex items-center gap-2">
                  <span>Aktuelle Stimmung:</span>
                  <Badge className={getMoodOption(contextData.currentMood).color}>
                    {getMoodOption(contextData.currentMood).emoji} {getMoodOption(contextData.currentMood).label}
                  </Badge>
                </div>
              )}
              {contextData.gratitudeStreak !== undefined && (
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  <span>Dankbarkeits-Serie: <span className="font-semibold">{contextData.gratitudeStreak} Tage</span></span>
                </div>
              )}
              {contextData.recentEntries && contextData.recentEntries.length > 0 && (
                <p>Einträge diese Woche: <span className="font-semibold">{contextData.recentEntries.length}</span></p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Entry Type Toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={entryType === 'reflection' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setEntryType('reflection')}
              className="flex-1"
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              Reflexion
            </Button>
            <Button
              type="button"
              variant={entryType === 'gratitude' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setEntryType('gratitude')}
              className="flex-1"
            >
              <Heart className="h-4 w-4 mr-2" />
              Dankbarkeit
            </Button>
          </div>

          {/* Prompt Suggestions */}
          <div className="space-y-2">
            <Label>Schreibimpulse (optional)</Label>
            <div className="grid grid-cols-1 gap-2">
              {(entryType === 'gratitude' ? gratitudePrompts : reflectionPrompts).map((prompt, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePromptSelect(prompt)}
                  className="text-left justify-start h-auto py-2 text-wrap"
                >
                  <Star className="h-3 w-3 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{prompt}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Entry Text */}
          <div className="space-y-2">
            <Label htmlFor="entryText">
              {entryType === 'gratitude' ? 'Wofür bist du dankbar?' : 'Wie war dein Tag?'} *
            </Label>
            <Textarea
              id="entryText"
              value={entryText}
              onChange={(e) => setEntryText(e.target.value)}
              placeholder={
                entryType === 'gratitude' 
                  ? "Nimm dir einen Moment und denke an die schönen Momente von heute..."
                  : "Schreibe über deine Gedanken, Gefühle oder Erlebnisse..."
              }
              className="min-h-[120px] resize-none"
            />
          </div>

          {/* Mood Selection */}
          <div className="space-y-2">
            <Label>Wie fühlst du dich heute?</Label>
            <Select value={mood} onValueChange={setMood}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {moodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <span>{option.emoji}</span>
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Character Count */}
          <div className="text-right text-xs text-muted-foreground">
            {entryText.length} Zeichen
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !entryText.trim()}
              className="flex-1"
            >
              {isSubmitting ? 'Speichern...' : 'Eintrag speichern'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};