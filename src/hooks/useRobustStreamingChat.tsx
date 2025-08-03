import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedStreamingChat } from './useEnhancedStreamingChat';
import { useErrorRecovery } from './useErrorRecovery';

interface StreamingMessage {
  id: string;
  content: string;
  isComplete: boolean;
  isStreaming: boolean;
}

interface UseRobustStreamingChatOptions {
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
  onError?: (error: Error) => void;
}

// Stream state machine
type StreamState = 'idle' | 'connecting' | 'loading-context' | 'streaming' | 'completing' | 'error' | 'aborted';

export const useRobustStreamingChat = (options: UseRobustStreamingChatOptions = {}) => {
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
  const [streamState, setStreamState] = useState<StreamState>('idle');
  
  // Refs for managing state without stale closures
  const streamingRef = useRef<StreamingMessage | null>(null);
  const streamStateRef = useRef<StreamState>('idle');
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const retryCountRef = useRef(0);
  const lastMessageRef = useRef<{ userId: string; message: string; coachPersonality: string; history: any[] } | null>(null);
  
  const {
    metrics,
    streamingStage,
    error: streamError,
    startPerformanceTracking,
    trackContextLoaded,
    trackFirstToken,
    trackStreamingProgress,
    trackStreamingComplete,
    trackError,
    resetPerformanceTracking
  } = useEnhancedStreamingChat();

  const { executeWithRecovery, isRecovering, canRetry } = useErrorRecovery({
    maxRetries: 3,
    retryDelay: 1000,
    fallbackStrategies: ['retry', 'graceful']
  });

  // Safe state transition
  const transitionToState = useCallback((newState: StreamState) => {
    console.log(`🔄 Stream state: ${streamStateRef.current} → ${newState}`);
    streamStateRef.current = newState;
    setStreamState(newState);
  }, []);

  // Enhanced abort handling with proper cleanup
  const safeAbort = useCallback((reason = 'Manual abort') => {
    console.log(`🛑 Safe abort: ${reason}`);
    
    // Cleanup reader first
    if (readerRef.current) {
      try {
        readerRef.current.cancel();
        readerRef.current.releaseLock();
      } catch (e) {
        console.warn('Reader cleanup error:', e);
      }
      readerRef.current = null;
    }

    // Then abort controller
    if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
      abortControllerRef.current.abort(reason);
    }
    abortControllerRef.current = null;

    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    transitionToState('aborted');
  }, [transitionToState]);

  // Dynamic timeout based on stream stage
  const setupDynamicTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const getTimeoutForState = (state: StreamState): number => {
      switch (state) {
        case 'connecting': return 10000; // 10s for connection
        case 'loading-context': return 30000; // 30s for context loading
        case 'streaming': return 45000; // 45s for active streaming
        default: return 60000; // 60s fallback
      }
    };

    const timeout = getTimeoutForState(streamStateRef.current);
    timeoutRef.current = setTimeout(() => {
      console.error(`⏰ Timeout in state: ${streamStateRef.current} (${timeout}ms)`);
      trackError(`Timeout in ${streamStateRef.current} state`);
      safeAbort(`Timeout in ${streamStateRef.current}`);
      options.onError?.(new Error(`Timeout während ${streamStateRef.current === 'loading-context' ? 'Kontexterstellung' : 'Streaming'} - bitte erneut versuchen`));
    }, timeout);
  }, [safeAbort, trackError, options]);

  // Auto-retry mechanism
  const attemptAutoRetry = useCallback(async (error: Error): Promise<boolean> => {
    if (retryCountRef.current >= 3 || !lastMessageRef.current) return false;
    
    retryCountRef.current++;
    console.log(`🔄 Auto-retry attempt ${retryCountRef.current}/3`);
    
    // Wait before retry with exponential backoff
    const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 5000);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Retry the last message
    const { userId, message, coachPersonality, history } = lastMessageRef.current;
    return startStreaming(userId, message, coachPersonality, history);
  }, []);

  const startStreaming = useCallback(async (
    userId: string,
    message: string,
    coachPersonality: string,
    conversationHistory: any[] = []
  ): Promise<boolean> => {
    return executeWithRecovery(async () => {
      // Store for potential retry
      lastMessageRef.current = { userId, message, coachPersonality, history: conversationHistory };
      
      // Prevent concurrent streams
      if (streamStateRef.current !== 'idle' && streamStateRef.current !== 'error' && streamStateRef.current !== 'aborted') {
        console.warn('⚠️ Stream already active, aborting previous');
        safeAbort('New stream starting');
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Reset state
      transitionToState('connecting');
      resetPerformanceTracking();
      startPerformanceTracking();
      retryCountRef.current = 0;

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      
      // Initialize streaming message
      const messageId = `stream-${Date.now()}`;
      const newStreamingMessage = {
        id: messageId,
        content: '',
        isComplete: false,
        isStreaming: true
      };
      
      setStreamingMessage(newStreamingMessage);
      streamingRef.current = newStreamingMessage;
      options.onStreamStart?.();

      setupDynamicTimeout();

      console.log('🚀 Starting robust SSE stream...', {
        userId,
        message: message.substring(0, 50) + '...',
        messageId,
        coachPersonality,
        retryCount: retryCountRef.current
      });

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Nicht authentifiziert - bitte neu anmelden');
      }
      
      transitionToState('loading-context');
      setupDynamicTimeout();

      // MINIMAL TEST: Use minimal coach function without complex logic
      console.log('🚀 Sending POST to minimal-coach function for testing:', {
        userId,
        messageId,
        message: message.substring(0, 20) + '...'
      });
      
      const response = await fetch('https://gzczjscctgyxjyodhnhk.supabase.co/functions/v1/minimal-coach', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDc5ODIsImV4cCI6MjA2ODMyMzk4Mn0.RIEpNuSbszttym0v9KulYOxXX_Klose6QRAfEMuub1I'
        },
        body: JSON.stringify({
          userId,
          message,
          messageId,
          coachId: coachPersonality
        }),
        signal: abortControllerRef.current.signal
      });

      console.log('📥 Response received:', {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      // Check for abort before processing response
      if (abortControllerRef.current?.signal.aborted) {
        throw new Error('Anfrage abgebrochen');
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server Fehler ${response.status}: ${errorText}`);
      }

      if (!response.body) {
        throw new Error('Keine Antwort vom Server erhalten');
      }

      trackContextLoaded();
      
      console.log('✅ Context loaded, processing non-streaming response...');

      // Handle non-streaming JSON response
      const jsonResponse = await response.json();
      
      console.log('🔍 DEBUG: Response format received:', jsonResponse);
      
      // Check multiple possible response formats
      let responseContent = null;
      if (jsonResponse.response) {
        responseContent = jsonResponse.response;
      } else if (jsonResponse.message) {
        responseContent = jsonResponse.message;
      } else if (jsonResponse.content) {
        responseContent = jsonResponse.content;
      } else if (typeof jsonResponse === 'string') {
        responseContent = jsonResponse;
      } else {
        console.error('🔍 DEBUG: Unknown response format:', jsonResponse);
        throw new Error(`Unexpected response format: ${JSON.stringify(jsonResponse)}`);
      }
      
      // Update streaming message with complete response immediately
      setStreamingMessage(prev => prev ? {
        ...prev,
        content: responseContent,
        isComplete: true,
        isStreaming: false
      } : null);
      
      trackStreamingComplete();
      transitionToState('idle');
      options.onStreamEnd?.();
      
      return true;

    }).catch(async (error: Error) => {
      console.error('💥 Robust streaming error:', error);
      trackError(error.message);
      transitionToState('error');

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Try auto-retry for recoverable errors
      if (error.message.includes('aborted') && retryCountRef.current < 3) {
        console.log('🔄 Attempting auto-retry for abort error...');
        const retrySuccess = await attemptAutoRetry(error);
        if (retrySuccess) return true;
      }

      setStreamingMessage(null);
      streamingRef.current = null;
      
      // Provide user-friendly error messages
      let userMessage = 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';
      if (error.message.includes('aborted')) {
        userMessage = 'Verbindung unterbrochen. Bitte erneut versuchen.';
      } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
        userMessage = 'Timeout - der Server braucht zu lange. Bitte erneut versuchen.';
      } else if (error.message.includes('401') || error.message.includes('authentifiziert')) {
        userMessage = 'Authentifizierung abgelaufen. Bitte neu anmelden.';
      } else if (error.message.includes('500')) {
        userMessage = 'Server-Fehler. Bitte in wenigen Sekunden erneut versuchen.';
      }
      
      options.onError?.(new Error(userMessage));
      throw error;
    });
  }, [
    executeWithRecovery, transitionToState, resetPerformanceTracking, startPerformanceTracking,
    setupDynamicTimeout, trackContextLoaded, trackFirstToken, trackStreamingProgress,
    trackStreamingComplete, trackError, options, safeAbort, attemptAutoRetry
  ]);

  const stopStreaming = useCallback(() => {
    console.log('🛑 Stopping robust streaming...');
    safeAbort('Manual stop');
    setStreamingMessage(null);
    streamingRef.current = null;
    transitionToState('idle');
    options.onStreamEnd?.();
  }, [safeAbort, transitionToState, options]);

  const clearStreamingMessage = useCallback(() => {
    setStreamingMessage(null);
    streamingRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      safeAbort('Component unmount');
    };
  }, [safeAbort]);

  return {
    streamingMessage,
    isConnected: streamState === 'streaming' || streamState === 'loading-context',
    streamState,
    startStreaming,
    stopStreaming,
    clearStreamingMessage,
    
    // Enhanced status
    isRecovering,
    canRetry,
    retryCount: retryCountRef.current,
    
    // Performance metrics
    metrics,
    streamingStage,
    streamError,
    isHealthy: (metrics.firstTokenTime || 0) < 3000 && !streamError && streamState !== 'error'
  };
};