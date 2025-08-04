import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedStreamingChat } from './useEnhancedStreamingChat';

interface StreamingMessage {
  id: string;
  content: string;
  isComplete: boolean;
  isStreaming: boolean;
}

interface UseRealStreamingChatOptions {
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
  onError?: (error: Error) => void;
}

export const useRealStreamingChat = (options: UseRealStreamingChatOptions = {}) => {
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Refs to avoid stale closures in useCallback
  const streamingRef = useRef<StreamingMessage | null>(null);
  const isConnectedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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

  const startStreaming = useCallback(async (
    userId: string,
    message: string,
    coachPersonality: string,
    conversationHistory: any[] = []
  ) => {
    try {
      // Prevent concurrent streams using refs to avoid stale closures
      if (isConnectedRef.current || streamingRef.current || abortControllerRef.current) {
        console.warn('⚠️ Streaming already active, stopping previous stream');
        stopStreaming();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Start performance tracking
      resetPerformanceTracking();
      startPerformanceTracking();

      // Create abort controller
      abortControllerRef.current = new AbortController();
      
      // Initialize streaming message and sync refs
      const messageId = `stream-${Date.now()}`;
      const newStreamingMessage = {
        id: messageId,
        content: '',
        isComplete: false,
        isStreaming: true
      };
      
      setStreamingMessage(newStreamingMessage);
      streamingRef.current = newStreamingMessage;
      
      setIsConnected(true);
      isConnectedRef.current = true;
      options.onStreamStart?.();

      // 60s timeout for hanging streams (increased from 30s due to context loading time)
      timeoutRef.current = setTimeout(() => {
        console.error('🕐 Stream timeout after 60s');
        trackError('Stream timeout after 60 seconds');
        stopStreaming();
        options.onError?.(new Error('Stream timeout - bitte versuche es erneut'));
      }, 60000);

      console.log('🚀 Starting real SSE stream...', {
        userId,
        message: message.substring(0, 50) + '...',
        messageId,
        coachPersonality
      });

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      // Start SSE stream
      const response = await fetch('https://gzczjscctgyxjyodhnhk.supabase.co/functions/v1/enhanced-coach-non-streaming', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDc5ODIsImV4cCI6MjA2ODMyMzk4Mn0.RIEpNuSbszttym0v9KulYOxXX_Klose6QRAfEMuub1I'
        },
        body: JSON.stringify({
          userId,
          message,
          messageId,
          coachId: coachPersonality,
          conversationHistory,
          enableStreaming: true,
          traceId: `stream-${messageId}`
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      if (!response.body) {
        throw new Error('No response body for streaming');
      }

      trackContextLoaded();
      console.log('✅ Context loaded, starting stream parsing...');

      // Parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let tokenCount = 0;
      let firstTokenReceived = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('✅ Stream completed');
            break;
          }

          if (abortControllerRef.current?.signal.aborted) {
            console.log('🛑 Stream aborted by user');
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events (separated by \n\n)
          let boundary;
          while ((boundary = buffer.indexOf('\n\n')) !== -1) {
            const chunk = buffer.slice(0, boundary).trim();
            buffer = buffer.slice(boundary + 2);

            if (!chunk.startsWith('data:')) continue;
            const data = chunk.slice(5).trim();
            
            if (data === '[DONE]') {
              console.log('🏁 Stream done signal received');
              trackStreamingComplete();
              setStreamingMessage(prev => prev ? { ...prev, isComplete: true, isStreaming: false } : null);
              setIsConnected(false);
              options.onStreamEnd?.();
              return;
            }

            if (data === '') continue; // Skip empty data lines

            try {
              const event = JSON.parse(data);
              
              if ((event.type === 'content' && event.content) || (event.type === 'delta' && event.delta)) {
                if (!firstTokenReceived) {
                  trackFirstToken();
                  firstTokenReceived = true;
                  console.log('🎯 First token received');
                }

                tokenCount++;
                trackStreamingProgress(tokenCount);

                setStreamingMessage(prev => {
                  if (!prev) return null;
                  const deltaContent = event.content || event.delta || '';
                  const newContent = prev.content + deltaContent;
                  const updatedMessage = {
                    ...prev,
                    content: newContent,
                    isStreaming: true,
                    isComplete: false
                  };
                  // Sync ref
                  streamingRef.current = updatedMessage;
                  return updatedMessage;
                });
              } else if (event.type === 'error') {
                console.error('❌ Stream error event:', event.error);
                trackError(event.error || 'Unknown stream error');
                throw new Error(event.error || 'Stream error occurred');
              }
            } catch (parseError) {
              console.warn('⚠️ Failed to parse SSE data:', data, parseError);
              // Continue processing other chunks
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // If we reach here without [DONE], complete the message
      console.log('📝 Completing stream without [DONE] signal');
      trackStreamingComplete();
      setStreamingMessage(prev => prev ? { ...prev, isComplete: true, isStreaming: false } : null);
      setIsConnected(false);
      options.onStreamEnd?.();

    } catch (error) {
      console.error('💥 Real streaming error:', error);
      trackError((error as Error).message);
      setIsConnected(false);
      setStreamingMessage(null);
      options.onError?.(error as Error);
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [options, startPerformanceTracking, trackContextLoaded, trackFirstToken, trackStreamingProgress, trackStreamingComplete, trackError, resetPerformanceTracking]);

  const stopStreaming = useCallback(() => {
    console.log('🛑 Stopping real streaming...');
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setIsConnected(false);
    isConnectedRef.current = false;
    setStreamingMessage(null);
    streamingRef.current = null;
    options.onStreamEnd?.();
  }, [options]);

  const clearStreamingMessage = useCallback(() => {
    setStreamingMessage(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, [stopStreaming]);

  return {
    streamingMessage,
    isConnected,
    startStreaming,
    stopStreaming,
    clearStreamingMessage,
    
    // Performance metrics
    metrics,
    streamingStage,
    streamError,
    isHealthy: (metrics.firstTokenTime || 0) < 3000 && !streamError
  };
};