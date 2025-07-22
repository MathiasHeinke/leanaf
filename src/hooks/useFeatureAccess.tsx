import { useSubscription } from './useSubscription';

// Define which features are available for each tier
export const FEATURE_TIERS = {
  // Free features - always available
  meal_tracking: 'free',
  weight_tracking: 'free',
  points_system: 'free',
  badge_system: 'free',
  basic_dashboard: 'free',
  profile: 'free',
  basic_charts: 'free',
  meal_analysis_limited: 'free', // 5 per day with GPT-4o-mini
  
  // Pro features - require subscription
  workout_tracking: 'pro',
  sleep_tracking: 'pro',
  body_measurements: 'pro',
  advanced_coach: 'pro',
  detailed_analytics: 'pro',
  advanced_charts: 'pro',
  meal_verification: 'pro',
  premium_insights: 'pro',
  coach_recipes: 'pro',
  coach_chat: 'pro',
  daily_analysis: 'pro',
  transformation_dashboard: 'pro',
  unlimited_ai: 'pro', // Unlimited AI with GPT-4.1
} as const;

export type FeatureName = keyof typeof FEATURE_TIERS;
export type FeatureTier = typeof FEATURE_TIERS[FeatureName];

export const useFeatureAccess = () => {
  const { isPremium, isBasic, trial } = useSubscription();

  const hasFeatureAccess = (feature: FeatureName): boolean => {
    const requiredTier = FEATURE_TIERS[feature];
    
    if (requiredTier === 'free') {
      return true; // Free features are always available
    }
    
    if (requiredTier === 'pro') {
      return isPremium; // Pro features require subscription or trial
    }
    
    return false;
  };

  const getFeatureStatus = (feature: FeatureName) => {
    const hasAccess = hasFeatureAccess(feature);
    const requiredTier = FEATURE_TIERS[feature];
    
    return {
      hasAccess,
      requiredTier,
      isTrialFeature: requiredTier === 'pro' && trial.hasActiveTrial,
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