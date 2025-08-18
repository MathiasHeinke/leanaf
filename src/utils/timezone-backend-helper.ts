// Backend timezone helper for consistent date handling
import { getUserTimezone } from './dateHelpers';

/**
 * Get date in specific timezone as YYYY-MM-DD string
 */
export const getDateInTimezone = (date: Date, timezone: string): string => {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  return formatter.format(date);
};

/**
 * Get current date string in user's timezone (for backend use)
 */
export const getCurrentDateInTimezone = (timezone: string = 'Europe/Berlin'): string => {
  return getDateInTimezone(new Date(), timezone);
};

/**
 * Convert user's local date to UTC boundaries for database queries
 */
export const getDateBoundariesInTimezone = (dateString: string, timezone: string) => {
  const startOfDay = new Date(`${dateString}T00:00:00`);
  const nextDayStart = new Date(`${dateString}T00:00:00`);
  nextDayStart.setDate(nextDayStart.getDate() + 1);

  const startInTz = new Date(startOfDay.toLocaleString('en-US', { timeZone: timezone }));
  const nextDayStartInTz = new Date(nextDayStart.toLocaleString('en-US', { timeZone: timezone }));

  const startUTC = new Date(startOfDay.getTime() + (startOfDay.getTime() - startInTz.getTime()));
  const endUTC = new Date(nextDayStart.getTime() + (nextDayStart.getTime() - nextDayStartInTz.getTime()));

  return {
    start: startUTC.toISOString(),
    end: endUTC.toISOString()
  };
};

/**
 * Get timezone offset for backend operations
 */
export const getTimezoneOffset = (timezone: string = 'Europe/Berlin'): number => {
  const now = new Date();
  const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
  const target = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
  return Math.round((target.getTime() - utc.getTime()) / 60000); // in minutes
};

/**
 * Create timezone-aware request headers
 */
export const createTimezoneHeaders = (): Record<string, string> => {
  const timezone = getUserTimezone();
  return {
    'x-user-timezone': timezone,
    'x-current-date': getCurrentDateInTimezone(timezone)
  };
};