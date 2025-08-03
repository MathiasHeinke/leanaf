import { useState, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  firstTokenTime?: number;
  totalDuration?: number;
  tokensPerSecond?: number;
  contextLoadTime?: number;
  streamingErrors?: number;
}

interface StreamingStage {
  stage: 'connecting' | 'context' | 'streaming' | 'complete' | 'error';
  progress: number;
  message?: string;
}

export function useEnhancedStreamingChat() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [streamingStage, setStreamingStage] = useState<StreamingStage>({
    stage: 'connecting',
    progress: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  
  const startTimeRef = useRef<number>(0);
  const firstTokenTimeRef = useRef<number>(0);
  const tokenCountRef = useRef<number>(0);

  const startPerformanceTracking = useCallback(() => {
    startTimeRef.current = Date.now();
    firstTokenTimeRef.current = 0;
    tokenCountRef.current = 0;
    setStreamingStage({ stage: 'connecting', progress: 0 });
    setError(null);
  }, []);

  const trackContextLoaded = useCallback(() => {
    const contextLoadTime = Date.now() - startTimeRef.current;
    setMetrics(prev => ({ ...prev, contextLoadTime }));
    setStreamingStage({ stage: 'context', progress: 25 });
  }, []);

  const trackFirstToken = useCallback(() => {
    if (firstTokenTimeRef.current === 0) {
      firstTokenTimeRef.current = Date.now() - startTimeRef.current;
      setMetrics(prev => ({ ...prev, firstTokenTime: firstTokenTimeRef.current }));
      setStreamingStage({ stage: 'streaming', progress: 50 });
    }
  }, []);

  const trackStreamingProgress = useCallback((tokensReceived: number) => {
    tokenCountRef.current = tokensReceived;
    const estimatedProgress = Math.min(90, 50 + (tokensReceived / 100) * 40);
    setStreamingStage({ stage: 'streaming', progress: estimatedProgress });
  }, []);

  const trackStreamingComplete = useCallback(() => {
    const totalDuration = Date.now() - startTimeRef.current;
    const tokensPerSecond = tokenCountRef.current / (totalDuration / 1000);
    
    setMetrics(prev => ({
      ...prev,
      totalDuration,
      tokensPerSecond: Math.round(tokensPerSecond * 100) / 100
    }));
    
    setStreamingStage({ stage: 'complete', progress: 100 });

    // Performance warnings
    if (firstTokenTimeRef.current > 3000) {
      console.warn('🐌 Slow first token time:', firstTokenTimeRef.current + 'ms');
    }
    if (tokensPerSecond < 10) {
      console.warn('🐌 Low tokens per second:', tokensPerSecond);
    }
  }, []);

  const trackError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setStreamingStage({ stage: 'error', progress: 0, message: errorMessage });
    setMetrics(prev => ({ 
      ...prev, 
      streamingErrors: (prev.streamingErrors || 0) + 1 
    }));
  }, []);

  const attemptRecovery = useCallback(() => {
    if (recoveryAttempts < 3) {
      setRecoveryAttempts(prev => prev + 1);
      setError(null);
      setStreamingStage({ stage: 'connecting', progress: 0 });
      return true;
    }
    return false;
  }, [recoveryAttempts]);

  const resetPerformanceTracking = useCallback(() => {
    setMetrics({});
    setStreamingStage({ stage: 'connecting', progress: 0 });
    setError(null);
    setRecoveryAttempts(0);
    startTimeRef.current = 0;
    firstTokenTimeRef.current = 0;
    tokenCountRef.current = 0;
  }, []);

  return {
    metrics,
    streamingStage,
    error,
    recoveryAttempts,
    
    // Tracking functions
    startPerformanceTracking,
    trackContextLoaded,
    trackFirstToken,
    trackStreamingProgress,
    trackStreamingComplete,
    trackError,
    attemptRecovery,
    resetPerformanceTracking,
    
    // Computed metrics
    isHealthy: (metrics.firstTokenTime || 0) < 2000 && (metrics.tokensPerSecond || 0) > 15,
    performanceGrade: getPerformanceGrade(metrics)
  };
}

function getPerformanceGrade(metrics: PerformanceMetrics): 'A' | 'B' | 'C' | 'D' | 'F' {
  const { firstTokenTime = 5000, tokensPerSecond = 0 } = metrics;
  
  if (firstTokenTime < 1000 && tokensPerSecond > 30) return 'A';
  if (firstTokenTime < 2000 && tokensPerSecond > 20) return 'B';
  if (firstTokenTime < 3000 && tokensPerSecond > 15) return 'C';
  if (firstTokenTime < 5000 && tokensPerSecond > 10) return 'D';
  return 'F';
}