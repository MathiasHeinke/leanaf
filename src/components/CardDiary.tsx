import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CardDiaryProps {
  payload: {
    raw_text: string;
    mood_score: number;
    sentiment_tag: string;
    gratitude_items?: string[];
    excerpt: string;
    date: string;
    actions?: Array<{
      type: string;
      label: string;
      data: any;
    }>;
  };
}

export const CardDiary = ({ payload }: CardDiaryProps) => {
  const { toast } = useToast();

  const getMoodEmoji = (score: number) => {
    if (score >= 3) return '😊';
    if (score >= 1) return '🙂';
    if (score === 0) return '😐';
    if (score >= -2) return '😔';
    return '😢';
  };

  const getMoodColor = (tag: string) => {
    switch (tag) {
      case 'positive': return 'bg-success text-success-foreground';
      case 'negative': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleSaveDiary = async () => {
    try {
      const action = payload.actions?.find(a => a.type === 'save_diary');
      if (!action) return;

      const { error } = await supabase
        .from('journal_entries')
        .upsert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          date: action.data.date,
          raw_text: action.data.raw_text,
          mood_score: action.data.mood_score,
          sentiment_tag: action.data.sentiment_tag,
          gratitude_items: action.data.gratitude_items || []
        });

      if (error) throw error;

      toast({
        title: "Tagebuch gespeichert",
        description: "Dein Eintrag wurde erfolgreich gespeichert ✨"
      });
    } catch (error) {
      console.error('Error saving diary:', error);
      toast({
        title: "Fehler",
        description: "Eintrag konnte nicht gespeichert werden",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <BookOpen className="h-4 w-4" />
          Tagebuch-Eintrag
          <Badge className={getMoodColor(payload.sentiment_tag)}>
            {getMoodEmoji(payload.mood_score)} {payload.sentiment_tag}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{payload.excerpt}</p>
        
        {payload.gratitude_items && payload.gratitude_items.length > 0 && (
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-accent" />
            <div className="flex flex-wrap gap-1">
              {payload.gratitude_items.map((item, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {payload.actions && (
          <div className="flex gap-2 pt-2">
            {payload.actions.map((action, index) => (
              <Button
                key={index}
                onClick={handleSaveDiary}
                size="sm"
                className="flex-1"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};