import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique message ID for idempotency - pure UUID format
 */
export const generateMessageId = (): string => {
  return uuidv4();
};

/**
 * Check if a message should show retry option
 */
export const shouldShowRetry = (status?: string): boolean => {
  return status === 'failed';
};

/**
 * Get status badge for message
 */
export const getStatusBadge = (status?: string): { text: string; variant: string } | null => {
  switch (status) {
    case 'sending':
      return { text: 'Sending...', variant: 'secondary' };
    case 'failed':
      return { text: 'Failed', variant: 'destructive' };
    default:
      return null;
  }
};

/**
 * Timeout promise for race conditions
 */
export const createTimeoutPromise = (ms: number): Promise<never> => {
  return new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  );
};