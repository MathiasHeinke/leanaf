/**
 * Centralized date formatting utility
 * Fixes BUG-004: "0.06.2026" display issue
 * 
 * This module provides consistent German date formatting across the app,
 * handling edge cases like invalid dates, null values, and timezone issues.
 */

/**
 * Format a date to German locale string (e.g., "23.01.2026")
 * Handles null, undefined, invalid dates safely
 */
export function formatGermanDate(
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  }
): string {
  if (!date) return '—';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check for invalid date
    if (isNaN(dateObj.getTime())) {
      console.warn('[formatDate] Invalid date:', date);
      return '—';
    }
    
    return dateObj.toLocaleDateString('de-DE', options);
  } catch (error) {
    console.warn('[formatDate] Error formatting date:', date, error);
    return '—';
  }
}

/**
 * Format date with full month name (e.g., "23. Januar 2026")
 */
export function formatGermanDateLong(date: Date | string | null | undefined): string {
  return formatGermanDate(date, {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Format date with short month (e.g., "23. Jan. 2026")
 */
export function formatGermanDateMedium(date: Date | string | null | undefined): string {
  return formatGermanDate(date, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Format date as day and month only (e.g., "23. Januar")
 */
export function formatGermanDayMonth(date: Date | string | null | undefined): string {
  return formatGermanDate(date, {
    day: 'numeric',
    month: 'long'
  });
}

/**
 * Parse date parts safely for custom formatting
 * Returns null for invalid dates instead of 0-values
 */
export function parseDateParts(dateString: string | Date | null | undefined): {
  day: number;
  month: string;
  monthShort: string;
  year: number;
} | null {
  if (!dateString) return null;
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('de-DE', { month: 'long' }),
      monthShort: date.toLocaleDateString('de-DE', { month: 'short' }),
      year: date.getFullYear()
    };
  } catch {
    return null;
  }
}

/**
 * Format target date for goals display
 * Special handling for weight/goal target dates
 */
export function formatTargetDate(date: Date | string | null | undefined): string {
  if (!date) return 'Kein Zieldatum';
  
  const formatted = formatGermanDate(date);
  return formatted === '—' ? 'Ungültiges Datum' : formatted;
}

/**
 * Calculate days remaining to target date
 * Returns null for invalid dates
 */
export function getDaysRemaining(targetDate: Date | string | null | undefined): number | null {
  if (!targetDate) return null;
  
  try {
    const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
    
    if (isNaN(target.getTime())) return null;
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    
    const diffMs = target.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}
