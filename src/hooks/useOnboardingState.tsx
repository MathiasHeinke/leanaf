import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useSecureAdminAccess } from './useSecureAdminAccess';

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
  const navigate = useNavigate();
  const { isAdmin } = useSecureAdminAccess();
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
      // New user - navigate to new onboarding page
      navigate('/onboarding');
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

  const forceShowOnboarding = () => {
    if (!isAdmin) {
      console.log('Access denied: Admin privileges required');
      return;
    }
    
    console.log('Admin forcing onboarding display');
    navigate('/onboarding?admin=true');
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
    forceShowOnboarding,
    isAdmin,
  };
};