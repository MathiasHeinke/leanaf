import React, { useState } from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PlusCard from '@/components/plus/PlusCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const MOOD_EMOJIS = [
  { emoji: '😊', label: 'Gut', value: 'good' },
  { emoji: '😐', label: 'Neutral', value: 'neutral' },
  { emoji: '😔', label: 'Schlecht', value: 'bad' }
];

export const MiniJournalQuick: React.FC = () => {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // TODO: Implement saving to diary_entries table
    console.log('Saving mood:', selectedMood, 'note:', note);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const hasContent = selectedMood || note.trim();

  return (
    <PlusCard>
      <CardHeader>
        <CardTitle className="text-lg">Wie fühlst du dich heute?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mood Selection */}
        <div className="grid grid-cols-3 gap-2">
          {MOOD_EMOJIS.map((mood) => (
            <Button
              key={mood.value}
              variant={selectedMood === mood.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedMood(mood.value)}
              className="flex flex-col gap-1 h-auto py-3"
            >
              <span className="text-2xl">{mood.emoji}</span>
              <span className="text-xs">{mood.label}</span>
            </Button>
          ))}
        </div>

        {/* Optional Note */}
        <div>
          <Textarea
            placeholder="Optional: Was beschäftigt dich heute? (Ein Satz reicht)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-[60px] resize-none"
            maxLength={200}
          />
          <div className="text-xs text-muted-foreground mt-1 text-right">
            {note.length}/200
          </div>
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave}
          disabled={!hasContent || saved}
          size="sm"
          className="w-full"
        >
          {saved ? '✓ Gespeichert' : 'Speichern'}
        </Button>
      </CardContent>
    </PlusCard>
  );
};