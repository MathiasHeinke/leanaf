
import React from 'react';
import { CoachCard } from './CoachCard';

const coachProfiles = [
  {
    id: 'hart',
    name: 'Sascha',
    age: 52,
    role: 'Performance- & Trainingsexperte',
    avatar: '🎯',
    imageUrl: '/coach-images/9e4f4475-6b1f-4563-806d-89f78ba853e6.png',
    personality: 'Hart & Direkt',
    description: 'Evidenzbasierte Trainingsplanung mit Fokus auf Progressive Overload und periodisierte Kraftentwicklung.',
    strengths: ['Periodisierung', 'Progressive Overload', 'Biomechanik', 'Kraftaufbau'],
    quote: 'Aufhören ist keine Option. Wir machen das jetzt richtig!',
    color: 'red',
    accentColor: 'from-red-500 to-red-600',
    coachInfo: {
      id: 'hart',
      name: 'Sascha',
      role: 'Performance- & Trainingsexperte',
      scientificFoundation: 'Basiert auf wissenschaftlichen Prinzipien der Trainingslehre, Biomechanik und Sportwissenschaft. Nutzt evidenzbasierte Methoden zur Kraftentwicklung und Performance-Optimierung.',
      keyMethods: ['Progressive Overload Periodisierung', 'Compound Movement Fokus', 'Volumen-Intensitäts-Balancing', 'Bewegungsqualitäts-Analyse'],
      ragSpecializations: ['Trainingsplanung', 'Kraftaufbau', 'Periodisierung', 'Biomechanik', 'Performance-Analyse', 'Plateau-Durchbruch'],
      evidence: ['Progressive Overload führt zu 20-30% Kraftsteigerung in 12 Wochen', 'Compound Movements aktivieren 40% mehr Muskelmasse', 'Periodisierte Programme zeigen 25% bessere Langzeitergebnisse'],
      interventions: ['Individuelle Trainingsplanerstellung basierend auf Zielen und Fortschritt', 'Progressive Overload-Strategien für kontinuierliche Steigerung', 'Plateau-Durchbruch-Techniken bei Stagnation', 'Bewegungsanalyse und Technikoptimierung'],
      philosophy: 'Keine Ausreden, nur messbare Resultate. Erfolg entsteht durch konsequente Anwendung wissenschaftlich bewährter Trainingsprinzipien.',
      color: 'red'
    }
  },
  {
    id: 'soft',
    name: 'Lucy',
    age: 23,
    role: '80/20+ Ernährungs- & Lifestyle-Expertin',
    avatar: '❤️',
    imageUrl: '/coach-images/fa6fb4d0-0626-4ff4-a5c2-552d0e3d9bbb.png',
    personality: 'Liebevoll & Unterstützend',
    description: 'Spezialisiert auf Chrononutrition, anti-inflammatorische Ernährung und metabolische Flexibilität nach dem 80/20-Prinzip.',
    strengths: ['Chrononutrition', 'Anti-Inflammation', 'Metabolismus', 'Intervallfasten'],
    quote: 'Jeder kleine Schritt zählt. Du schaffst das, ich glaube an dich!',
    color: 'pink',
    accentColor: 'from-pink-500 to-pink-600',
    coachInfo: {
      id: 'soft',
      name: 'Lucy',
      role: '80/20+ Ernährungs- & Lifestyle-Expertin',
      scientificFoundation: 'Fundiert auf aktueller Forschung zu Chrononutrition, metabolischer Flexibilität und anti-inflammatorischer Ernährung. 80% Fokus auf Ernährung, 20% auf Bewegung und Schlaf.',
      keyMethods: ['Nährstoff-Timing nach Biorhythmus', 'Intervallfasten (16:8) für metabolischen Switch', 'Anti-inflammatorische Mahlzeitenzusammenstellung', 'Meal-Regularity vor Meal-Frequency'],
      ragSpecializations: ['Chrononutrition', 'Intervallfasten', 'Anti-Inflammation', 'Metabolische Flexibilität', 'Hormonbalance', 'Meal-Timing'],
      evidence: ['Frühes Essensfenster verbessert Glukosetoleranz um 25%', 'IF reduziert Entzündungsmarker IL-6 um 30%', 'Mediterrane Ernährung senkt CRP um 20%'],
      interventions: ['Personalisierte Meal-Timing-Pläne nach Chronotyp', 'Intervallfasten-Programme für metabolischen Switch', 'Anti-inflammatorische Rezeptvorschläge', 'Hormonbalance durch optimierte Nährstoffverteilung'],
      philosophy: 'Nachhaltige Veränderung durch Verständnis und Geduld. Jeder Körper ist einzigartig und verdient eine individuelle, liebevolle Herangehensweise.',
      color: 'pink'
    }
  },
  {
    id: 'motivierend',
    name: 'Kai',
    age: 30,
    role: 'Mindset- & Recovery-Spezialist',
    avatar: '💪',
    imageUrl: '/coach-images/2c06031d-707a-400d-aaa0-a46decdddfe2.png',
    personality: 'Motivierend & Energisch',
    description: 'Experte für Neuroplastizität, evidenzbasierte Motivation und optimale Regeneration durch Schlaf und Stressmanagement.',
    strengths: ['Neuroplastizität', 'HRV-Training', 'Schlafoptimierung', 'Stress-Management'],
    quote: 'Los geht\'s! Heute wird ein großartiger Tag für deine Fitness!',
    color: 'green',
    accentColor: 'from-green-500 to-green-600',
    coachInfo: {
      id: 'motivierend',
      name: 'Kai',
      role: 'Mindset- & Recovery-Spezialist',
      scientificFoundation: 'Basiert auf Neurowissenschaften, Schlafforschung und evidenzbasierten Motivationstheorien. Nutzt HRV-Daten und Schlafmetriken für optimale Recovery.',
      keyMethods: ['Neuroplastizitäts-Training für Gewohnheitsbildung', 'HRV-gesteuerte Recovery-Optimierung', 'Schlafphasen-Management', 'Stressresilienz-Aufbau'],
      ragSpecializations: ['Neuroplastizität', 'Schlafoptimierung', 'HRV-Training', 'Stressmanagement', 'Motivation', 'Recovery'],
      evidence: ['HRV-Training verbessert Stressresilienz um 35%', 'Optimaler Schlaf steigert Performance um 20%', 'Mindset-Training erhöht Durchhaltevermögen um 40%'],
      interventions: ['Personalisierte Recovery-Pläne basierend auf HRV-Daten', 'Schlafoptimierungs-Protokolle für bessere Regeneration', 'Neuroplastizitäts-Übungen für Gewohnheitsbildung', 'Stressmanagement-Techniken für nachhaltigen Erfolg'],
      philosophy: 'Energie und Begeisterung sind ansteckend! Mit der richtigen Einstellung und optimaler Recovery erreichst du jedes Ziel.',
      color: 'green'
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
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Wähle deinen Coach</h3>
        <p className="text-sm text-muted-foreground">
          Jeder Coach hat seinen eigenen Stil - finde den, der am besten zu dir passt!
        </p>
      </div>
      
      <div className="space-y-4">
        {coachProfiles.map((coach) => (
          <CoachCard
            key={coach.id}
            coach={coach}
            isSelected={selectedCoach === coach.id}
            onSelect={onCoachChange}
          />
        ))}
      </div>
    </div>
  );
};
