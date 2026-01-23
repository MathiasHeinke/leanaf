/**
 * Memory Cleanup - Expires old insights and manages memory hygiene
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Deactivate expired insights based on expires_at column
 * Call this periodically (e.g., daily via cron)
 */
export async function cleanupExpiredInsights(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase
    .from('user_insights')
    .update({ is_active: false })
    .lt('expires_at', new Date().toISOString())
    .eq('is_active', true)
    .select('id');

  if (error) {
    console.error('[MemoryCleanup] Error deactivating expired insights:', error);
    return 0;
  }

  const count = data?.length || 0;
  if (count > 0) {
    console.log(`[MemoryCleanup] Deactivated ${count} expired insights`);
  }
  return count;
}

/**
 * Deactivate stale insights that haven't been relevant for 90 days
 */
export async function cleanupStaleInsights(
  supabase: SupabaseClient,
  staleDays: number = 90
): Promise<number> {
  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - staleDays);

  const { data, error } = await supabase
    .from('user_insights')
    .update({ is_active: false })
    .lt('last_relevant_at', staleDate.toISOString())
    .eq('is_active', true)
    .not('importance', 'in', '("critical","high")') // Keep critical/high insights
    .select('id');

  if (error) {
    console.error('[MemoryCleanup] Error deactivating stale insights:', error);
    return 0;
  }

  const count = data?.length || 0;
  if (count > 0) {
    console.log(`[MemoryCleanup] Deactivated ${count} stale insights (>${staleDays} days)`);
  }
  return count;
}

/**
 * Clean up old addressed patterns
 */
export async function cleanupAddressedPatterns(
  supabase: SupabaseClient,
  retentionDays: number = 30
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const { data, error } = await supabase
    .from('user_patterns')
    .delete()
    .eq('is_addressed', true)
    .lt('created_at', cutoffDate.toISOString())
    .select('id');

  if (error) {
    console.error('[MemoryCleanup] Error cleaning up addressed patterns:', error);
    return 0;
  }

  const count = data?.length || 0;
  if (count > 0) {
    console.log(`[MemoryCleanup] Deleted ${count} old addressed patterns`);
  }
  return count;
}

/**
 * Run all cleanup tasks - call from cron or scheduled function
 */
export async function runMemoryCleanup(supabase: SupabaseClient): Promise<{
  expiredInsights: number;
  staleInsights: number;
  addressedPatterns: number;
}> {
  console.log('[MemoryCleanup] Starting memory cleanup...');
  
  const expiredInsights = await cleanupExpiredInsights(supabase);
  const staleInsights = await cleanupStaleInsights(supabase);
  const addressedPatterns = await cleanupAddressedPatterns(supabase);

  const result = { expiredInsights, staleInsights, addressedPatterns };
  console.log('[MemoryCleanup] Cleanup complete:', result);
  
  return result;
}
