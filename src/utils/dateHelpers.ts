
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isToday, isPast, isFuture } from 'date-fns';
import { de } from 'date-fns/locale';

// Default timezone for Germany
export const DEFAULT_TIMEZONE = 'Europe/Berlin';

/**
 * Get the user's timezone from localStorage or default to Europe/Berlin
 */
export const getUserTimezone = (): string => {
  return localStorage.getItem('user-timezone') || DEFAULT_TIMEZONE;
};

/**
 * Save the user's timezone preference
 */
export const setUserTimezone = (timezone: string): void => {
  localStorage.setItem('user-timezone', timezone);
};

/**
 * Get current date in user's timezone as YYYY-MM-DD string
 */
export const getCurrentDateString = (): string => {
  const timezone = getUserTimezone();
  return getCurrentDateInTimezone(timezone);
};

/**
 * Get current date in specific timezone as YYYY-MM-DD string
 */
export const getCurrentDateInTimezone = (timezone: string): string => {
  const now = new Date();
  
  // Convert to user timezone and format as YYYY-MM-DD
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  return formatter.format(now);
};

/**
 * Convert a date to YYYY-MM-DD string in user's timezone
 */
export const toDateString = (date: Date): string => {
  const timezone = getUserTimezone();
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  return formatter.format(date);
};

/**
 * Format date for display in German locale
 */
export const formatDisplayDate = (date: Date | string, formatPattern: string = 'EEEE, d. MMMM'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatPattern, { locale: de });
};

/**
 * Check if a date string represents today
 */
export const isDateToday = (dateString: string): boolean => {
  const today = getCurrentDateString();
  return dateString === today;
};

/**
 * Check if a date string represents a past date
 */
export const isDatePast = (dateString: string): boolean => {
  const today = getCurrentDateString();
  return dateString < today;
};

/**
 * Check if a date string represents a future date
 */
export const isDateFuture = (dateString: string): boolean => {
  const today = getCurrentDateString();
  return dateString > today;
};

/**
 * Get start and end of current week
 */
export const getCurrentWeekBounds = () => {
  const now = new Date();
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }), // Monday
    end: endOfWeek(now, { weekStartsOn: 1 })
  };
};

/**
 * Get week bounds for a given date
 */
export const getWeekBounds = (date: Date) => {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 })
  };
};

/**
 * Navigate to previous week
 */
export const getPreviousWeek = (currentWeekStart: Date): Date => {
  return subWeeks(currentWeekStart, 1);
};

/**
 * Navigate to next week
 */
export const getNextWeek = (currentWeekStart: Date): Date => {
  return addWeeks(currentWeekStart, 1);
};

/**
 * Get days of week starting from Monday
 */
export const getWeekDays = (weekStart: Date): Date[] => {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    days.push(day);
  }
  return days;
};

/**
 * Common timezone options for settings
 */
export const TIMEZONE_OPTIONS = [
  { value: 'Europe/Berlin', label: 'Deutschland (Berlin)' },
  { value: 'Europe/Vienna', label: 'Österreich (Wien)' },
  { value: 'Europe/Zurich', label: 'Schweiz (Zürich)' },
  { value: 'Europe/London', label: 'Großbritannien (London)' },
  { value: 'America/New_York', label: 'USA (New York)' },
  { value: 'America/Los_Angeles', label: 'USA (Los Angeles)' },
  { value: 'Asia/Tokyo', label: 'Japan (Tokyo)' },
  { value: 'Australia/Sydney', label: 'Australien (Sydney)' }
];
