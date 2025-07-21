
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string;
  highlightClass?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void;
}

export const useOnboarding = () => {
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isNewUser, setIsNewUser] = useState(false);
  const { user } = useAuth();

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Willkommen bei leanAF! 👋',
      description: 'Lass uns dein Profil einrichten, damit wir dir personalisierte Ernährungstipps geben können.',
      targetElement: '.profile-button',
      position: 'bottom'
    },
    {
      id: 'profile-basic',
      title: 'Grunddaten eingeben',
      description: 'Trage hier deine Grunddaten ein: Gewicht, Größe, Alter und Geschlecht.',
      targetElement: '.profile-basic-data',
      position: 'top',
      highlightClass: 'onboarding-highlight-important'
    },
    {
      id: 'profile-activity',
      title: 'Aktivitätslevel wählen',
      description: 'Wähle dein Aktivitätslevel aus, damit wir deinen Kalorienbedarf berechnen können.',
      targetElement: '.profile-activity-level',
      position: 'top',
      highlightClass: 'onboarding-highlight-important'
    },
    {
      id: 'profile-goals',
      title: 'Ziele definieren',
      description: 'Definiere dein Hauptziel und Zielgewicht. Das hilft uns bei der Berechnung deiner Makros.',
      targetElement: '.profile-goals',
      position: 'top',
      highlightClass: 'onboarding-highlight-important'
    },
    {
      id: 'profile-save',
      title: 'Profil speichern',
      description: 'Speichere dein Profil, um mit der Ernährungsanalyse zu beginnen.',
      targetElement: '.profile-save-button',
      position: 'top',
      highlightClass: 'onboarding-highlight-action'
    },
    {
      id: 'meal-input',
      title: 'Mahlzeit eingeben',
      description: 'Perfekt! Jetzt kannst du deine erste Mahlzeit eingeben. Beschreibe einfach was du gegessen hast oder mache ein Foto.',
      targetElement: '.meal-input-container',
      position: 'top',
      highlightClass: 'onboarding-highlight-action'
    }
  ];

  // Check if user is new and needs onboarding
  useEffect(() => {
    if (user) {
      checkIfNewUser();
    }
  }, [user]);

  const checkIfNewUser = async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('weight, height, age, gender')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking profile:', error);
        return;
      }

      // Check if profile is incomplete (new user)
      const isIncomplete = !profile || 
        !profile.weight || 
        !profile.height || 
        !profile.age || 
        !profile.gender;

      setIsNewUser(isIncomplete);
      setIsOnboardingActive(isIncomplete);
    } catch (error) {
      console.error('Error checking user status:', error);
    }
  };

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = () => {
    setIsOnboardingActive(false);
    setCurrentStep(0);
  };

  const completeOnboarding = () => {
    setIsOnboardingActive(false);
    setCurrentStep(0);
    setIsNewUser(false);
  };

  const goToStep = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < onboardingSteps.length) {
      setCurrentStep(stepIndex);
    }
  };

  return {
    isOnboardingActive,
    currentStep,
    onboardingSteps,
    isNewUser,
    nextStep,
    prevStep,
    skipOnboarding,
    completeOnboarding,
    goToStep,
    setIsOnboardingActive
  };
};
