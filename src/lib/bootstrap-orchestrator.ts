import { runThrottled } from './request-queue';
import { supabase } from '@/integrations/supabase/client';

export async function preflightReady() {
  const { data, error } = await supabase.from('profiles').select('id').limit(1);
  return !error;
}

export async function orchestratedBootstrap(userId: string, loaders: {
  loadProfile: () => Promise<any>,
  loadDailyGoals: () => Promise<any>,
  loadMealsToday: () => Promise<any>,
  loadFluidsToday: () => Promise<any>,
  loadWorkoutsToday: () => Promise<any>,
  // optional:
  loadPoints?: () => Promise<any>,
  loadStreaks?: () => Promise<any>,
  loadFlags?: () => Promise<any>,
}) {
  // Phase 0: Preflight (CORS/Auth ok?)
  const ok = await preflightReady();
  if (!ok) throw new Error('preflight_failed');

  // Phase 1: kritisch
  await Promise.all([
    runThrottled(loaders.loadProfile),
    runThrottled(loaders.loadDailyGoals),
  ]);

  // Phase 2: wichtig (parallel, gedrosselt)
  await Promise.all([
    runThrottled(loaders.loadMealsToday),
    runThrottled(loaders.loadFluidsToday),
    runThrottled(loaders.loadWorkoutsToday),
  ]);

  // Phase 3: nice-to-have (fire-and-forget)
  loaders.loadPoints && runThrottled(loaders.loadPoints);
  loaders.loadStreaks && runThrottled(loaders.loadStreaks);
  loaders.loadFlags && runThrottled(loaders.loadFlags);
}