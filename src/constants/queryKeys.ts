/**
 * Centralized Query Key Registry
 * All React Query keys and their category mappings for unified cache invalidation
 */

export const QUERY_KEYS = {
  USER_PROFILE: ['user-profile'] as const,
  USER_PROFILE_STRATEGY: ['user-profile-strategy'] as const,
  DAILY_METRICS: ['daily-metrics'] as const,
  SUPPLEMENTS_TODAY: ['supplements-today-widget'] as const,
  SUPPLEMENTS_DATA: ['supplement-data'] as const,
  TRAINING_WEEKLY: ['training-sessions-weekly'] as const,
  WEIGHT_RECENT: ['weight-recent'] as const,
  SLEEP_RECENT: ['sleep-recent'] as const,
} as const;

// Map categories to ALL query keys that need refreshing when that category changes
export const CATEGORY_QUERY_MAP: Record<string, readonly (readonly string[])[]> = {
  supplements: [QUERY_KEYS.SUPPLEMENTS_TODAY, QUERY_KEYS.SUPPLEMENTS_DATA, QUERY_KEYS.DAILY_METRICS],
  supplement: [QUERY_KEYS.SUPPLEMENTS_TODAY, QUERY_KEYS.SUPPLEMENTS_DATA, QUERY_KEYS.DAILY_METRICS],
  peptide: [QUERY_KEYS.SUPPLEMENTS_TODAY, QUERY_KEYS.DAILY_METRICS],
  water: [QUERY_KEYS.DAILY_METRICS],
  coffee: [QUERY_KEYS.DAILY_METRICS],
  weight: [QUERY_KEYS.WEIGHT_RECENT, QUERY_KEYS.DAILY_METRICS],
  workout: [QUERY_KEYS.TRAINING_WEEKLY, QUERY_KEYS.DAILY_METRICS],
  sleep: [QUERY_KEYS.SLEEP_RECENT, QUERY_KEYS.DAILY_METRICS],
  nutrition: [QUERY_KEYS.DAILY_METRICS],
  journal: [QUERY_KEYS.DAILY_METRICS],
  profile: [QUERY_KEYS.USER_PROFILE, QUERY_KEYS.USER_PROFILE_STRATEGY, QUERY_KEYS.DAILY_METRICS],
};

/**
 * Helper function for batch cache invalidation by category
 * Call this after any logging action to ensure all related widgets update
 */
export const invalidateCategory = (
  queryClient: { invalidateQueries: (opts: { queryKey: readonly string[] }) => void },
  category: string
) => {
  const keys = CATEGORY_QUERY_MAP[category] || [QUERY_KEYS.DAILY_METRICS];
  keys.forEach(key => {
    queryClient.invalidateQueries({ queryKey: key });
  });
};
