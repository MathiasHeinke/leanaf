import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, BookOpen, Target, Brain, Zap, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CardDiaryProps {
  payload: {
    raw_text: string;
    mood_score: number;
    sentiment_tag: string;
    gratitude_items?: string[];
    manifestation_items?: string[];
    energy_level?: number;
    stress_indicators?: string[];
    kai_insight?: string;
    transformation_themes?: string[];
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
      const action = payload.actions?.find(a => a.type === 'save_diary' || a.type === 'save_enhanced_diary');
      if (!action) return;

      const entryData = {
        user_id: (await supabase.auth.getUser()).data.user?.id,
        date: action.data.date,
        raw_text: action.data.raw_text,
        mood_score: action.data.mood_score,
        sentiment_tag: action.data.sentiment_tag,
        gratitude_items: action.data.gratitude_items || [],
        // Enhanced fields
        energy_level: action.data.energy_level,
        stress_indicators: action.data.stress_indicators || [],
        manifestation_items: action.data.manifestation_items || [],
        kai_insight: action.data.kai_insight,
        transformation_themes: action.data.transformation_themes || [],
        quadrant_analysis: action.data.quadrant_analysis || {},
        prompt_used: action.data.prompt_used
      };

      const { error } = await supabase
        .from('journal_entries')
        .upsert(entryData);

      if (error) throw error;

      toast({
        title: "Tagebuch gespeichert ✨",
        description: action.data.kai_insight 
          ? "Dein Eintrag wurde mit Kai's Analyse gespeichert"
          : "Dein Eintrag wurde erfolgreich gespeichert"
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
        
        {/* Enhanced Content Sections */}
        <div className="space-y-3">
          {/* Gratitude Items */}
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

          {/* Manifestation Items */}
          {payload.manifestation_items && payload.manifestation_items.length > 0 && (
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <div className="flex flex-wrap gap-1">
                {payload.manifestation_items.map((item, index) => (
                  <Badge key={index} variant="outline" className="text-xs border-primary/30">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Energy & Stress Indicators */}
          <div className="flex items-center gap-4 text-xs">
            {payload.energy_level && (
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-warning" />
                <span className="text-muted-foreground">Energie: {payload.energy_level}/10</span>
              </div>
            )}
            {payload.stress_indicators && payload.stress_indicators.length > 0 && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-destructive" />
                <span className="text-muted-foreground">{payload.stress_indicators.length} Stress-Signale</span>
              </div>
            )}
          </div>

          {/* Kai's Insight */}
          {payload.kai_insight && (
            <div className="p-2 rounded-md bg-primary/10 border border-primary/20">
              <div className="flex items-start gap-2">
                <Brain className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-foreground">{payload.kai_insight}</p>
              </div>
            </div>
          )}
        </div>

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