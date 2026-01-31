/**
 * Smart Scheduling Logic for Supplement Cycling
 * Handles daily, weekly, cycle-based, and training-day schedules
 */
import { differenceInDays, getDay, addDays } from 'date-fns';

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

/**
 * Extended Cycle Schedule interface for advanced cycling management
 */
export interface CycleScheduleExtended {
  type: 'cycle';
  cycle_on_days: number;
  cycle_off_days: number;
  start_date: string;           // ISO Date - when cycling began
  is_on_cycle?: boolean;        // Current phase (true = on, false = off)
  current_cycle_start?: string; // When current phase began
  total_cycles_completed?: number;
}

/**
 * Complete cycle status for UI display
 */
export interface CycleStatus {
  isOnCycle: boolean;
  currentDay: number;        // Day 1-N in current phase
  totalDays: number;         // Total days in current phase (on or off)
  daysRemaining: number;
  progressPercent: number;   // 0-100
  nextPhaseDate: Date;
  cycleNumber: number;
  isTransitionDay: boolean;  // Last day of phase
  compliancePercent: number; // How often taken (0-100)
  phaseLabel: string;        // "Tag 5/30" or "Pause: 3d"
}

/**
 * Calculate detailed cycle status for a supplement
 * Supports both legacy schedule format and extended format
 */
export function getCycleStatus(
  schedule: CycleScheduleExtended | SupplementSchedule | null | undefined,
  intakeCountInCurrentPhase?: number,
  targetDate: Date = new Date()
): CycleStatus | null {
  if (!schedule || schedule.type !== 'cycle') return null;
  if (!schedule.cycle_on_days || !schedule.cycle_off_days || !schedule.start_date) return null;

  const extSchedule = schedule as CycleScheduleExtended;
  
  // Determine if we have extended schedule data or need to calculate
  const hasExtendedData = extSchedule.current_cycle_start !== undefined && extSchedule.is_on_cycle !== undefined;
  
  let isOnCycle: boolean;
  let currentDay: number;
  let totalDays: number;
  let phaseStartDate: Date;
  let totalCyclesCompleted: number;
  
  if (hasExtendedData) {
    // Use extended schedule data directly
    isOnCycle = extSchedule.is_on_cycle!;
    phaseStartDate = new Date(extSchedule.current_cycle_start!);
    totalDays = isOnCycle ? schedule.cycle_on_days : schedule.cycle_off_days;
    const daysSincePhaseStart = differenceInDays(targetDate, phaseStartDate);
    currentDay = Math.max(1, Math.min(daysSincePhaseStart + 1, totalDays));
    totalCyclesCompleted = extSchedule.total_cycles_completed || 0;
  } else {
    // Calculate from start_date (legacy mode)
    const daysSinceStart = differenceInDays(targetDate, new Date(schedule.start_date));
    const cycleLength = schedule.cycle_on_days + schedule.cycle_off_days;
    const dayInCycle = ((daysSinceStart % cycleLength) + cycleLength) % cycleLength;
    
    isOnCycle = dayInCycle < schedule.cycle_on_days;
    totalDays = isOnCycle ? schedule.cycle_on_days : schedule.cycle_off_days;
    
    // Calculate current day within phase
    if (isOnCycle) {
      currentDay = dayInCycle + 1;
    } else {
      currentDay = dayInCycle - schedule.cycle_on_days + 1;
    }
    
    // Calculate cycles completed
    totalCyclesCompleted = Math.floor(daysSinceStart / cycleLength);
    
    // Calculate phase start for nextPhaseDate
    const phaseStartDayInCycle = isOnCycle ? 0 : schedule.cycle_on_days;
    const daysFromCycleStart = dayInCycle - phaseStartDayInCycle;
    phaseStartDate = addDays(targetDate, -daysFromCycleStart);
  }
  
  const daysRemaining = Math.max(0, totalDays - currentDay);
  const progressPercent = Math.round((currentDay / totalDays) * 100);
  const nextPhaseDate = addDays(phaseStartDate, totalDays);
  const isTransitionDay = daysRemaining === 0;
  
  // Calculate compliance (only during on-cycle)
  let compliancePercent = 100;
  if (isOnCycle && intakeCountInCurrentPhase !== undefined && currentDay > 0) {
    compliancePercent = Math.min(100, Math.round((intakeCountInCurrentPhase / currentDay) * 100));
  }
  
  // Generate phase label
  const phaseLabel = isOnCycle 
    ? `Tag ${currentDay}/${totalDays}`
    : `Pause: ${daysRemaining}d`;

  return {
    isOnCycle,
    currentDay,
    totalDays,
    daysRemaining,
    progressPercent,
    nextPhaseDate,
    cycleNumber: totalCyclesCompleted + 1,
    isTransitionDay,
    compliancePercent,
    phaseLabel,
  };
}

/**
 * Check if a cycling supplement should be taken today
 */
export function isCycleActiveToday(
  schedule: CycleScheduleExtended | SupplementSchedule | null | undefined,
  targetDate: Date = new Date()
): boolean {
  const status = getCycleStatus(schedule, undefined, targetDate);
  return status ? status.isOnCycle : true; // Default to active if no cycle
}
