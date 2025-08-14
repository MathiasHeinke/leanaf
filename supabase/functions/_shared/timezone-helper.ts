/**
 * Backend timezone utilities for consistent date handling across edge functions
 */

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
 * Get current date string in user's timezone
 */
export const getCurrentDateInTimezone = (timezone: string = 'Europe/Berlin'): string => {
  return getDateInTimezone(new Date(), timezone);
};

/**
 * Create timezone-aware timestamp boundaries for a date
 */
export const getDateBoundariesInTimezone = (dateString: string, timezone: string) => {
  // Create start and end of day in the user's timezone
  const startTs = new Date(`${dateString}T00:00:00`);
  const endTs = new Date(`${dateString}T23:59:59`);
  
  // Convert to UTC for database storage
  const startUTC = new Date(startTs.toLocaleString('en-US', { timeZone: 'UTC' }));
  const endUTC = new Date(endTs.toLocaleString('en-US', { timeZone: 'UTC' }));
  
  return {
    start: startUTC.toISOString(),
    end: endUTC.toISOString(),
    startDate: startTs,
    endDate: endTs
  };
};

/**
 * Extract timezone from request headers
 */
export const extractTimezone = (req: Request): string => {
  return req.headers.get('x-user-timezone') || 'Europe/Berlin';
};

/**
 * Extract current date from request headers (in user's timezone)
 */
export const extractCurrentDate = (req: Request): string => {
  const headerDate = req.headers.get('x-current-date');
  if (headerDate) return headerDate;
  
  const timezone = extractTimezone(req);
  return getCurrentDateInTimezone(timezone);
};

/**
 * Parse date string and ensure it's in user's timezone context
 */
export const parseDateInTimezone = (dateString: string, timezone: string): Date => {
  // Create date assuming it's in the user's timezone
  const date = new Date(`${dateString}T12:00:00`); // Use noon to avoid DST issues
  return date;
};

/**
 * Get timezone-aware date range for queries
 */
export const getDateRangeInTimezone = (startDate: string, endDate: string, timezone: string) => {
  const start = getDateBoundariesInTimezone(startDate, timezone);
  const end = getDateBoundariesInTimezone(endDate, timezone);
  
  return {
    startUTC: start.start,
    endUTC: end.end,
    startLocal: start.startDate,
    endLocal: end.endDate
  };
};