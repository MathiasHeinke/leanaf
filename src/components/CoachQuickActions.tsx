
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  TrendingUp, 
  Utensils,
  Dumbbell,
  Moon,
  Scale,
  Calendar,
  Lightbulb,
  Zap,
  Brain,
  Activity,
  BarChart3
} from "lucide-react";

interface CoachQuickActionsProps {
  userData: any;
  coachPersonality: string;
  onActionSelected: (action: string) => void;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon: any;
  category: 'analysis' | 'tips' | 'goals' | 'motivation';
  priority: 'high' | 'medium' | 'low';
}

export const CoachQuickActions = ({ userData, coachPersonality, onActionSelected }: CoachQuickActionsProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const quickActions: QuickAction[] = [
    // Analysis Actions
    {
      id: 'analyze-progress',
      title: 'Fortschritt analysieren',
      description: 'Detaillierte Analyse deiner letzten 7 Tage',
      prompt: 'Analysiere meinen Fortschritt der letzten 7 Tage. Zeige mir Trends bei Kalorien, Protein und Gewicht.',
      icon: TrendingUp,
      category: 'analysis',
      priority: 'high'
    },
    {
      id: 'nutrition-analysis',
      title: 'Ernährung bewerten',
      description: 'Bewerte deine aktuelle Ernährungsstrategie',
      prompt: 'Bewerte meine Ernährung der letzten Tage. Wo kann ich mich verbessern?',
      icon: Utensils,
      category: 'analysis',
      priority: 'high'
    },
    {
      id: 'calorie-balance',
      title: 'Kalorienbilanz prüfen',
      description: 'Überprüfe deine Kalorienbilanz und Zielerreichung',
      prompt: 'Wie ist meine Kalorienbilanz? Erreiche ich meine Ziele?',
      icon: Target,
      category: 'analysis',
      priority: 'medium'
    },

    // Tips Actions
    {
      id: 'meal-suggestions',
      title: 'Mahlzeiten-Vorschläge',
      description: 'Personalisierte Empfehlungen für deine nächsten Mahlzeiten',
      prompt: 'Schlage mir gesunde Mahlzeiten vor, die zu meinen Zielen passen.',
      icon: Lightbulb,
      category: 'tips',
      priority: 'medium'
    },
    {
      id: 'workout-tips',
      title: 'Trainings-Tipps',
      description: 'Optimiere dein Training für bessere Ergebnisse',
      prompt: 'Gib mir Tipps für mein nächstes Workout. Was sollte ich trainieren?',
      icon: Dumbbell,
      category: 'tips',
      priority: 'medium'
    },
    {
      id: 'habit-improvement',
      title: 'Gewohnheiten verbessern',
      description: 'Tipps für nachhaltige Lifestyle-Änderungen',
      prompt: 'Wie kann ich meine Gewohnheiten langfristig verbessern?',
      icon: Activity,
      category: 'tips',
      priority: 'low'
    },

    // Goals Actions
    {
      id: 'goal-adjustment',
      title: 'Ziele anpassen',
      description: 'Überprüfe und optimiere deine aktuellen Ziele',
      prompt: 'Sollte ich meine Ziele anpassen? Sind sie realistisch für mich?',
      icon: Target,
      category: 'goals',
      priority: 'high'
    },
    {
      id: 'weekly-planning',
      title: 'Wochenplanung',
      description: 'Plane deine nächste Woche strategisch',
      prompt: 'Hilf mir bei der Planung der nächsten Woche. Was sollte ich beachten?',
      icon: Calendar,
      category: 'goals',
      priority: 'medium'
    },

    // Motivation Actions
    {
      id: 'motivation-boost',
      title: 'Motivation tanken',
      description: 'Hole dir einen Motivationsschub vom Coach',
      prompt: 'Ich brauche Motivation! Erinnere mich an meine Fortschritte und Ziele.',
      icon: Zap,
      category: 'motivation',
      priority: 'low'
    },
    {
      id: 'celebrate-wins',
      title: 'Erfolge feiern',
      description: 'Lass uns deine Erfolge der letzten Zeit feiern',
      prompt: 'Welche Erfolge habe ich in letzter Zeit erzielt? Lass uns sie feiern!',
      icon: Brain,
      category: 'motivation',
      priority: 'low'
    }
  ];

  const categories = [
    { id: 'all', label: 'Alle', icon: BarChart3 },
    { id: 'analysis', label: 'Analysen', icon: TrendingUp },
    { id: 'tips', label: 'Tipps', icon: Lightbulb },
    { id: 'goals', label: 'Ziele', icon: Target },
    { id: 'motivation', label: 'Motivation', icon: Zap }
  ];

  const filteredActions = selectedCategory === 'all' 
    ? quickActions 
    : quickActions.filter(action => action.category === selectedCategory);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50 dark:bg-red-900/10';
      case 'medium': return 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10';
      case 'low': return 'border-green-200 bg-green-50 dark:bg-green-900/10';
      default: return 'border-border bg-background';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive" className="text-xs">Wichtig</Badge>;
      case 'medium': return <Badge variant="secondary" className="text-xs">Normal</Badge>;
      case 'low': return <Badge variant="outline" className="text-xs">Optional</Badge>;
      default: return null;
    }
  };

  const getPersonalizedActions = () => {
    const actions = [...quickActions];
    
    // Add personalized actions based on user data
    if (userData?.todaysTotals?.calories < (userData?.dailyGoals?.calories * 0.8)) {
      actions.unshift({
        id: 'low-calories-today',
        title: 'Kalorien zu niedrig',
        description: 'Du hast heute zu wenig Kalorien. Lass uns das beheben.',
        prompt: 'Ich habe heute zu wenig Kalorien gegessen. Was soll ich jetzt essen?',
        icon: AlertTriangle,
        category: 'tips',
        priority: 'high'
      } as any);
    }

    if (userData?.recentWorkouts?.length === 0) {
      actions.unshift({
        id: 'no-workouts',
        title: 'Kein Training diese Woche',
        description: 'Du warst diese Woche nicht aktiv. Zeit für ein Workout!',
        prompt: 'Ich war diese Woche nicht im Training. Motiviere mich und schlage ein Workout vor.',
        icon: Dumbbell,
        category: 'motivation',
        priority: 'high'
      } as any);
    }

    return actions;
  };

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="h-8"
              >
                <category.icon className="h-3 w-3 mr-2" />
                {category.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {getPersonalizedActions()
          .filter(action => selectedCategory === 'all' || action.category === selectedCategory)
          .map((action) => (
            <Card 
              key={action.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${getPriorityColor(action.priority)}`}
              onClick={() => onActionSelected(action.prompt)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <action.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm">{action.title}</h3>
                      {getPriorityBadge(action.priority)}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {action.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {filteredActions.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <Activity className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Keine Aktionen in dieser Kategorie verfügbar.</p>
          </CardContent>
        </Card>
      )}

      {/* Coach Personality Info */}
      <Card className="border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-sm">Coach-Persönlichkeit: {coachPersonality}</p>
              <p className="text-xs text-muted-foreground">
                Alle Antworten werden in diesem Stil gegeben
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
