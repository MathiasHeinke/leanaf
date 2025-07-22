import { useSubscription } from './useSubscription';

// Define which features are available for each tier
export const FEATURE_TIERS = {
  // Basic/Free features - always available
  meal_tracking: 'basic',
  weight_tracking: 'basic',
  points_system: 'basic',
  badge_system: 'basic',
  basic_dashboard: 'basic',
  profile: 'basic',
  basic_charts: 'basic',
  
  // Premium features
  workout_tracking: 'premium',
  sleep_tracking: 'premium',
  body_measurements: 'premium',
  advanced_coach: 'premium',
  detailed_analytics: 'premium',
  advanced_charts: 'premium',
  meal_verification: 'premium',
  premium_insights: 'premium',
  coach_recipes: 'premium',
  transformation_dashboard: 'premium',
} as const;

export type FeatureName = keyof typeof FEATURE_TIERS;
export type FeatureTier = typeof FEATURE_TIERS[FeatureName];

export const useFeatureAccess = () => {
  const { isPremium, isBasic, trial } = useSubscription();

  const hasFeatureAccess = (feature: FeatureName): boolean => {
    const requiredTier = FEATURE_TIERS[feature];
    
    if (requiredTier === 'basic') {
      return true; // Basic features are always available
    }
    
    if (requiredTier === 'premium') {
      return isPremium; // Premium features require subscription or trial
    }
    
    return false;
  };

  const getFeatureStatus = (feature: FeatureName) => {
    const hasAccess = hasFeatureAccess(feature);
    const requiredTier = FEATURE_TIERS[feature];
    
    return {
      hasAccess,
      requiredTier,
      isTrialFeature: requiredTier === 'premium' && trial.hasActiveTrial,
      trialDaysLeft: trial.trialDaysLeft,
    };
  };

  // Get trial multiplier for points (2x for free users to encourage engagement)
  const getTrialMultiplier = (): number => {
    if (isBasic && !trial.hasActiveTrial) {
      return 2.0; // 2x points for free users to encourage engagement
    }
    if (trial.hasActiveTrial) {
      return 1.5; // 1.5x points during trial period
    }
    return 1.0; // Normal points for premium users
  };

  return {
    hasFeatureAccess,
    getFeatureStatus,
    getTrialMultiplier,
    isPremium,
    isBasic,
    trial,
  };
};