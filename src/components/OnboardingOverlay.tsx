import React, { useEffect } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useNavigate } from 'react-router-dom';
import { OnboardingSpotlight } from './OnboardingSpotlight';
import { OnboardingTooltip } from './OnboardingTooltip';

export const OnboardingOverlay = () => {
  const {
    isOnboardingActive,
    currentStep,
    onboardingSteps,
    nextStep,
    prevStep,
    skipOnboarding,
    completeOnboarding
  } = useOnboarding();
  
  const navigate = useNavigate();
  const currentStepData = onboardingSteps[currentStep];

  // Navigate to profile for profile steps
  useEffect(() => {
    if (isOnboardingActive && currentStepData?.id.startsWith('profile-') && window.location.pathname !== '/profile') {
      navigate('/profile');
    }
    if (isOnboardingActive && currentStepData?.id === 'meal-input' && window.location.pathname !== '/') {
      navigate('/');
    }
  }, [currentStep, isOnboardingActive, navigate]);

  if (!isOnboardingActive || !currentStepData?.targetElement) return null;

  const isLastStep = currentStep === onboardingSteps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <OnboardingSpotlight 
      targetElement={currentStepData.targetElement}
      isActive={isOnboardingActive}
    >
      <OnboardingTooltip
        targetElement={currentStepData.targetElement}
        step={currentStepData}
        currentStep={currentStep}
        totalSteps={onboardingSteps.length}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipOnboarding}
        onComplete={completeOnboarding}
        isLastStep={isLastStep}
        isFirstStep={isFirstStep}
      />
    </OnboardingSpotlight>
  );
};