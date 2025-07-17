import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown,
  Target,
  Lightbulb,
  Heart,
  Award
} from "lucide-react";

interface DailyGoal {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface CoachProps {
  onClose: () => void;
  dailyTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  dailyGoal: DailyGoal;
  mealsCount: number;
}

interface CoachMessage {
  id: string;
  type: 'analysis' | 'tip' | 'motivation' | 'warning';
  message: string;
  timestamp: Date;
}

const Coach = ({ onClose, dailyTotals, dailyGoal, mealsCount }: CoachProps) => {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dailyScore, setDailyScore] = useState<number | null>(null);
  const [summary, setSummary] = useState<string>('');

  const generateCoachAnalysis = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://gzczjscctgyxjyodhnhk.functions.supabase.co/coach-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dailyTotals,
          dailyGoal,
          mealsCount,
          userData: {} // Hier können später Nutzerdaten hinzugefügt werden
        }),
      });

      if (!response.ok) {
        throw new Error('Fehler bei der Coach-Analyse');
      }

      const data = await response.json();
      
      const newMessages: CoachMessage[] = data.messages.map((msg: any, index: number) => ({
        id: (index + 1).toString(),
        type: msg.type,
        message: msg.message,
        timestamp: new Date()
      }));

      setMessages(newMessages);
      setDailyScore(data.dailyScore);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error generating coach analysis:', error);
      
      // Fallback zu statischen Nachrichten
      const fallbackMessages: CoachMessage[] = [
        {
          id: '1',
          type: 'motivation',
          message: 'Du machst das großartig! Bleib dran und sei stolz auf deine Fortschritte.',
          timestamp: new Date()
        },
        {
          id: '2',
          type: 'tip',
          message: 'Versuche regelmäßig zu essen und achte auf eine ausgewogene Ernährung.',
          timestamp: new Date()
        }
      ];
      
      setMessages(fallbackMessages);
      setDailyScore(7);
      setSummary('Deine Ernährung ist auf einem guten Weg. Weiter so!');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    generateCoachAnalysis();
  }, [dailyTotals, dailyGoal, mealsCount]);

  const getMessageIcon = (type: CoachMessage['type']) => {
    switch (type) {
      case 'warning':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      case 'tip':
        return <Lightbulb className="h-4 w-4 text-warning" />;
      case 'motivation':
        return <Heart className="h-4 w-4 text-success" />;
      case 'analysis':
        return <TrendingUp className="h-4 w-4 text-primary" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getMessageBadge = (type: CoachMessage['type']) => {
    switch (type) {
      case 'warning':
        return <Badge variant="destructive">Warnung</Badge>;
      case 'tip':
        return <Badge variant="outline">Tipp</Badge>;
      case 'motivation':
        return <Badge variant="default">Motivation</Badge>;
      case 'analysis':
        return <Badge variant="secondary">Analyse</Badge>;
      default:
        return <Badge variant="secondary">Info</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-card to-card/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-primary to-primary-glow p-2 rounded-lg">
              <MessageCircle className="h-5 w-5 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-bold">Persönlicher Coach</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
        </div>

        {/* Coach Avatar */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-gradient-to-r from-primary/10 to-primary-glow/10 rounded-xl">
          <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary-glow rounded-full flex items-center justify-center">
            <Award className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">Dein KaloCoach</h3>
            <p className="text-sm text-muted-foreground">
              Ich analysiere deine Ernährung und helfe dir dabei, deine Ziele zu erreichen.
            </p>
          </div>
        </div>

        {/* Tagesbewertung */}
        <div className="mb-6 p-4 bg-muted/30 rounded-xl">
          <h3 className="font-semibold mb-2">Heutige Bewertung</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {Math.round((dailyTotals.calories / dailyGoal) * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Zielerfüllung</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">
                {mealsCount}
              </div>
              <div className="text-sm text-muted-foreground">Mahlzeiten</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">
                {dailyScore || '-'}/10
              </div>
              <div className="text-sm text-muted-foreground">Coach Score</div>
            </div>
          </div>
          {summary && (
            <div className="mt-4 p-3 bg-primary/5 rounded-lg">
              <p className="text-sm text-muted-foreground">{summary}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Coach Nachrichten */}
      <div className="space-y-4">
        <h3 className="font-semibold">Coaching-Nachrichten</h3>
        
        {isLoading ? (
          <Card className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Dein Coach analysiert deine Ernährung...</p>
          </Card>
        ) : (
          messages.map((message) => (
            <Card key={message.id} className="p-4 border-l-4 border-l-primary">
              <div className="flex items-start gap-3">
                {getMessageIcon(message.type)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getMessageBadge(message.type)}
                    <span className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString('de-DE', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{message.message}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Aktualisieren Button */}
      <Button 
        variant="outline" 
        onClick={generateCoachAnalysis}
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
            Analysiere...
          </>
        ) : (
          'Neue Analyse erstellen'
        )}
      </Button>
    </div>
  );
};

export default Coach;