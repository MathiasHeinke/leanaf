export type WorkoutKind = 'kraft' | 'cardio';

import { supabase } from '@/integrations/supabase/client';
import { getCurrentDateString } from '@/utils/dateHelpers';

interface MirrorParams {
  userId: string;
  workoutType: string; // various inputs like 'strength', 'cardio', etc.
  startTime: Date;
  endTime: Date;
  rpeValues?: Array<number | null | undefined>;
}

function mapType(input: string): WorkoutKind {
  return input?.toLowerCase() === 'cardio' ? 'cardio' : 'kraft';
}

function avgRpe(values?: Array<number | null | undefined>): number | null {
  if (!values) return null;
  const nums = values.map(v => (typeof v === 'number' ? v : 0)).filter(v => v > 0);
  if (!nums.length) return null;
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return Math.min(10, Math.max(1, Math.round(avg)));
}

export async function mirrorWorkoutToDailyOverview(params: MirrorParams) {
  const { userId, workoutType, startTime, endTime, rpeValues } = params;
  try {
    const durationMinutes = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 60000));
    const mappedType = mapType(workoutType);
    const intensity = avgRpe(rpeValues) ?? 5;

    const { error } = await supabase.from('workouts').insert([
      {
        user_id: userId,
        date: getCurrentDateString(),
        did_workout: true,
        workout_type: mappedType,
        duration_minutes: durationMinutes,
        intensity,
      },
    ]);

    if (error) {
      console.warn('mirrorWorkoutToDailyOverview insert failed', error);
    }
  } catch (e) {
    console.warn('mirrorWorkoutToDailyOverview error', e);
  }
}
