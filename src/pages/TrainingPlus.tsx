import React from 'react';
import { AdvancedWorkoutSection } from '@/components/AdvancedWorkoutSection';
import { PremiumGate } from '@/components/PremiumGate';

const TrainingPlus = () => {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <PremiumGate 
        feature="advanced_exercise_tracking"
        fallbackMessage="Training+ ist ein Premium-Feature mit erweiterten Trainings-Funktionen, detailliertem Exercise-Tracking und KI-Coach Sascha."
        showUpgrade={true}
        showTrialPrompt={true}
      >
        <AdvancedWorkoutSection />
      </PremiumGate>
    </div>
  );
};

export default TrainingPlus;