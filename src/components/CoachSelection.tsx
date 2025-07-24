
import React from 'react';
import { CoachCard } from './CoachCard';

const coachProfiles = [
  {
    id: 'hart',
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
    coachInfo: {
      id: 'hart',
      name: 'Sascha Weber',
      role: 'Performance & Training Coach',
      scientificFoundation: 'Sportwissenschaft (M.Sc.) mit Spezialisierung auf Leistungsphysiologie und biomechanische Bewegungsanalyse. Basiert auf aktueller Forschung zu Kraftentwicklung, Hypertrophie und neuronalen Adaptationen.',
      keyMethods: ['Periodisierte Trainingsplanung', 'Progressive Overload Prinzipien', 'Bewegungsanalyse & Korrektur', 'Leistungsdiagnostik'],
      specializations: ['Krafttraining & Hypertrophie', 'Sportspezifische Konditionierung', 'Verletzungsprävention', 'Wettkampfvorbereitung'],
      evidence: 'Wissenschaftlich fundierte Methoden basierend auf Studien zu Kraftentwicklung, neuronaler Adaptation und optimaler Trainingsfrequenz für verschiedene Populationen.',
      interventions: ['Individualisierte Trainingsprogramme', 'Technikoptimierung', 'Progressions-Tracking', 'Regenerationsmanagement'],
      philosophy: 'Maximale Leistungssteigerung durch systematische, evidenzbasierte Trainingsplanung und kontinuierliche Anpassung an individuelle Fortschritte.',
      color: 'blue'
    }
  },
  {
    id: 'soft',
    name: 'Lucy',
    age: 29,
    role: 'Nutrition & Lifestyle Coach',
    avatar: '❤️',
    imageUrl: '/coach-images/fa6fb4d0-0626-4ff4-a5c2-552d0e3d9bbb.png',
    personality: 'Ganzheitlich & Empathisch',
    description: 'Unterstützt dich bei einer ausgewogenen Ernährung ohne Verzicht. Zeigt dir, wie du gesunde Gewohnheiten langfristig in deinen Alltag integrierst.',
    strengths: ['Flexible Ernährung', 'Meal Timing', 'Gewohnheitsaufbau', 'Alltagsintegration'],
    quote: 'Nachhaltiger Erfolg entsteht durch Balance, nicht durch Perfektion.',
    color: 'green',
    accentColor: 'from-green-500 to-green-600',
    coachInfo: {
      id: 'soft',
      name: 'Dr. Lucy Martinez',
      role: 'Nutrition & Lifestyle Coach',
      scientificFoundation: 'Ernährungswissenschaften (Ph.D.) mit Fokus auf Chrononutrition, Stoffwechselphysiologie und Verhaltenspsychologie. Spezialisierung auf nachhaltige Ernährungsinterventionen.',
      keyMethods: ['80/20+ Ernährungsprinzip', 'Chrononutritive Strategien', 'Verhaltensmodifikation', 'Lifestyle-Integration'],
      specializations: ['Flexible Ernährungsstrategien', 'Stoffwechseloptimierung', 'Essverhalten & Psychologie', 'Work-Life-Balance'],
      evidence: 'Basiert auf Forschung zu flexiblen Diätansätzen, zirkadianen Rhythmen und langfristiger Gewichtskontrolle ohne restriktive Diäten.',
      interventions: ['Personalisierte Ernährungspläne', 'Habit-Coaching', 'Meal-Timing Optimierung', 'Stress-Management'],
      philosophy: 'Nachhaltiger Lifestyle-Wandel durch Balance, Flexibilität und die Integration gesunder Gewohnheiten in den Alltag.',
      color: 'green'
    }
  },
  {
    id: 'motivierend',
    name: 'Kai',
    age: 35,
    role: 'Mindset & Recovery Coach',
    avatar: '💪',
    imageUrl: '/coach-images/2c06031d-707a-400d-aaa0-a46decdddfe2.png',
    personality: 'Achtsam & Strategisch',
    description: 'Hilft dir dabei, mentale Stärke aufzubauen und deine Regeneration zu optimieren. Fokussiert auf Achtsamkeit und nachhaltiges Wohlbefinden.',
    strengths: ['Mentales Training', 'Stressmanagement', 'Schlafoptimierung', 'Achtsamkeit'],
    quote: 'Der Geist formt den Körper - mentale Stärke ist der Schlüssel zum Erfolg.',
    color: 'purple',
    accentColor: 'from-purple-500 to-purple-600',
    coachInfo: {
      id: 'motivierend',
      name: 'Dr. Kai Nakamura',
      role: 'Mindset & Recovery Coach',
      scientificFoundation: 'Psychologie (Ph.D.) mit Spezialisierung auf Sportpsychologie, Neuroplastizität und kognitive Verhaltenstherapie. Fundament in Neurowissenschaften und Schlafforschung.',
      keyMethods: ['Kognitive Verhaltenstherapie', 'Achtsamkeitstraining', 'Visualisierungstechniken', 'Schlafhygiene-Protokolle'],
      specializations: ['Mentales Training', 'Stressregulation', 'Schlafoptimierung', 'Burnout-Prävention'],
      evidence: 'Wissenschaftlich fundiert durch Forschung zu Neuroplastizität, kognitiver Leistungsfähigkeit und der Verbindung zwischen mentaler Gesundheit und physischer Performance.',
      interventions: ['Personalisierte Mindset-Programme', 'Regenerations-Coaching', 'Stress-Reduktion', 'Performance-Psychologie'],
      philosophy: 'Ganzheitliche Optimierung durch die Verbindung von Geist und Körper, mit Fokus auf nachhaltige mentale Stärke und Resilienz.',
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
