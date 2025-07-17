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

interface CoachProps {
  onClose: () => void;
  dailyTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  dailyGoal: number;
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

  const generateCoachAnalysis = () => {
    const newMessages: CoachMessage[] = [];
    const caloriePercentage = (dailyTotals.calories / dailyGoal) * 100;
    
    // Kalorien-Analyse
    if (caloriePercentage > 110) {
      newMessages.push({
        id: '1',
        type: 'warning',
        message: `Du hast heute ${Math.round(caloriePercentage)}% deines Kalorienziels erreicht. Das ist etwas über dem Ziel. Versuche morgen etwas bewusster zu essen!`,
        timestamp: new Date()
      });
    } else if (caloriePercentage < 80) {
      newMessages.push({
        id: '2',
        type: 'tip',
        message: `Du hast heute erst ${Math.round(caloriePercentage)}% deines Kalorienziels erreicht. Vergiss nicht, ausreichend zu essen für deine Gesundheit!`,
        timestamp: new Date()
      });
    } else {
      newMessages.push({
        id: '3',
        type: 'motivation',
        message: `Perfekt! Du hast heute ${Math.round(caloriePercentage)}% deines Kalorienziels erreicht. Das ist genau im grünen Bereich! 🎯`,
        timestamp: new Date()
      });
    }

    // Protein-Analyse
    if (dailyTotals.protein < 0.8 * 70) { // Annahme: 70kg Körpergewicht
      newMessages.push({
        id: '4',
        type: 'tip',
        message: `Dein Proteinanteil ist heute etwas niedrig (${dailyTotals.protein}g). Versuche mehr proteinreiche Lebensmittel wie Quark, Eier oder Hülsenfrüchte zu essen.`,
        timestamp: new Date()
      });
    } else {
      newMessages.push({
        id: '5',
        type: 'motivation',
        message: `Sehr gut! Du hast heute ${dailyTotals.protein}g Protein zu dir genommen. Das unterstützt deine Muskelgesundheit optimal! 💪`,
        timestamp: new Date()
      });
    }

    // Mahlzeiten-Analyse
    if (mealsCount < 3) {
      newMessages.push({
        id: '6',
        type: 'tip',
        message: `Du hast heute nur ${mealsCount} Mahlzeit(en) erfasst. Regelmäßige Mahlzeiten helfen dabei, den Blutzucker stabil zu halten.`,
        timestamp: new Date()
      });
    } else {
      newMessages.push({
        id: '7',
        type: 'motivation',
        message: `Toll! Du hast heute ${mealsCount} Mahlzeiten erfasst. Das zeigt, dass du bewusst auf deine Ernährung achtest! 🌟`,
        timestamp: new Date()
      });
    }

    // Tägliche Motivation
    const motivationalTips = [
      "Denke daran: Kleine, nachhaltige Veränderungen führen zu großen Erfolgen!",
      "Jeder Tag ist eine neue Chance, gesunde Entscheidungen zu treffen.",
      "Du machst das großartig! Bleib dran und sei stolz auf deine Fortschritte.",
      "Gesunde Ernährung ist ein Geschenk an dich selbst - heute und in Zukunft.",
      "Vergiss nicht: Es geht nicht um Perfektion, sondern um Fortschritt!"
    ];

    newMessages.push({
      id: '8',
      type: 'motivation',
      message: motivationalTips[Math.floor(Math.random() * motivationalTips.length)],
      timestamp: new Date()
    });

    setMessages(newMessages);
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
          <div className="grid grid-cols-2 gap-4">
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
          </div>
        </div>
      </Card>

      {/* Coach Nachrichten */}
      <div className="space-y-4">
        <h3 className="font-semibold">Coaching-Nachrichten</h3>
        
        {messages.map((message) => (
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
        ))}
      </div>

      {/* Aktualisieren Button */}
      <Button 
        variant="outline" 
        onClick={generateCoachAnalysis}
        className="w-full"
      >
        Neue Analyse erstellen
      </Button>
    </div>
  );
};

export default Coach;