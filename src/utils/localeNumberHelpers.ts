// Locale-aware number parsing and formatting utilities

/**
 * Parses a locale-aware number string (supports both comma and period as decimal separator)
 * @param value - The string value to parse (e.g., "22,5" or "22.5")
 * @returns The parsed float value or NaN if invalid
 */
export const parseLocaleFloat = (value: string): number => {
  if (!value || typeof value !== 'string') return NaN;
  
  // Replace comma with period for JavaScript parsing
  const normalizedValue = value.replace(',', '.');
  return parseFloat(normalizedValue);
};

/**
 * Validates if a string is a valid locale number (supports comma and period)
 * @param value - The string to validate
 * @param allowDecimals - Whether to allow decimal values
 * @returns True if valid number format
 */
export const isValidLocaleNumber = (value: string, allowDecimals: boolean = true): boolean => {
  if (!value || value === '') return true; // Empty is valid
  
  // Create regex pattern based on allowDecimals
  const pattern = allowDecimals ? /^[0-9]*[,.]?[0-9]*$/ : /^[0-9]*$/;
  
  return pattern.test(value);
};

/**
 * Normalizes a locale number string to use period as decimal separator
 * @param value - The input value
 * @returns Normalized string with period as decimal separator
 */
export const normalizeDecimalSeparator = (value: string): string => {
  if (!value || typeof value !== 'string') return value;
  
  // Replace comma with period
  return value.replace(',', '.');
};

/**
 * Safely converts a number value to string for display
 * @param value - The number or string value
 * @returns String representation, empty if undefined/null
 */
export const toDisplayValue = (value: string | number | undefined | null): string => {
  if (value === undefined || value === null) return '';
  return String(value);
};