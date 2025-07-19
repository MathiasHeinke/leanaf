import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useNavigate } from 'react-router-dom';

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
  
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const navigate = useNavigate();

  const currentStepData = onboardingSteps[currentStep];

  // Highlight target element and scroll to it
  useEffect(() => {
    if (!isOnboardingActive || !currentStepData?.targetElement) return;

    const element = document.querySelector(currentStepData.targetElement) as HTMLElement;
    if (element) {
      setHighlightedElement(element);
      
      // Add highlight class
      if (currentStepData.highlightClass) {
        element.classList.add(currentStepData.highlightClass);
      }
      element.classList.add('onboarding-highlight');
      
      // Scroll to element
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }

    return () => {
      if (element) {
        element.classList.remove('onboarding-highlight');
        if (currentStepData.highlightClass) {
          element.classList.remove(currentStepData.highlightClass);
        }
      }
    };
  }, [isOnboardingActive, currentStep, currentStepData]);

  // Navigate to profile for profile steps
  useEffect(() => {
    if (isOnboardingActive && currentStepData?.id.startsWith('profile-') && window.location.pathname !== '/profile') {
      navigate('/profile');
    }
    if (isOnboardingActive && currentStepData?.id === 'meal-input' && window.location.pathname !== '/') {
      navigate('/');
    }
  }, [currentStep, isOnboardingActive, navigate]);

  if (!isOnboardingActive) return null;

  const handleNext = () => {
    if (currentStepData?.action) {
      currentStepData.action();
    }
    nextStep();
  };

  const isLastStep = currentStep === onboardingSteps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Tutorial Card */}
      <div className="absolute inset-4 flex items-center justify-center">
        <Card className="max-w-md w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-2 border-primary/20 shadow-2xl animate-scale-in">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-gradient-to-r from-primary to-primary-glow rounded-full flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  Schritt {currentStep + 1} von {onboardingSteps.length}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={skipOnboarding}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6">
              <div 
                className="bg-gradient-to-r from-primary to-primary-glow h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }}
              />
            </div>

            {/* Content */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-foreground">
                {currentStepData.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {currentStepData.description}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="flex gap-2">
                {!isFirstStep && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevStep}
                    className="flex items-center gap-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Zurück
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={skipOnboarding}
                  className="text-muted-foreground"
                >
                  Überspringen
                </Button>
                
                <Button
                  size="sm"
                  onClick={isLastStep ? completeOnboarding : handleNext}
                  className="flex items-center gap-1 bg-gradient-to-r from-primary to-primary-glow"
                >
                  {isLastStep ? 'Fertig' : 'Weiter'}
                  {!isLastStep && <ArrowRight className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};