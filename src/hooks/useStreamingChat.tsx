import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StreamingMessage {
  id: string;
  content: string;
  isComplete: boolean;
  isStreaming: boolean;
}

interface UseStreamingChatOptions {
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
  onError?: (error: Error) => void;
}

export const useStreamingChat = (options: UseStreamingChatOptions = {}) => {
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStreaming = useCallback(async (
    userId: string,
    message: string,
    coachPersonality: string,
    conversationHistory: any[] = []
  ) => {
    try {
      // Prevent multiple concurrent streams
      if (isConnected || streamingMessage || abortControllerRef.current) {
        console.warn('⚠️ Streaming already active, stopping previous stream');
        stopStreaming();
        // Wait briefly for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();
      
      // Initialize streaming message
      const messageId = `stream-${Date.now()}`;
      setStreamingMessage({
        id: messageId,
        content: '',
        isComplete: false,
        isStreaming: true
      });

      setIsConnected(true);
      options.onStreamStart?.();

      // 🚀 PRODUCTION-READY: Direct fetch with mobile Safari fallback
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      // Check for mobile Safari
      const isMobileSafari = /iPhone|iPad|iPod|Safari/i.test(navigator.userAgent) && 
                           !/Chrome|Firefox/i.test(navigator.userAgent);
      
      let streamUrl: string;
      let requestOptions: RequestInit;
      
      if (isMobileSafari) {
        // GET fallback for mobile Safari
        console.log('📱 Using GET fallback for Mobile Safari');
        const params = new URLSearchParams({
          userId,
          message: message.substring(0, 500), // Limit for URL length  
          messageId,
          coachId: coachPersonality
        });
        streamUrl = `${SUPABASE_URL}/functions/v1/unified-coach-engine?${params.toString()}`;
        requestOptions = {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          signal: abortControllerRef.current.signal
        };
      } else {
        // Standard POST request
        streamUrl = `${SUPABASE_URL}/functions/v1/unified-coach-engine`;
        requestOptions = {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            message,
            messageId,
            coachPersonality,
            conversationHistory,
            enableStreaming: true
          }),
          signal: abortControllerRef.current.signal
        };
      }

      const response = await fetch(streamUrl, requestOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let content = '';

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            content += chunk;
            
            // Update streaming message
            setStreamingMessage(prev => prev ? {
              ...prev,
              content: content
            } : null);
          }
        } finally {
          reader.releaseLock();
        }
      }

      // Mark as complete
      setStreamingMessage(prev => prev ? {
        ...prev,
        isComplete: true,
        isStreaming: false
      } : null);

      options.onStreamEnd?.();

    } catch (error) {
      console.error('Streaming error:', error);
      setIsConnected(false);
      setStreamingMessage(null);
      options.onError?.(error as Error);
    }
  }, [options]);

  const simulateStreaming = async (messageId: string, fullContent: string) => {
    const words = fullContent.split(' ');
    let currentContent = '';
    
    for (let i = 0; i < words.length; i++) {
      if (abortControllerRef.current?.signal.aborted) {
        break;
      }
      
      currentContent += (i > 0 ? ' ' : '') + words[i];
      
      setStreamingMessage({
        id: messageId,
        content: currentContent,
        isComplete: i === words.length - 1,
        isStreaming: i < words.length - 1
      });
      
      // Add slight delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    setIsConnected(false);
    options.onStreamEnd?.();
  };

  const stopStreaming = useCallback(() => {
    console.log('🛑 Stopping streaming...');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setIsConnected(false);
    setStreamingMessage(null);
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
    clearStreamingMessage
  };
};