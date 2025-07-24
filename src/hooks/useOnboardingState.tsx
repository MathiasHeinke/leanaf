import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface OnboardingState {
  showProfileOnboarding: boolean;
  showIndexOnboarding: boolean;
  profileCompleted: boolean;
  mealInputHighlighted: boolean;
}

export const useOnboardingState = () => {
  const { user } = useAuth();
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({
    showProfileOnboarding: false,
    showIndexOnboarding: false,
    profileCompleted: false,
    mealInputHighlighted: false,
  });

  useEffect(() => {
    if (!user) return;

    const storageKey = `onboarding_${user.id}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      try {
        setOnboardingState(JSON.parse(stored));
      } catch (error) {
        // Reset to defaults if parsing fails
        setOnboardingState({
          showProfileOnboarding: false,
          showIndexOnboarding: false,
          profileCompleted: false,
          mealInputHighlighted: false,
        });
      }
    } else {
      // New user - show profile onboarding
      setOnboardingState({
        showProfileOnboarding: true,
        showIndexOnboarding: false,
        profileCompleted: false,
        mealInputHighlighted: false,
      });
    }
  }, [user]);

  const updateOnboardingState = (updates: Partial<OnboardingState>) => {
    if (!user) return;
    
    const newState = { ...onboardingState, ...updates };
    setOnboardingState(newState);
    
    const storageKey = `onboarding_${user.id}`;
    localStorage.setItem(storageKey, JSON.stringify(newState));
  };

  const completeProfileOnboarding = () => {
    updateOnboardingState({ 
      showProfileOnboarding: false, 
      profileCompleted: true,
      showIndexOnboarding: true 
    });
  };

  const completeIndexOnboarding = () => {
    updateOnboardingState({ 
      showIndexOnboarding: false 
    });
  };

  const highlightMealInput = () => {
    updateOnboardingState({ 
      mealInputHighlighted: true 
    });
  };

  const clearMealInputHighlight = () => {
    updateOnboardingState({ 
      mealInputHighlighted: false 
    });
  };

  const resetOnboarding = () => {
    if (!user) return;
    
    const storageKey = `onboarding_${user.id}`;
    localStorage.removeItem(storageKey);
    setOnboardingState({
      showProfileOnboarding: true,
      showIndexOnboarding: false,
      profileCompleted: false,
      mealInputHighlighted: false,
    });
  };

  return {
    ...onboardingState,
    completeProfileOnboarding,
    completeIndexOnboarding,
    highlightMealInput,
    clearMealInputHighlight,
    resetOnboarding,
    updateOnboardingState,
  };
};