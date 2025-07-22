
import React from 'react';
import { CoachCard } from './CoachCard';

const coachProfiles = [
  {
    id: 'hart',
    name: 'Sascha',
    age: 32,
    role: 'Fitness Drill-Instructor',
    avatar: '🎯',
    personality: 'Hart & Direkt',
    description: 'Keine Ausreden, nur Resultate. Sascha bringt dich mit klaren Ansagen und kompromissloser Disziplin zu deinen Zielen.',
    strengths: ['Disziplin', 'Klare Ansagen', 'Schnelle Resultate', 'Effizienz'],
    quote: 'Aufhören ist keine Option. Wir machen das jetzt richtig!',
    color: 'red',
    accentColor: 'from-red-500 to-red-600'
  },
  {
    id: 'soft',
    name: 'Lucy',
    age: 28,
    role: 'Ernährungsberaterin',
    avatar: '❤️',
    personality: 'Liebevoll & Unterstützend',
    description: 'Mit Verständnis und Geduld hilft Lucy dir dabei, nachhaltige und gesunde Gewohnheiten zu entwickeln.',
    strengths: ['Empathie', 'Geduld', 'Nachhaltigkeit', 'Verständnis'],
    quote: 'Jeder kleine Schritt zählt. Du schaffst das, ich glaube an dich!',
    color: 'pink',
    accentColor: 'from-pink-500 to-pink-600'
  },
  {
    id: 'motivierend',
    name: 'Kai',
    age: 30,
    role: 'Personal Trainer',
    avatar: '💪',
    personality: 'Motivierend & Energisch',
    description: 'Kai bringt die Energie! Mit positivem Spirit und ansteckender Begeisterung macht Fitness richtig Spaß.',
    strengths: ['Energie', 'Positive Verstärkung', 'Spaß', 'Motivation'],
    quote: 'Los geht\'s! Heute wird ein großartiger Tag für deine Fitness!',
    color: 'green',
    accentColor: 'from-green-500 to-green-600'
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
