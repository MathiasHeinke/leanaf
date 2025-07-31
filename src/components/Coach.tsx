import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CoachSelection } from '@/components/CoachSelection';
import { UnifiedCoachChat } from '@/components/UnifiedCoachChat';

// Import coach profiles from CoachSelection to find the coach by ID
const coachProfiles = [
  {
    id: 'lucy',
    name: 'Lucy',
    personality: 'lucy',
    expertise: ['Optimales Timing', 'Intervallfasten', 'Gesunde Gewohnheiten', 'Stoffwechsel', 'Supplements', 'Metabolische Flexibilität', 'Keto & Low-Carb'],
    imageUrl: '/coach-images/fa6fb4d0-0626-4ff4-a5c2-552d0e3d9bbb.png',
    color: 'green',
    accentColor: 'from-green-500 to-green-600',
    description: 'Unterstützt dich bei einer ausgewogenen Ernährung ohne Verzicht. Spezialistin für Stoffwechsel und metabolische Flexibilität.'
  },
  {
    id: 'sascha',
    name: 'Sascha',
    personality: 'sascha',
    expertise: ['Intelligente Planung', 'Progression', 'Kraftaufbau', 'Performance'],
    imageUrl: '/coach-images/9e4f4475-6b1f-4563-806d-89f78ba853e6.png',
    color: 'blue',
    accentColor: 'from-blue-500 to-blue-600',
    description: 'Dein Experte für effektives Krafttraining und Leistungssteigerung.'
  },
  {
    id: 'kai',
    name: 'Kai',
    personality: 'kai',
    expertise: ['Mentale Stärke', 'Regeneration', 'Schlafqualität', 'Motivation', 'Ganzheitliche Transformation', 'Vier-Quadranten-Analyse'],
    imageUrl: '/coach-images/2c06031d-707a-400d-aaa0-a46decdddfe2.png',
    color: 'purple',
    accentColor: 'from-purple-500 to-purple-600',
    description: 'Hilft dir dabei, mentale Stärke aufzubauen und deine Regeneration zu optimieren.'
  },
  {
    id: 'markus',
    name: 'Markus',
    personality: 'markus',
    expertise: ['Heavy+Volume Training', 'Extreme Hypertrophie', 'Mentale Härte', 'Masseaufbau'],
    imageUrl: '/lovable-uploads/90efce37-f808-4894-8ea5-1093f3587aa4.png',
    color: 'red',
    accentColor: 'from-red-500 to-red-600',
    description: 'Legendärer Bodybuilder und Transformations-Experte.'
  },
  {
    id: 'dr-vita',
    name: 'Dr. Vita Femina',
    personality: 'dr_vita',
    expertise: ['Zyklusorientiertes Training', 'Hormonbalance', 'Frauen-Gesundheit', 'Lebensphasen-Coaching'],
    imageUrl: '/lovable-uploads/ad7fe6b6-c176-49df-b275-84345a40c5f5.png',
    color: 'purple',
    accentColor: 'from-purple-500 to-purple-600',
    description: 'Expertin für weibliche Gesundheit und hormonelle Balance.'
  }
];

const Coach = () => {
  const { coachId } = useParams();

  if (coachId) {
    const coach = coachProfiles.find(c => c.id === coachId);
    if (!coach) {
      return <div>Coach not found</div>;
    }

    return (
      <UnifiedCoachChat
        mode="specialized"
        coach={coach}
        useFullscreenLayout={true}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <CoachSelection
        selectedCoach=""
        onCoachChange={() => {}}
      />
    </div>
  );
};

export default Coach;