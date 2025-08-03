import { useCallback, useState } from 'react';

interface ErrorRecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  fallbackStrategies?: string[];
}

interface RecoveryState {
  isRecovering: boolean;
  attempts: number;
  lastError: string | null;
  strategy: string | null;
}

export function useErrorRecovery(options: ErrorRecoveryOptions = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    fallbackStrategies = ['retry', 'fallback-endpoint', 'offline-mode']
  } = options;

  const [recoveryState, setRecoveryState] = useState<RecoveryState>({
    isRecovering: false,
    attempts: 0,
    lastError: null,
    strategy: null
  });

  const executeWithRecovery = useCallback(async function<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          setRecoveryState({
            isRecovering: true,
            attempts: attempt,
            lastError: lastError?.message || null,
            strategy: fallbackStrategies[Math.min(attempt - 1, fallbackStrategies.length - 1)]
          });
          
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }

        const result = await operation();
        
        // Success - reset recovery state
        setRecoveryState({
          isRecovering: false,
          attempts: 0,
          lastError: null,
          strategy: null
        });
        
        return result;
      } catch (error: any) {
        lastError = error;
        console.warn(`❌ Attempt ${attempt + 1} failed in ${context}:`, error.message);
        
        // If this was the last attempt, don't continue
        if (attempt === maxRetries) {
          setRecoveryState({
            isRecovering: false,
            attempts: attempt + 1,
            lastError: error.message,
            strategy: 'exhausted'
          });
          throw error;
        }
      }
    }
    
    throw lastError!;
  }, [maxRetries, retryDelay, fallbackStrategies]);

  const resetRecovery = useCallback(() => {
    setRecoveryState({
      isRecovering: false,
      attempts: 0,
      lastError: null,
      strategy: null
    });
  }, []);

  const getRecoveryAdvice = useCallback((error: string): string => {
    if (error.includes('timeout')) {
      return 'Netzwerk zu langsam - versuche es in einem Moment erneut';
    }
    if (error.includes('429') || error.includes('rate limit')) {
      return 'Zu viele Anfragen - warte einen Moment';
    }
    if (error.includes('network') || error.includes('fetch')) {
      return 'Verbindungsproblem - prüfe deine Internetverbindung';
    }
    if (error.includes('auth')) {
      return 'Autorisierungsfehler - lade die Seite neu';
    }
    return 'Technisches Problem - wird automatisch behoben';
  }, []);

  return {
    recoveryState,
    executeWithRecovery,
    resetRecovery,
    getRecoveryAdvice,
    isRecovering: recoveryState.isRecovering,
    canRetry: recoveryState.attempts < maxRetries
  };
}