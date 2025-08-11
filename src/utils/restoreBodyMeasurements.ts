
import { supabase } from "@/integrations/supabase/client";

/**
 * Restore or upsert a body_measurements row for a specific date.
 * Use this to recover historical data that might have been overwritten.
 * 
 * Example:
 * await restoreBodyMeasurements(userId, '2025-07-21', {
 *   neck: 32.5, chest: 95, waist: 85, belly: 90, hips: 96, arms: 34, thigh: 60, notes: 'aus Screenshot'
 * });
 */
export async function restoreBodyMeasurements(
  userId: string,
  date: string,
  values: {
    neck?: number | null;
    chest?: number | null;
    waist?: number | null;
    belly?: number | null;
    hips?: number | null;
    arms?: number | null;
    thigh?: number | null;
    notes?: string | null;
  }
) {
  if (!userId) throw new Error('restoreBodyMeasurements: userId required');
  if (!date) throw new Error('restoreBodyMeasurements: date (YYYY-MM-DD) required');

  console.log('[Restore] Attempting to restore body_measurements for', { userId, date, values });

  // Try insert first (preferred, protected by unique index)
  const { error: insertError } = await supabase
    .from('body_measurements')
    .insert({
      user_id: userId,
      date,
      ...values,
    });

  if (!insertError) {
    console.log('[Restore] Insert successful');
    return { action: 'insert', ok: true };
  }

  // If duplicate (already exists), fall back to update for that date
  if (insertError.code === '23505' || insertError.message?.includes('duplicate')) {
    console.log('[Restore] Row exists, updating existing record for that date');
    const { error: updateError } = await supabase
      .from('body_measurements')
      .update({
        ...values, // no date change
      })
      .eq('user_id', userId)
      .eq('date', date);

    if (updateError) {
      console.error('[Restore] Update failed:', updateError);
      throw updateError;
    }
    console.log('[Restore] Update successful');
    return { action: 'update', ok: true };
  }

  console.error('[Restore] Insert failed:', insertError);
  throw insertError;
}
