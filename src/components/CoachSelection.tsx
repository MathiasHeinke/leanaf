
import React from 'react';
import { CoachCard } from './CoachCard';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Crown, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Erweiterte Coach-Profile mit neuen Experten
const coachProfiles = [
  {
    id: 'lucy',
    name: 'Lucy',
    age: 29,
    role: 'Nutrition, Metabolism & Lifestyle Coach',
    avatar: '❤️',
    imageUrl: '/coach-images/fa6fb4d0-0626-4ff4-a5c2-552d0e3d9bbb.png',
    personality: 'Ganzheitlich & Empathisch',
    description: 'Unterstützt dich bei einer ausgewogenen Ernährung ohne Verzicht. Spezialistin für Stoffwechsel und metabolische Flexibilität. Zeigt dir, wie du gesunde Gewohnheiten langfristig in deinen Alltag integrierst.',
    strengths: ['Flexible Ernährung', 'Metabolische Flexibilität', 'Keto & Low-Carb', 'Supplements', 'Stoffwechseloptimierung', 'Meal Timing', 'Gewohnheitsaufbau'],
    quote: 'Nachhaltiger Erfolg entsteht durch Balance, nicht durch Perfektion.',
    color: 'green',
    accentColor: 'from-green-500 to-green-600',
    isFree: true,
    expertise: ['Optimales Timing', 'Intervallfasten', 'Gesunde Gewohnheiten', 'Stoffwechsel', 'Supplements', 'Metabolische Flexibilität', 'Keto & Low-Carb'],
    quickActions: [
      { text: 'Optimales Meal-Timing', prompt: 'Wie kann ich mein Meal-Timing nach meinem Biorhythmus optimieren für bessere Glukosetoleranz?' },
      { text: 'Intervallfasten starten', prompt: 'Welche IF-Strategie passt zu meinem Chronotyp und wie starte ich richtig?' },
      { text: 'Gesunde Gewohnheiten', prompt: 'Erstelle mir einen nachhaltigen Plan für gesunde Ernährungsgewohnheiten.' },
      { text: 'Stoffwechsel optimieren', prompt: 'Wie kann ich meinen Stoffwechsel für optimale Fettverbrennung verbessern?' }
    ],
    coachInfo: {
      id: 'lucy',
      name: 'Dr. Lucy Martinez',
      role: 'Nutrition, Metabolism & Lifestyle Coach',
      imageUrl: '/coach-images/fa6fb4d0-0626-4ff4-a5c2-552d0e3d9bbb.png',
      avatar: '❤️',
      philosophy: 'Gesunde Ernährung sollte Freude machen und sich natürlich in deinen Alltag integrieren. Mit der 80/20-Regel und wissenschaftlich fundiertem Meal-Timing findest du die perfekte Balance.',
      scientificFoundation: 'Expertise in Chrononutrition, metabolischer Flexibilität und evidenzbasierter Ernährungsoptimierung für langfristigen Erfolg. Spezialisierung auf Supplements und Ketose.',
      specializations: ['Chrononutrition & Meal-Timing', 'Intervallfasten-Strategien', 'Anti-inflammatorische Ernährung', 'Metabolische Flexibilität', '80/20-Prinzip', 'Gewohnheitsbildung', 'Supplement-Beratung', 'Keto & Low-Carb'],
      keyMethods: ['Biorhythmus-optimiertes Essen', 'Personalisierte IF-Protokolle', 'Entzündungshemmende Lebensmittel', 'Flexible Ernährungsansätze', 'Supplement-Strategien'],
      evidence: 'Studien zu Chrononutrition, Time-restricted Eating, metabolischer Gesundheit und nachhaltiger Verhaltensänderung',
      evidenceBase: 'Studien zu Chrononutrition, Time-restricted Eating, metabolischer Gesundheit und nachhaltiger Verhaltensänderung',
      interventions: ['Meal-Timing-Optimierung', 'IF-Protokoll-Anpassung', 'Anti-Inflammation-Pläne', 'Gewohnheits-Coaching', 'Supplement-Pläne'],
      color: 'green'
    }
  },
  {
    id: 'sascha',
    name: 'Sascha',
    age: 32,
    role: 'Performance & Training Coach',
    avatar: '🎯',
    imageUrl: '/coach-images/9e4f4475-6b1f-4563-806d-89f78ba853e6.png',
    personality: 'Performance-fokussiert',
    description: 'Dein Experte für effektives Krafttraining und Leistungssteigerung. Hilft dir dabei, deine Fitnessziele systematisch und nachhaltig zu erreichen.',
    strengths: ['Trainingsplanung', 'Kraftaufbau', 'Technikverbesserung', 'Fortschrittsmessung'],
    quote: 'Fortschritt entsteht durch intelligente Progression und messbare Anpassungen.',
    color: 'blue',
    accentColor: 'from-blue-500 to-blue-600',
    isPremium: true,
    expertise: ['Intelligente Planung', 'Progression', 'Kraftaufbau', 'Performance'],
    quickActions: [
      { text: 'Intelligente Planung', prompt: 'Erstelle mir einen wissenschaftlich fundierten, periodisierten Trainingsplan für meine Ziele.' },
      { text: 'Progressive Overload', prompt: 'Analysiere meine aktuellen Lifts und optimiere meine Progressive Overload-Strategie.' },
      { text: 'Kraftaufbau maximieren', prompt: 'Welche evidenzbasierten Strategien maximieren meinen Kraftaufbau?' },
      { text: 'Plateau durchbrechen', prompt: 'Ich stagniere. Welche Strategien helfen mir beim Plateau-Durchbruch?' }
    ],
    coachInfo: {
      id: 'sascha',
      name: 'Sascha Weber',
      role: 'Performance & Training Coach',
      imageUrl: '/coach-images/9e4f4475-6b1f-4563-806d-89f78ba853e6.png',
      avatar: '🎯',
      philosophy: 'Erfolg im Training kommt durch systematische Progression und intelligente Planung. Jede Wiederholung muss einen Zweck haben.',
      scientificFoundation: 'Basiert auf Trainingswissenschaft, Biomechanik und evidenzbasierten Methoden für optimale Kraftentwicklung und Performance.',
      specializations: ['Periodisierung', 'Progressive Overload', 'Biomechanik-Optimierung', 'Kraftaufbau-Strategien', 'Performance-Training', 'Plateau-Durchbruch'],
      keyMethods: ['Wissenschaftliche Periodisierung', 'Biomechanische Analyse', 'Progressive Overload-Systeme', 'Individualisierte Trainingsplanung'],
      evidence: 'Studien zu Krafttraining, Periodisierung, Biomechanik und Performance-Optimierung',
      evidenceBase: 'Studien zu Krafttraining, Periodisierung, Biomechanik und Performance-Optimierung',
      interventions: ['Periodisierte Trainingspläne', 'Bewegungsanalyse', 'Progressive Overload-Anpassung', 'Performance-Tests'],
      color: 'blue'
    }
  },
  {
    id: 'kai',
    name: 'Kai',
    age: 35,
    role: 'Mindset, Recovery & Transformation Coach',
    avatar: '💪',
    imageUrl: '/coach-images/2c06031d-707a-400d-aaa0-a46decdddfe2.png',
    personality: 'Achtsam & Strategisch',
    description: 'Hilft dir dabei, mentale Stärke aufzubauen und deine Regeneration zu optimieren. Spezialist für ganzheitliche Transformation mit Vier-Quadranten-Analyse. Fokussiert auf Coaching und nachhaltiges Wohlbefinden.',
    strengths: ['Mentales Training', 'Coaching', 'Ganzheitliche Transformation', 'Vier-Quadranten-Analyse', 'Stressmanagement', 'Schlafoptimierung', 'Achtsamkeit'],
    quote: 'Der Geist formt den Körper - mentale Stärke ist der Schlüssel zum Erfolg.',
    color: 'purple',
    accentColor: 'from-purple-500 to-purple-600',
    isPremium: true,
    expertise: ['Mentale Stärke', 'Regeneration', 'Schlafqualität', 'Motivation', 'Ganzheitliche Transformation', 'Vier-Quadranten-Analyse'],
    quickActions: [
      { text: 'Mentale Stärke aufbauen', prompt: 'Wie kann ich mentale Stärke für bessere Gewohnheitsbildung und Motivation nutzen?' },
      { text: 'Regeneration optimieren', prompt: 'Erkläre mir HRV-Training und wie ich es für optimale Recovery einsetzen kann.' },
      { text: 'Schlaf verbessern', prompt: 'Analysiere meine Schlafgewohnheiten und erstelle einen Optimierungsplan.' },
      { text: 'Ganzheitliche Transformation', prompt: 'Erstelle mir einen integral-basierten Transformationsplan für nachhaltigen Erfolg.' }
    ],
    coachInfo: {
      id: 'kai',
      name: 'Dr. Kai Nakamura',
      role: 'Mindset, Recovery & Transformation Coach',
      imageUrl: '/coach-images/2c06031d-707a-400d-aaa0-a46decdddfe2.png',
      avatar: '💪',
      philosophy: 'Erfolg entsteht im Kopf und regeneriert sich im Schlaf. Mentale Stärke und optimale Recovery sind die Basis für langfristige Fortschritte. Ganzheitliche Transformation durch Vier-Quadranten-Integration.',
      scientificFoundation: 'Expertise in Neuroplastizität, HRV-Training und evidenzbasierter Recovery-Optimierung für mentale und körperliche Performance. Integral Theory und ganzheitliche Transformationsansätze.',
      specializations: ['Neuroplastizität & Gewohnheitsbildung', 'HRV-Training', 'Schlafoptimierung', 'Stressresilienz', 'Motivationspsychologie', 'Recovery-Strategien', 'Vier-Quadranten-Analyse', 'Ganzheitliche Transformation'],
      keyMethods: ['Neuroplastizitäts-Training', 'HRV-basierte Recovery', 'Schlafhygiene-Optimierung', 'Stressmanagement-Techniken', 'Vier-Quadranten-Mapping', 'Integral Life Practice'],
      evidence: 'Studien zu Neuroplastizität, HRV, Schlafforschung und Stressmanagement, Integral Theory',
      evidenceBase: 'Studien zu Neuroplastizität, HRV, Schlafforschung und Stressmanagement, Integral Theory',
      interventions: ['Gewohnheits-Coaching', 'HRV-Training', 'Schlaf-Optimierung', 'Stressresilienz-Aufbau', 'Vier-Quadranten-Assessment', 'Ganzheitliche Transformations-Coaching'],
      color: 'purple'
    }
  },
  {
    id: 'markus',
    name: 'Markus',
    age: 42,
    role: 'Bodybuilding & Transformation Coach',
    avatar: '🏆',
    imageUrl: '/lovable-uploads/90efce37-f808-4894-8ea5-1093f3587aa4.png',
    personality: 'Direkt & Motivierend',
    description: 'Legendärer Bodybuilder und Transformations-Experte. Bringt dich mit seiner direkten Art und jahrzehntelanger Erfahrung zu neuen Höchstleistungen.',
    strengths: ['Muskelaufbau', 'Wettkampfvorbereitung', 'Körpertransformation', 'Mentale Stärke'],
    quote: 'Erfolg ist kein Zufall - es ist harte Arbeit, Disziplin und die richtige Einstellung.',
    color: 'red',
    accentColor: 'from-red-500 to-red-600',
    isPremium: true,
    expertise: ['Heavy+Volume Training', 'Extreme Hypertrophie', 'Mentale Härte', 'Masseaufbau'],
    quickActions: [
      { text: 'Schwer und falsch trainieren!', prompt: 'Wie trainier isch richtig schwer und falsch für maximale Masse, Maggus?' },
      { text: 'Muss net schmegge!', prompt: 'Zeig mir deine Ernährung - muss net schmegge, muss wirge! Was fress isch für echte Masse?' },
      { text: 'Bis zum Schlaganfall!', prompt: 'Wie entwickel isch die richtige mentale Härte für echtes Beast-Training?' },
      { text: 'Gewicht bringt Muskeln!', prompt: 'Isch stagniere - wie bring isch wieder mehr Gewicht aufs Eisen und durchbrech das Plateau?' }
    ],
    coachInfo: {
      id: 'markus',
      name: 'Markus Rühl',
      role: 'The German Beast - Hardcore Bodybuilding',
      imageUrl: '/lovable-uploads/90efce37-f808-4894-8ea5-1093f3587aa4.png',
      avatar: '🏋️‍♂️',
      philosophy: '"Wir machen den Sport nicht, weil wir gesund werden wollen, sondern weil wir Muskeln wollen." Bodybuilding ist Krieg gegen das Eisen - mit kompromissloser Ehrlichkeit und hessischer Direktheit.',
      scientificFoundation: 'Jahrzehntelange Praxiserfahrung auf höchstem Niveau. Legacy Pro Practice mit Heavy+Volume Prinzip für extreme Hypertrophie und mentale Härte.',
      specializations: ['Heavy+Volume Training', 'Extreme Hypertrophie-Methoden', 'Mentale Härte & Durchhaltevermögen', 'Masseaufbau-Strategien', '5er-/6er-Split-Systeme', 'Maschinen-dominiertes Training'],
      keyMethods: ['Heavy+Volume Kombination (70-90% 1RM + 20+ Sätze)', 'Pump-basierte Trainingssteuerung', 'Autoregulative Gewichtswahl', 'Maschinen-Fokus für maximale Isolation'],
      evidence: 'Jahrzehntelange Wettkampferfahrung, Mr. Olympia Teilnahmen, Night of Champions Sieger 2002. Legacy Pro Practice als evidenzbasierte Grundlage.',
      evidenceBase: 'Jahrzehntelange Wettkampferfahrung, Mr. Olympia Teilnahmen, Night of Champions Sieger 2002. Legacy Pro Practice als evidenzbasierte Grundlage.',
      interventions: ['Heavy+Volume Trainingspläne', 'Pump-Check-Strategien', 'Mental Warfare Techniken', 'Aggressive Motivationsmethoden'],
      color: 'red'
    }
  },
  {
    id: 'dr-vita',
    name: 'Dr. Vita Femina',
    age: 38,
    role: 'Female Health & Hormone Coach',
    avatar: '🌺',
    imageUrl: '/lovable-uploads/ad7fe6b6-c176-49df-b275-84345a40c5f5.png',
    personality: 'Wissenschaftlich & Empathisch',
    description: 'Expertin für weibliche Gesundheit und hormonelle Balance. Begleitet Frauen durch alle Lebensphasen - vom ersten Zyklus bis zur Menopause.',
    strengths: ['Zyklusbasiertes Training', 'Hormonoptimierung', 'Schwangerschaft & Postpartum', 'Menopause-Support'],
    quote: 'Von der ersten Periode bis zur goldenen Reife – wir trainieren Hormone, Herz & Hirn im Takt des Lebens.',
    color: 'purple',
    accentColor: 'from-purple-500 to-purple-600',
    isPremium: true,
    expertise: ['Zyklusorientiertes Training', 'Hormonbalance', 'Frauen-Gesundheit', 'Lebensphasen-Coaching'],
    quickActions: [
      { text: 'Zyklusorientiertes Training', prompt: 'Wie kann ich mein Training an meinen Menstruationszyklus anpassen für optimale Ergebnisse?' },
      { text: 'Hormonbalance optimieren', prompt: 'Analysiere meine Hormone und gib mir Strategien für bessere Balance.' },
      { text: 'PMS & Periode verbessern', prompt: 'Wie kann ich PMS-Symptome lindern und meine Periode angenehmer gestalten?' },
      { text: 'Frauen-spezifische Ernährung', prompt: 'Welche Nährstoffe brauche ich als Frau besonders und wann in meinem Zyklus?' }
    ],
    coachInfo: {
      id: 'dr-vita',
      name: 'Dr. Vita Femina',
      role: 'Hormon-Expertin',
      imageUrl: '/lovable-uploads/ad7fe6b6-c176-49df-b275-84345a40c5f5.png',
      avatar: '🌸',
      philosophy: 'Frauen sind nicht kleine Männer - unser Körper arbeitet in Zyklen und verdient zyklusorientierte Trainings- und Ernährungsstrategien. Hormonbalance ist der Schlüssel.',
      scientificFoundation: 'Expertise in Frauengesundheit, Endokrinologie, zyklusorientierten Training und evidenzbasierter Hormonoptimierung.',
      specializations: ['Zyklusorientierte Periodisierung', 'Hormonbalance-Strategien', 'PCOS & Endometriose Management', 'Menopause-Coaching', 'Schwangerschafts-Fitness', 'Frauen-spezifische Nährstoffe'],
      keyMethods: ['Menstrual Cycle Periodization', 'Hormon-optimierte Ernährung', 'Frauen-spezifische Supplementierung', 'Lifestyle-Medizin für Frauen'],
      evidence: 'Studien zu Menstrualzyklus-Training, Hormonoptimierung, Frauen-spezifischer Physiologie und zyklusorientierten Interventionen',
      evidenceBase: 'Forschung zu Female Athlete Triad, zyklusorientierten Training, Hormonbalance und Frauen-Gesundheit',
      interventions: ['Zyklusbasierte Trainingspläne', 'Hormon-Assessment', 'Frauen-spezifische Ernährungspläne', 'Lifestyle-Medizin-Coaching'],
      color: 'purple'
    }
  }
];

interface CoachSelectionProps {
  selectedCoach: string;
  onCoachChange: (coachId: string) => void;
}

export const CoachSelection: React.FC<CoachSelectionProps> = ({ 
  selectedCoach, 
  onCoachChange 
}) => {
  const { isPremium } = useSubscription();
  const navigate = useNavigate();

  const handleUpgrade = () => {
    navigate('/subscription');
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Wähle deinen Coach</h3>
        <p className="text-sm text-muted-foreground">
          {isPremium 
          ? 'Alle Experten-Coaches stehen dir zur Verfügung!' 
            : 'Lucy ist dein kostenloser Coach - oder upgrade für alle Experten!'
          }
        </p>
      </div>

      {/* Premium Upgrade Banner for Free Users */}
      {!isPremium && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border border-yellow-200 dark:border-yellow-800/30 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Crown className="h-8 w-8 text-yellow-600" />
              <div>
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                  🚀 Über 5+ Experten-Coaches verfügbar
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Upgrade zu Pro für Zugang zu allen Coaches mit einzigartiger Persönlichkeit und tiefem Fachwissen
                </p>
              </div>
            </div>
            <Button 
              onClick={handleUpgrade} 
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade
            </Button>
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        {coachProfiles.map((coach) => {
          const isLocked = coach.isPremium && !isPremium;
          const isDisabled = isLocked;

          return (
            <CoachCard
              key={coach.id}
              coach={coach}
              isSelected={selectedCoach === coach.id}
              onSelect={() => navigate(`/coach/${coach.id}`)}
              disabled={isDisabled}
              requiresPremium={coach.isPremium}
            />
          );
        })}
      </div>

      {/* Coach Coming Soon Section */}
      <div className="mt-8 p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg border border-dashed">
        <div className="text-center">
          <Plus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <h4 className="font-semibold text-muted-foreground mb-1">Weitere Coaches kommen bald!</h4>
          <p className="text-xs text-muted-foreground">
            Regelmäßig neue Experten mit einzigartigen Persönlichkeiten und Fachbereichen
          </p>
        </div>
      </div>
    </div>
  );
};
