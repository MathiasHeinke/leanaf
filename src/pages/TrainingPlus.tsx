import React from 'react';
import { TrainingDashboard } from '@/components/TrainingDashboard';
import { PremiumGate } from '@/components/PremiumGate';

const TrainingPlus = () => {
  return (
    <div className="space-y-2 animate-fade-in">
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