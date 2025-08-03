import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterRange: number;
}

interface RetryAttempt {
  attemptNumber: number;
  timestamp: Date;
  error?: string;
  duration?: number;
  success: boolean;
}

interface RetryState {
  messageId: string;
  attempts: RetryAttempt[];
  isRetrying: boolean;
  nextRetryIn?: number;
  canRetry: boolean;
}

interface PerformanceMetrics {
  averageResponseTime: number;
  successRate: number;
  errorPatterns: Record<string, number>;
  totalRequests: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitterRange: 0.1
};

export const useAdvancedRetryLogic = (config: Partial<RetryConfig> = {}) => {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const [retryStates, setRetryStates] = useState<Record<string, RetryState>>({});
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    averageResponseTime: 0,
    successRate: 0,
    errorPatterns: {},
    totalRequests: 0
  });
  const timeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});

  const calculateDelay = useCallback((attemptNumber: number): number => {
    const exponentialDelay = Math.min(
      retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attemptNumber - 1),
      retryConfig.maxDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = exponentialDelay * retryConfig.jitterRange * (Math.random() - 0.5);
    return Math.max(0, exponentialDelay + jitter);
  }, [retryConfig]);

  const updatePerformanceMetrics = useCallback((
    success: boolean, 
    duration: number, 
    error?: string
  ) => {
    setPerformanceMetrics(prev => {
      const newTotal = prev.totalRequests + 1;
      const newSuccessRate = success 
        ? ((prev.successRate * prev.totalRequests) + 1) / newTotal
        : (prev.successRate * prev.totalRequests) / newTotal;
      
      const newAverageResponseTime = 
        ((prev.averageResponseTime * prev.totalRequests) + duration) / newTotal;

      const newErrorPatterns = { ...prev.errorPatterns };
      if (error) {
        const errorType = categorizeError(error);
        newErrorPatterns[errorType] = (newErrorPatterns[errorType] || 0) + 1;
      }

      return {
        averageResponseTime: newAverageResponseTime,
        successRate: newSuccessRate,
        errorPatterns: newErrorPatterns,
        totalRequests: newTotal
      };
    });
  }, []);

  const categorizeError = (error: string): string => {
    if (error.includes('timeout')) return 'timeout';
    if (error.includes('network')) return 'network';
    if (error.includes('401') || error.includes('403')) return 'auth';
    if (error.includes('429')) return 'rate_limit';
    if (error.includes('500')) return 'server_error';
    return 'unknown';
  };

  const shouldRetry = useCallback((error: string, attemptNumber: number): boolean => {
    if (attemptNumber >= retryConfig.maxAttempts) return false;
    
    // Don't retry client errors (400-499) except rate limiting
    if (error.includes('400') && !error.includes('429')) return false;
    if (error.includes('401') || error.includes('403')) return false;
    
    // Retry server errors, timeouts, and network issues
    return true;
  }, [retryConfig.maxAttempts]);

  const executeWithRetry = useCallback(async <T,>(
    operation: () => Promise<T>,
    messageId?: string
  ): Promise<T> => {
    const id = messageId || uuidv4();
    const startTime = Date.now();
    
    // Initialize retry state
    setRetryStates(prev => ({
      ...prev,
      [id]: {
        messageId: id,
        attempts: [],
        isRetrying: false,
        canRetry: true
      }
    }));

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        // Update retry state
        setRetryStates(prev => ({
          ...prev,
          [id]: {
            ...prev[id],
            isRetrying: attempt > 1,
            attempts: [
              ...prev[id].attempts,
              {
                attemptNumber: attempt,
                timestamp: new Date(),
                success: false
              }
            ]
          }
        }));

        const result = await operation();
        const duration = Date.now() - startTime;
        
        // Success - update metrics and state
        updatePerformanceMetrics(true, duration);
        setRetryStates(prev => ({
          ...prev,
          [id]: {
            ...prev[id],
            isRetrying: false,
            attempts: prev[id].attempts.map((att, idx) => 
              idx === prev[id].attempts.length - 1 
                ? { ...att, success: true, duration }
                : att
            )
          }
        }));

        return result;

      } catch (error) {
        lastError = error as Error;
        const duration = Date.now() - startTime;
        
        // Update attempt with error
        setRetryStates(prev => ({
          ...prev,
          [id]: {
            ...prev[id],
            attempts: prev[id].attempts.map((att, idx) => 
              idx === prev[id].attempts.length - 1 
                ? { ...att, error: lastError?.message, duration, success: false }
                : att
            )
          }
        }));

        const shouldRetryThis = shouldRetry(lastError.message, attempt);
        
        if (!shouldRetryThis || attempt === retryConfig.maxAttempts) {
          // Final failure
          updatePerformanceMetrics(false, duration, lastError.message);
          setRetryStates(prev => ({
            ...prev,
            [id]: {
              ...prev[id],
              isRetrying: false,
              canRetry: false
            }
          }));
          throw lastError;
        }

        // Schedule next retry
        const delay = calculateDelay(attempt);
        setRetryStates(prev => ({
          ...prev,
          [id]: {
            ...prev[id],
            nextRetryIn: delay
          }
        }));

        await new Promise(resolve => {
          timeoutRefs.current[id] = setTimeout(resolve, delay);
        });
      }
    }

    throw lastError;
  }, [retryConfig, shouldRetry, calculateDelay, updatePerformanceMetrics]);

  const manualRetry = useCallback(async (messageId: string, operation: () => Promise<any>) => {
    const state = retryStates[messageId];
    if (!state || !state.canRetry) return null;

    return executeWithRetry(operation, messageId);
  }, [retryStates, executeWithRetry]);

  const cancelRetry = useCallback((messageId: string) => {
    if (timeoutRefs.current[messageId]) {
      clearTimeout(timeoutRefs.current[messageId]);
      delete timeoutRefs.current[messageId];
    }
    
    setRetryStates(prev => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        isRetrying: false,
        canRetry: false
      }
    }));
  }, []);

  const getRetryInfo = useCallback((messageId: string) => {
    return retryStates[messageId] || null;
  }, [retryStates]);

  const clearRetryHistory = useCallback(() => {
    // Cancel all pending retries
    Object.keys(timeoutRefs.current).forEach(cancelRetry);
    setRetryStates({});
  }, [cancelRetry]);

  return {
    executeWithRetry,
    manualRetry,
    cancelRetry,
    getRetryInfo,
    clearRetryHistory,
    performanceMetrics,
    retryStates
  };
};