/**
 * Smart Scheduling Logic for Supplement Cycling
 * Handles daily, weekly, cycle-based, and training-day schedules
 */
import { differenceInDays, getDay } from 'date-fns';

export type ScheduleType = 'daily' | 'weekly' | 'cycle' | 'training_days';

export interface SupplementSchedule {
  type: ScheduleType;
  cycle_on_days?: number;    // e.g., 5 (Ashwagandha: 5 On)
  cycle_off_days?: number;   // e.g., 2 (Ashwagandha: 2 Off)
  weekdays?: number[];       // 0=Sunday, 1=Monday... (High-dose Vitamin D: only Monday)
  start_date?: string;       // Start date for cycle calculation
}

/**
 * Determines if a supplement should be shown in today's timeline
 * based on its schedule configuration
 */
export function shouldShowSupplement(
  schedule: SupplementSchedule | null | undefined,
  targetDate: Date = new Date()
): boolean {
  // Default to showing (daily schedule)
  if (!schedule || schedule.type === 'daily') return true;

  // Weekly schedule (e.g., "Only on Mondays")
  if (schedule.type === 'weekly' && schedule.weekdays?.length) {
    return schedule.weekdays.includes(getDay(targetDate));
  }

  // Cycle schedule (e.g., Ashwagandha 5 On / 2 Off)
  if (
    schedule.type === 'cycle' &&
    schedule.cycle_on_days &&
    schedule.cycle_off_days &&
    schedule.start_date
  ) {
    const daysSinceStart = differenceInDays(targetDate, new Date(schedule.start_date));
    const cycleLength = schedule.cycle_on_days + schedule.cycle_off_days;
    // Handle negative days (before start date)
    const dayInCycle = ((daysSinceStart % cycleLength) + cycleLength) % cycleLength;
    return dayInCycle < schedule.cycle_on_days;
  }

  // Training days (placeholder - needs training plan integration)
  if (schedule.type === 'training_days') {
    // TODO: Check if today is a training day from the user's schedule
    return true;
  }

  return true;
}

/**
 * Returns a human-readable label for cycling protocols
 */
export function getScheduleLabel(cyclingProtocol: string | null | undefined): string | null {
  if (!cyclingProtocol) return null;

  const labels: Record<string, string> = {
    '5_on_2_off': 'Zyklus: 5 Tage an, 2 Pause',
    '4_weeks_on_1_off': 'Zyklus: 4 Wochen an, 1 Pause',
    'weekly': 'Einmal wöchentlich',
    'training_days': 'Nur Trainingstage',
  };

  return labels[cyclingProtocol] || cyclingProtocol;
}

/**
 * Parses a cycling protocol string into a SupplementSchedule object
 */
export function parseScheduleFromProtocol(protocol: string | null | undefined): SupplementSchedule {
  if (!protocol) return { type: 'daily' };

  if (protocol === '5_on_2_off') {
    return {
      type: 'cycle',
      cycle_on_days: 5,
      cycle_off_days: 2,
      start_date: new Date().toISOString(),
    };
  }

  if (protocol === '4_weeks_on_1_off') {
    return {
      type: 'cycle',
      cycle_on_days: 28,
      cycle_off_days: 7,
      start_date: new Date().toISOString(),
    };
  }

  if (protocol === 'weekly') {
    return { type: 'weekly', weekdays: [1] }; // Default: Monday
  }

  if (protocol === 'training_days') {
    return { type: 'training_days' };
  }

  return { type: 'daily' };
}

/**
 * Gets the number of days remaining in the current cycle phase
 */
export function getDaysRemainingInPhase(
  schedule: SupplementSchedule | null | undefined,
  targetDate: Date = new Date()
): { isOnPhase: boolean; daysRemaining: number } | null {
  if (!schedule || schedule.type !== 'cycle') return null;
  if (!schedule.cycle_on_days || !schedule.cycle_off_days || !schedule.start_date) return null;

  const daysSinceStart = differenceInDays(targetDate, new Date(schedule.start_date));
  const cycleLength = schedule.cycle_on_days + schedule.cycle_off_days;
  const dayInCycle = ((daysSinceStart % cycleLength) + cycleLength) % cycleLength;

  const isOnPhase = dayInCycle < schedule.cycle_on_days;
  const daysRemaining = isOnPhase
    ? schedule.cycle_on_days - dayInCycle
    : cycleLength - dayInCycle;

  return { isOnPhase, daysRemaining };
}
