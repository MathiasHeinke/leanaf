import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface OnboardingState {
  showProfileOnboarding: boolean;
  showIndexOnboarding: boolean;
  showInteractiveOnboarding: boolean;
  profileCompleted: boolean;
  mealInputHighlighted: boolean;
  showProfileIndicators: boolean;
  profileCompletedAt?: string;
}

export const useOnboardingState = () => {
  const { user } = useAuth();
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({
    showProfileOnboarding: false,
    showIndexOnboarding: false,
    showInteractiveOnboarding: false,
    profileCompleted: false,
    mealInputHighlighted: false,
    showProfileIndicators: true,
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
          showInteractiveOnboarding: false,
          profileCompleted: false,
          mealInputHighlighted: false,
          showProfileIndicators: true,
        });
      }
    } else {
      // New user - show interactive onboarding instead of old profile onboarding
      setOnboardingState({
        showProfileOnboarding: false,
        showIndexOnboarding: false,
        showInteractiveOnboarding: true,
        profileCompleted: false,
        mealInputHighlighted: false,
        showProfileIndicators: true,
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
      showIndexOnboarding: true,
      profileCompletedAt: new Date().toISOString()
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

  const completeInteractiveOnboarding = () => {
    updateOnboardingState({ 
      showInteractiveOnboarding: false,
      profileCompleted: true,
      showIndexOnboarding: true,
      profileCompletedAt: new Date().toISOString()
    });
  };

  const resetOnboarding = () => {
    if (!user) return;
    
    const storageKey = `onboarding_${user.id}`;
    localStorage.removeItem(storageKey);
    setOnboardingState({
      showProfileOnboarding: false,
      showIndexOnboarding: false,
      showInteractiveOnboarding: true,
      profileCompleted: false,
      mealInputHighlighted: false,
      showProfileIndicators: true,
    });
  };

  const shouldShowProfileIndicators = () => {
    if (!onboardingState.showProfileIndicators) return false;
    if (!onboardingState.profileCompletedAt) return true;
    
    const completedAt = new Date(onboardingState.profileCompletedAt);
    const daysSinceCompletion = Math.floor((Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysSinceCompletion < 7; // Hide after 7 days
  };

  const hideProfileIndicators = () => {
    updateOnboardingState({ showProfileIndicators: false });
  };

  return {
    ...onboardingState,
    completeProfileOnboarding,
    completeIndexOnboarding,
    completeInteractiveOnboarding,
    highlightMealInput,
    clearMealInputHighlight,
    resetOnboarding,
    updateOnboardingState,
    shouldShowProfileIndicators,
    hideProfileIndicators,
  };
};