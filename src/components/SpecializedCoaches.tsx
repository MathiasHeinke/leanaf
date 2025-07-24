import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Check, Heart, Target, Brain } from 'lucide-react';
import { SpecializedCoachChat } from './SpecializedCoachChat';

const coachProfiles = [
  {
    id: 'lucy',
    name: 'Lucy',
    age: 23,
    role: 'Ernährungs- & Lifestyle-Expertin',
    avatar: '❤️',
    icon: Heart,
    imageUrl: '/coach-images/fa6fb4d0-0626-4ff4-a5c2-552d0e3d9bbb.png',
    personality: 'Liebevoll & Unterstützend',
    description: 'Spezialisiert auf nachhaltige Ernährung, gesunde Gewohnheiten und Lifestyle-Optimierung.',
    expertise: ['Ernährungsberatung', 'Lifestyle-Design', 'Gewohnheitsbildung', 'Regeneration'],
    color: 'pink',
    accentColor: 'from-pink-500 to-pink-600',
    quickActions: [
      { text: 'Meal-Timing optimieren', prompt: 'Wie kann ich meine Mahlzeiten besser über den Tag verteilen für optimale Energie und Sättigung?' },
      { text: 'Heißhunger bekämpfen', prompt: 'Ich habe oft Heißhunger. Was sind die Ursachen und wie kann ich dem vorbeugen?' },
      { text: 'Gesunde Snack-Ideen', prompt: 'Welche gesunden Snacks passen zu meinen Zielen und halten mich lange satt?' },
      { text: 'Regeneration verbessern', prompt: 'Wie kann ich meine Regeneration durch Ernährung und Lifestyle unterstützen?' },
      { text: 'Meal-Prep Strategien', prompt: 'Gib mir praktische Meal-Prep Ideen, die zu meinem Alltag und meinen Zielen passen.' }
    ]
  },
  {
    id: 'sascha',
    name: 'Sascha',
    age: 52,
    role: 'Performance- & Trainingsexperte',
    avatar: '🎯',
    icon: Target,
    imageUrl: '/coach-images/9e4f4475-6b1f-4563-806d-89f78ba853e6.png',
    personality: 'Hart & Direkt',
    description: 'Fokussiert auf optimale Trainingsplanung, Kraftaufbau und Performance-Steigerung.',
    expertise: ['Trainingsplanung', 'Kraftaufbau', 'Performance', 'Periodisierung'],
    color: 'red',
    accentColor: 'from-red-500 to-red-600',
    quickActions: [
      { text: 'Trainingsplan erstellen', prompt: 'Erstelle mir einen optimalen Trainingsplan basierend auf meinen Zielen, verfügbarer Zeit und Fortschritt.' },
      { text: 'Progressive Overload', prompt: 'Wie kann ich Progressive Overload richtig anwenden, um kontinuierlich stärker zu werden?' },
      { text: 'Plateau durchbrechen', prompt: 'Ich stagniere bei meinen Lifts. Welche Strategien helfen mir, das Plateau zu durchbrechen?' },
      { text: 'Volumen optimieren', prompt: 'Ist mein aktuelles Trainingsvolumen optimal oder sollte ich es anpassen?' },
      { text: 'Periodisierung planen', prompt: 'Wie sollte ich mein Training periodisieren für optimale Fortschritte über das Jahr?' }
    ]
  },
  {
    id: 'kai',
    name: 'Kai',
    age: 30,
    role: 'Mindset- & Recovery-Spezialist',
    avatar: '💪',
    icon: Brain,
    imageUrl: '/coach-images/2c06031d-707a-400d-aaa0-a46decdddfe2.png',
    personality: 'Motivierend & Energisch',
    description: 'Experte für mentale Stärke, Motivation und optimale Regeneration.',
    expertise: ['Mindset-Training', 'Motivation', 'Recovery', 'Stressmanagement'],
    color: 'green',
    accentColor: 'from-green-500 to-green-600',
    quickActions: [
      { text: 'Motivation steigern', prompt: 'Ich fühle mich unmotiviert. Wie kann ich meine Motivation für Training und gesunde Ernährung wieder finden?' },
      { text: 'Stress reduzieren', prompt: 'Stress beeinflusst meine Fortschritte negativ. Welche Strategien helfen mir beim Stressmanagement?' },
      { text: 'Schlaf optimieren', prompt: 'Mein Schlaf ist nicht optimal. Wie kann ich meine Schlafqualität und Regeneration verbessern?' },
      { text: 'Durchhaltevermögen stärken', prompt: 'Wie kann ich mein Durchhaltevermögen stärken und langfristig bei meinen Zielen bleiben?' },
      { text: 'Gewohnheiten etablieren', prompt: 'Welche Strategien helfen mir dabei, neue gesunde Gewohnheiten dauerhaft zu etablieren?' }
    ]
  }
];

interface SpecializedCoachesProps {
  todaysTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  dailyGoals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  } | null;
  averages: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  historyData: any[];
  trendData: any;
  weightHistory: any[];
}

export const SpecializedCoaches: React.FC<SpecializedCoachesProps> = ({
  todaysTotals,
  dailyGoals,
  averages,
  historyData,
  trendData,
  weightHistory
}) => {
  const [selectedCoach, setSelectedCoach] = useState<string | null>(null);

  const handleCoachSelect = (coachId: string) => {
    setSelectedCoach(coachId);
  };

  const handleBackToSelection = () => {
    setSelectedCoach(null);
  };

  if (selectedCoach) {
    const coach = coachProfiles.find(c => c.id === selectedCoach);
    if (!coach) return null;

    return (
      <SpecializedCoachChat
        coach={coach}
        onBack={handleBackToSelection}
        todaysTotals={todaysTotals}
        dailyGoals={dailyGoals}
        averages={averages}
        historyData={historyData}
        trendData={trendData}
        weightHistory={weightHistory}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Wähle deinen Experten</h3>
        <p className="text-sm text-muted-foreground">
          Jeder Coach ist auf ein spezielles Gebiet fokussiert - wähle den passenden Experten für deine Frage!
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
        {coachProfiles.map((coach) => (
          <CoachMiniCard
            key={coach.id}
            coach={coach}
            onSelect={handleCoachSelect}
          />
        ))}
      </div>
    </div>
  );
};

interface CoachMiniCardProps {
  coach: (typeof coachProfiles)[0];
  onSelect: (coachId: string) => void;
}

const CoachMiniCard: React.FC<CoachMiniCardProps> = ({ coach, onSelect }) => {
  const [imageError, setImageError] = useState(false);

  const getCoachColors = (color: string) => {
    switch (color) {
      case 'red':
        return 'from-red-500 to-red-600';
      case 'pink':
        return 'from-pink-500 to-pink-600';
      case 'green':
        return 'from-green-500 to-green-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <Card 
      className="cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg"
      onClick={() => onSelect(coach.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className="relative">
            {coach.imageUrl && !imageError ? (
              <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg">
                <img 
                  src={coach.imageUrl} 
                  alt={coach.name}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              </div>
            ) : (
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getCoachColors(coach.color)} flex items-center justify-center text-white text-lg font-bold shadow-lg`}>
                {coach.avatar}
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-bold">{coach.name}</CardTitle>
            <p className="text-xs text-muted-foreground truncate">{coach.role}</p>
          </div>
          
          <coach.icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {coach.description}
        </p>
        
        <div className="flex flex-wrap gap-1 mb-3">
          {coach.expertise.slice(0, 2).map((skill, index) => (
            <Badge key={index} variant="secondary" className="text-xs px-2 py-0">
              {skill}
            </Badge>
          ))}
          {coach.expertise.length > 2 && (
            <Badge variant="outline" className="text-xs px-2 py-0">
              +{coach.expertise.length - 2}
            </Badge>
          )}
        </div>
        
        <Button 
          size="sm" 
          className="w-full"
          onClick={() => onSelect(coach.id)}
        >
          Chat starten
        </Button>
      </CardContent>
    </Card>
  );
};