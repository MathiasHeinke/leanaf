/**
 * auto-cycle-updater Edge Function
 * Runs daily via pg_cron to automatically switch cycle phases
 * 
 * Logic:
 * 1. Fetch all user_supplements with schedule.type = 'cycle'
 * 2. For each supplement, check if current phase has expired
 * 3. If expired: toggle is_on_cycle, reset current_cycle_start
 * 4. If Off→On: increment total_cycles_completed
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CycleSchedule {
  type: 'cycle';
  cycle_on_days: number;
  cycle_off_days: number;
  start_date: string;
  is_on_cycle?: boolean;
  current_cycle_start?: string;
  total_cycles_completed?: number;
}

interface TransitionRecord {
  id: string;
  name: string;
  from: 'on' | 'off';
  to: 'on' | 'off';
  cycle?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role key for batch processing
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    console.log(`[auto-cycle-updater] Running for date: ${todayStr}`);

    // Fetch all cycling supplements
    const { data: supplements, error: fetchError } = await supabase
      .from('user_supplements')
      .select('id, name, schedule, user_id')
      .eq('is_active', true);

    if (fetchError) {
      throw new Error(`Failed to fetch supplements: ${fetchError.message}`);
    }

    // Filter to only cycle-type schedules
    const cyclingSupplements = (supplements || []).filter(s => {
      const schedule = s.schedule as CycleSchedule | null;
      return schedule?.type === 'cycle';
    });

    console.log(`[auto-cycle-updater] Found ${cyclingSupplements.length} cycling supplements`);

    const transitions: TransitionRecord[] = [];
    const updates: Array<{ id: string; schedule: CycleSchedule }> = [];

    for (const supp of cyclingSupplements) {
      const schedule = supp.schedule as CycleSchedule;
      
      // Ensure we have required fields
      if (!schedule.cycle_on_days || !schedule.cycle_off_days) {
        console.log(`[auto-cycle-updater] Skipping ${supp.id}: missing cycle days`);
        continue;
      }

      // Determine current phase start (use current_cycle_start or start_date)
      const phaseStartStr = schedule.current_cycle_start || schedule.start_date;
      if (!phaseStartStr) {
        console.log(`[auto-cycle-updater] Skipping ${supp.id}: no start date`);
        continue;
      }

      const phaseStart = new Date(phaseStartStr);
      phaseStart.setHours(0, 0, 0, 0);

      // Calculate days in current phase
      const daysSincePhaseStart = Math.floor(
        (today.getTime() - phaseStart.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Determine if we're on or off cycle
      // Default to on-cycle if is_on_cycle is undefined
      const isCurrentlyOn = schedule.is_on_cycle !== false;
      const currentPhaseDays = isCurrentlyOn 
        ? schedule.cycle_on_days 
        : schedule.cycle_off_days;

      console.log(`[auto-cycle-updater] ${supp.name}: Day ${daysSincePhaseStart + 1}/${currentPhaseDays}, is_on=${isCurrentlyOn}`);

      // Check if phase has expired (>= because day 0 is first day)
      if (daysSincePhaseStart >= currentPhaseDays) {
        const newIsOnCycle = !isCurrentlyOn;
        const newTotalCycles = newIsOnCycle 
          ? (schedule.total_cycles_completed || 0) + 1  // Off→On: increment
          : (schedule.total_cycles_completed || 0);      // On→Off: keep same

        const updatedSchedule: CycleSchedule = {
          ...schedule,
          is_on_cycle: newIsOnCycle,
          current_cycle_start: todayStr,
          total_cycles_completed: newTotalCycles,
        };

        updates.push({ id: supp.id, schedule: updatedSchedule });
        
        transitions.push({
          id: supp.id,
          name: supp.name || 'Unknown',
          from: isCurrentlyOn ? 'on' : 'off',
          to: newIsOnCycle ? 'on' : 'off',
          cycle: newIsOnCycle ? newTotalCycles : undefined,
        });

        console.log(`[auto-cycle-updater] Transitioning ${supp.name}: ${isCurrentlyOn ? 'on' : 'off'} → ${newIsOnCycle ? 'on' : 'off'}`);
      }
    }

    // Batch update all transitions
    let successCount = 0;
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('user_supplements')
        .update({ schedule: update.schedule as unknown as Record<string, unknown> })
        .eq('id', update.id);

      if (updateError) {
        console.error(`[auto-cycle-updater] Failed to update ${update.id}: ${updateError.message}`);
      } else {
        successCount++;
      }
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      processed: cyclingSupplements.length,
      transitioned: transitions.length,
      updated: successCount,
      transitions,
    };

    console.log(`[auto-cycle-updater] Complete:`, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[auto-cycle-updater] Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
