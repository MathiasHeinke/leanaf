import React from 'react';
import { TrainingDashboard } from '@/components/TrainingDashboard';


const TrainingPlus = () => {
  return (
    <div className="container mx-auto px-4 pt-0 pb-6 max-w-7xl">
      <PremiumGate 
        feature="advanced_exercise_tracking"
        fallbackMessage="Training+ ist ein Premium-Feature mit erweiterten Trainings-Funktionen, detailliertem Exercise-Tracking und KI-Coach Sascha."
        showUpgrade={true}
        showTrialPrompt={true}
      >
        <TrainingDashboard />
      </PremiumGate>
    </div>
  );
};

export default TrainingPlus;