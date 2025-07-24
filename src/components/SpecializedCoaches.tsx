import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Check, Heart, Target, Brain } from 'lucide-react';
import { SpecializedCoachChat } from './SpecializedCoachChat';
import { CoachInfoButton } from './CoachInfoButton';

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
    description: 'Spezialisiert auf optimales Meal-Timing, Intervallfasten und gesunde Gewohnheiten für nachhaltigen Erfolg.',
    expertise: ['Optimales Timing', 'Intervallfasten', 'Gesunde Gewohnheiten', 'Stoffwechsel'],
    color: 'pink',
    accentColor: 'from-pink-500 to-pink-600',
    coachInfo: {
      id: 'lucy',
      name: 'Lucy',
      role: 'Ernährungs- & Lifestyle-Expertin',
      color: 'pink',
      imageUrl: '/coach-images/fa6fb4d0-0626-4ff4-a5c2-552d0e3d9bbb.png',
      avatar: '❤️',
      philosophy: 'Gesunde Ernährung sollte Freude machen und sich natürlich in deinen Alltag integrieren. Mit der 80/20-Regel und wissenschaftlich fundiertem Meal-Timing findest du die perfekte Balance.',
      scientificFoundation: 'Expertise in Chrononutrition, metabolischer Flexibilität und evidenzbasierter Ernährungsoptimierung für langfristigen Erfolg.',
      specializations: ['Chrononutrition & Meal-Timing', 'Intervallfasten-Strategien', 'Anti-inflammatorische Ernährung', 'Metabolische Flexibilität', '80/20-Prinzip', 'Gewohnheitsbildung'],
      keyMethods: ['Biorhythmus-optimiertes Essen', 'Personalisierte IF-Protokolle', 'Entzündungshemmende Lebensmittel', 'Flexible Ernährungsansätze'],
      evidence: 'Studien zu Chrononutrition, Time-restricted Eating, metabolischer Gesundheit und nachhaltiger Verhaltensänderung',
      evidenceBase: 'Studien zu Chrononutrition, Time-restricted Eating, metabolischer Gesundheit und nachhaltiger Verhaltensänderung',
      interventions: ['Meal-Timing-Optimierung', 'IF-Protokoll-Anpassung', 'Anti-Inflammation-Pläne', 'Gewohnheits-Coaching']
    },
    quickActions: [
      { text: 'Optimales Meal-Timing', prompt: 'Wie kann ich mein Meal-Timing nach meinem Biorhythmus optimieren für bessere Glukosetoleranz?' },
      { text: 'Intervallfasten starten', prompt: 'Welche IF-Strategie passt zu meinem Chronotyp und wie starte ich richtig?' },
      { text: 'Gesunde Gewohnheiten', prompt: 'Erstelle mir einen nachhaltigen Plan für gesunde Ernährungsgewohnheiten.' },
      { text: 'Stoffwechsel optimieren', prompt: 'Wie kann ich meinen Stoffwechsel für optimale Fettverbrennung verbessern?' }
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
    description: 'Evidenzbasiertes Training mit systematischer Progression für maximale Kraft und Performance.',
    expertise: ['Intelligente Planung', 'Progression', 'Kraftaufbau', 'Performance'],
    color: 'red',
    accentColor: 'from-red-500 to-red-600',
    coachInfo: {
      id: 'sascha',
      name: 'Sascha',
      role: 'Performance- & Trainingsexperte',
      color: 'red',
      imageUrl: '/coach-images/9e4f4475-6b1f-4563-806d-89f78ba853e6.png',
      avatar: '🎯',
      philosophy: 'Erfolg im Training kommt durch systematische Progression und intelligente Planung. Jede Wiederholung muss einen Zweck haben.',
      scientificFoundation: 'Basiert auf Trainingswissenschaft, Biomechanik und evidenzbasierten Methoden für optimale Kraftentwicklung und Performance.',
      specializations: ['Periodisierung', 'Progressive Overload', 'Biomechanik-Optimierung', 'Kraftaufbau-Strategien', 'Performance-Training', 'Plateau-Durchbruch'],
      keyMethods: ['Wissenschaftliche Periodisierung', 'Biomechanische Analyse', 'Progressive Overload-Systeme', 'Individualisierte Trainingsplanung'],
      evidence: 'Studien zu Krafttraining, Periodisierung, Biomechanik und Performance-Optimierung',
      evidenceBase: 'Studien zu Krafttraining, Periodisierung, Biomechanik und Performance-Optimierung',
      interventions: ['Periodisierte Trainingspläne', 'Bewegungsanalyse', 'Progressive Overload-Anpassung', 'Performance-Tests']
    },
    quickActions: [
      { text: 'Intelligente Planung', prompt: 'Erstelle mir einen wissenschaftlich fundierten, periodisierten Trainingsplan für meine Ziele.' },
      { text: 'Progressive Overload', prompt: 'Analysiere meine aktuellen Lifts und optimiere meine Progressive Overload-Strategie.' },
      { text: 'Kraftaufbau maximieren', prompt: 'Welche evidenzbasierten Strategien maximieren meinen Kraftaufbau?' },
      { text: 'Plateau durchbrechen', prompt: 'Ich stagniere. Welche Strategien helfen mir beim Plateau-Durchbruch?' }
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
    description: 'Mentale Stärke und optimale Regeneration für nachhaltige Motivation und bessere Performance.',
    expertise: ['Mentale Stärke', 'Regeneration', 'Schlafqualität', 'Motivation'],
    color: 'green',
    accentColor: 'from-green-500 to-green-600',
    coachInfo: {
      id: 'kai',
      name: 'Kai',
      role: 'Mindset- & Recovery-Spezialist',
      color: 'green',
      imageUrl: '/coach-images/2c06031d-707a-400d-aaa0-a46decdddfe2.png',
      avatar: '💪',
      philosophy: 'Erfolg entsteht im Kopf und regeneriert sich im Schlaf. Mentale Stärke und optimale Recovery sind die Basis für langfristige Fortschritte.',
      scientificFoundation: 'Expertise in Neuroplastizität, HRV-Training und evidenzbasierter Recovery-Optimierung für mentale und körperliche Performance.',
      specializations: ['Neuroplastizität & Gewohnheitsbildung', 'HRV-Training', 'Schlafoptimierung', 'Stressresilienz', 'Motivationspsychologie', 'Recovery-Strategien'],
      keyMethods: ['Neuroplastizitäts-Training', 'HRV-basierte Recovery', 'Schlafhygiene-Optimierung', 'Stressmanagement-Techniken'],
      evidence: 'Studien zu Neuroplastizität, HRV, Schlafforschung und Stressmanagement',
      evidenceBase: 'Studien zu Neuroplastizität, HRV, Schlafforschung und Stressmanagement',
      interventions: ['Gewohnheits-Coaching', 'HRV-Training', 'Schlaf-Optimierung', 'Stressresilienz-Aufbau']
    },
    quickActions: [
      { text: 'Mentale Stärke aufbauen', prompt: 'Wie kann ich mentale Stärke für bessere Gewohnheitsbildung und Motivation nutzen?' },
      { text: 'Regeneration optimieren', prompt: 'Erkläre mir HRV-Training und wie ich es für optimale Recovery einsetzen kann.' },
      { text: 'Schlaf verbessern', prompt: 'Analysiere meine Schlafgewohnheiten und erstelle einen Optimierungsplan.' },
      { text: 'Motivation aufbauen', prompt: 'Welche wissenschaftlich bewährten Methoden helfen mir beim Aufbau von dauerhafter Motivation?' }
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
          
          <div className="flex items-center space-x-2">
            {coach.coachInfo && <CoachInfoButton coach={coach.coachInfo} />}
            <coach.icon className="h-5 w-5 text-muted-foreground" />
          </div>
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