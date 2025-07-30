import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Heart, Target, Brain, Dumbbell } from 'lucide-react';
import { SpecializedCoachChat } from './SpecializedCoachChat';
import { CoachInfoButton } from './CoachInfoButton';
import { CoachRating, CoachRatingDisplay } from './CoachRating';
import { AdvancedWorkoutSection } from './AdvancedWorkoutSection';
import { PremiumGate } from './PremiumGate';

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
  },
  {
    id: 'markus',
    name: 'Markus Rühl',
    age: 52,
    role: 'The German Beast',
    avatar: '🏋️‍♂️',
    icon: Dumbbell,
    imageUrl: '/lovable-uploads/90efce37-f808-4894-8ea5-1093f3587aa4.png',
    personality: 'Brutal-ehrlich & Motivierend',
    description: 'Hardcore Bodybuilding mit kompromissloser Ehrlichkeit. Heavy+Volume Training für echte Masse - "Muss net schmegge, muss wirke!"',
    expertise: ['Heavy+Volume Training', 'Extreme Hypertrophie', 'Mentale Härte', 'Masseaufbau'],
    color: 'orange',
    accentColor: 'from-orange-500 to-orange-600',
    coachInfo: {
      id: 'markus',
      name: 'Markus Rühl',
      role: 'The German Beast - Hardcore Bodybuilding',
      color: 'orange',
      imageUrl: '/lovable-uploads/90efce37-f808-4894-8ea5-1093f3587aa4.png',
      avatar: '🏋️‍♂️',
      philosophy: '"Wir machen den Sport nicht, weil wir gesund werden wollen, sondern weil wir Muskeln wollen." Bodybuilding ist Krieg gegen das Eisen - mit kompromissloser Ehrlichkeit und hessischer Direktheit.',
      scientificFoundation: 'Jahrzehntelange Praxiserfahrung auf höchstem Niveau. Legacy Pro Practice mit Heavy+Volume Prinzip für extreme Hypertrophie und mentale Härte.',
      specializations: ['Heavy+Volume Training', 'Extreme Hypertrophie-Methoden', 'Mentale Härte & Durchhaltevermögen', 'Masseaufbau-Strategien', '5er-/6er-Split-Systeme', 'Maschinen-dominiertes Training'],
      keyMethods: ['Heavy+Volume Kombination (70-90% 1RM + 20+ Sätze)', 'Pump-basierte Trainingssteuerung', 'Autoregulative Gewichtswahl', 'Maschinen-Fokus für maximale Isolation'],
      evidence: 'Jahrzehntelange Wettkampferfahrung, Mr. Olympia Teilnahmen, Night of Champions Sieger 2002. Legacy Pro Practice als evidenzbasierte Grundlage.',
      evidenceBase: 'Jahrzehntelange Wettkampferfahrung, Mr. Olympia Teilnahmen, Night of Champions Sieger 2002. Legacy Pro Practice als evidenzbasierte Grundlage.',
      interventions: ['Heavy+Volume Trainingspläne', 'Pump-Check-Strategien', 'Mental Warfare Techniken', 'Aggressive Motivationsmethoden']
    },
    quickActions: [
      { text: 'Schwer und falsch trainieren!', prompt: 'Wie trainier isch richtig schwer und falsch für maximale Masse, Maggus?' },
      { text: 'Muss net schmegge!', prompt: 'Zeig mir deine Ernährung - muss net schmegge, muss wirge! Was fress isch für echte Masse?' },
      { text: 'Bis zum Schlaganfall!', prompt: 'Wie entwickel isch die richtige mentale Härte für echtes Beast-Training?' },
      { text: 'Gewicht bringt Muskeln!', prompt: 'Isch stagniere - wie bring isch wieder mehr Gewicht aufs Eisen und durchbrech das Plateau?' }
    ]
  },
  {
    id: 'dr_vita',
    name: 'Dr. Vita Femina',
    age: 38,
    role: 'Hormon-Expertin',
    avatar: '🌸',
    icon: Heart,
    imageUrl: '/lovable-uploads/ad7fe6b6-c176-49df-b275-84345a40c5f5.png',
    personality: 'Wissenschaftlich-empathisch & Hormon-bewusst',
    description: 'Spezialisiert auf zyklusorientiertes Training, Hormonbalance und Frauen-spezifische Gesundheitsoptimierung.',
    expertise: ['Zyklusorientiertes Training', 'Hormonbalance', 'Frauen-Gesundheit', 'Lebensphasen-Coaching'],
    color: 'rose',
    accentColor: 'from-rose-500 to-rose-600',
    coachInfo: {
      id: 'dr_vita',
      name: 'Dr. Vita Femina',
      role: 'Hormon-Expertin',
      color: 'rose',
      imageUrl: '/lovable-uploads/ad7fe6b6-c176-49df-b275-84345a40c5f5.png',
      avatar: '🌸',
      philosophy: 'Frauen sind nicht kleine Männer - unser Körper arbeitet in Zyklen und verdient zyklusorientierte Trainings- und Ernährungsstrategien. Hormonbalance ist der Schlüssel.',
      scientificFoundation: 'Expertise in Frauengesundheit, Endokrinologie, zyklusorientierten Training und evidenzbasierter Hormonoptimierung.',
      specializations: ['Zyklusorientierte Periodisierung', 'Hormonbalance-Strategien', 'PCOS & Endometriose Management', 'Menopause-Coaching', 'Schwangerschafts-Fitness', 'Frauen-spezifische Nährstoffe'],
      keyMethods: ['Menstrual Cycle Periodization', 'Hormon-optimierte Ernährung', 'Frauen-spezifische Supplementierung', 'Lifestyle-Medizin für Frauen'],
      evidence: 'Studien zu Menstrualzyklus-Training, Hormonoptimierung, Frauen-spezifischer Physiologie und zyklusorientierten Interventionen',
      evidenceBase: 'Forschung zu Female Athlete Triad, zyklusorientierten Training, Hormonbalance und Frauen-Gesundheit',
      interventions: ['Zyklusbasierte Trainingspläne', 'Hormon-Assessment', 'Frauen-spezifische Ernährungspläne', 'Lifestyle-Medizin-Coaching']
    },
    quickActions: [
      { text: 'Zyklusorientiertes Training', prompt: 'Wie kann ich mein Training an meinen Menstruationszyklus anpassen für optimale Ergebnisse?' },
      { text: 'Hormonbalance optimieren', prompt: 'Analysiere meine Hormone und gib mir Strategien für bessere Balance.' },
      { text: 'PMS & Periode verbessern', prompt: 'Wie kann ich PMS-Symptome lindern und meine Periode angenehmer gestalten?' },
      { text: 'Frauen-spezifische Ernährung', prompt: 'Welche Nährstoffe brauche ich als Frau besonders und wann in meinem Zyklus?' }
    ]
  },
  {
    id: 'integral',
    name: 'Dr. Sophia Integral',
    age: 42,
    role: 'Integral Theory & Entwicklungscoach',
    avatar: '🧠',
    icon: Brain,
    imageUrl: '/lovable-uploads/fa896878-ee7e-4b4b-9e03-e10d55543ca2.png',
    personality: 'Tiefgreifend & Entwicklungsorientiert',
    description: 'Revolutionärer Coaching-Ansatz durch Integral Theory. Multi-perspektivische Betrachtung für ganzheitliche Transformation.',
    expertise: ['4-Quadranten-Analyse', 'Entwicklungsbewusstsein', 'Systemic Thinking', 'Mehrebenen-Coaching'],
    color: 'indigo',
    accentColor: 'from-indigo-500 to-indigo-600',
    coachInfo: {
      id: 'integral',
      name: 'Dr. Sophia Integral',
      role: 'Integral Theory & Entwicklungscoach',
      color: 'indigo',
      imageUrl: '/lovable-uploads/fa896878-ee7e-4b4b-9e03-e10d55543ca2.png',
      avatar: '🧠',
      philosophy: 'Wahrer Fortschritt entsteht nur durch die Integration aller Perspektiven - individuell & kollektiv, innerlich & äußerlich. Mit den 4 Quadranten und Entwicklungslinien schaffen wir nachhaltige Transformation.',
      scientificFoundation: 'Basiert auf Ken Wilbers Integral Theory, Entwicklungspsychologie (Spiral Dynamics, Kegan), systemischem Denken und evidenzbasierter Multi-Level-Intervention.',
      specializations: ['4-Quadranten-Mapping (Individual/Kollektiv × Innerlich/Äußerlich)', 'Entwicklungsstufen-Assessment', 'Systemische Perspektiven-Integration', 'Genius-Level Questioning', 'Multi-Level Problem-Solving', 'Bewusstseins-Evolution'],
      keyMethods: ['AQAL-Framework (All Quadrants, All Lines)', 'Entwicklungslinien-Analyse', 'Perspektiven-Triangulation', 'Integral Life Practice (ILP)', 'Shadow Work Integration'],
      evidence: 'Integral Theory (Wilber), Entwicklungspsychologie (Kegan, Cook-Greuter), Spiral Dynamics (Beck & Cowan), systemische Therapie und Meta-theoretische Forschung',
      evidenceBase: 'Ken Wilber Integral Theory, Robert Kegan Adult Development, Spiral Dynamics, systemische Familientherapie, Meta-Development Research',
      interventions: ['4-Quadranten-Interventions-Design', 'Entwicklungsstufen-spezifische Strategien', 'Integral Life Practice', 'Shadow-Integration-Prozesse']
    },
    quickActions: [
      { text: '4-Quadranten-Analyse', prompt: 'Analysiere meine Fitness-Situation aus allen 4 Integral-Quadranten und zeige mir blinde Flecken auf.' },
      { text: 'Entwicklungsstufen-Check', prompt: 'Auf welcher Entwicklungsstufe stehe ich in Bezug auf Gesundheit und wo ist mein nächster Wachstumsschritt?' },
      { text: 'Systemische Blockaden', prompt: 'Welche systemischen Muster in meinem Umfeld sabotieren meine Gesundheitsziele?' },
      { text: 'Ganzheitliche Transformation', prompt: 'Erstelle mir einen integral-basierten Transformationsplan für nachhaltigen Erfolg.' }
    ]
  }
];

interface SpecializedCoachesProps {
  selectedCoachId?: string;
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
  selectedCoachId,
  todaysTotals,
  dailyGoals,
  averages,
  historyData,
  trendData,
  weightHistory
}) => {
  const [selectedCoach, setSelectedCoach] = useState<string | null>(selectedCoachId || null);
  const navigate = useNavigate();

  // Update selectedCoach when selectedCoachId prop changes
  useEffect(() => {
    setSelectedCoach(selectedCoachId || null);
  }, [selectedCoachId]);

  const handleCoachSelect = (coachId: string) => {
    setSelectedCoach(coachId);
    // Navigate to the dedicated coach route
    navigate(`/coach/${coachId}`);
  };

  const handleBackToSelection = () => {
    setSelectedCoach(null);
    // Navigate back to main coach page
    navigate('/coach');
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
      case 'orange':
        return 'from-orange-500 to-orange-600';
      case 'purple':
        return 'from-purple-500 to-purple-600';
      case 'indigo':
        return 'from-indigo-500 to-indigo-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <Card 
      className="transition-all duration-300 hover:scale-105 hover:shadow-lg"
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
        
        {/* Coach Rating Display */}
        <div className="mb-3">
          <CoachRatingDisplay coachId={coach.id} className="justify-center" />
        </div>
        
        <div className="flex gap-2">
          <Button 
            size="sm" 
            className="flex-1"
            onClick={() => onSelect(coach.id)}
          >
            Chat starten
          </Button>
          
          {/* Workout start button for Sascha and Markus */}
          {(coach.id === 'sascha' || coach.id === 'markus') && (
            <Button 
              size="sm" 
              variant="outline"
              className="flex-1"
              onClick={() => {
                if (coach.id === 'sascha') {
                  window.location.href = '/training/sascha';
                } else if (coach.id === 'markus') {
                  window.location.href = '/training/markus';
                }
              }}
            >
              Workout starten
            </Button>
          )}
          
          <CoachRating 
            coachId={coach.id} 
            coachName={coach.name}
            trigger={
              <Button 
                size="sm" 
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  // Dialog wird vom CoachRating Component gehandelt
                }}
              >
                ⭐
              </Button>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
};