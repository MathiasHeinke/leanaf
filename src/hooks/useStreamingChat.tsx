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

      // 🚀 PRODUCTION-READY: Use Supabase client directly
      console.log('🚀 Starting unified coach stream...');
      
      const response = await supabase.functions.invoke('unified-coach-engine', {
        body: {
          userId,
          message,
          messageId,
          coachPersonality,
          conversationHistory,
          enableStreaming: true
        }
      });

      if (response.error) {
        console.error('❌ Supabase function error:', response.error);
        throw new Error(`Coach engine error: ${response.error.message}`);
      }

      // Handle successful response
      if (response.data) {
        const responseContent = response.data.content || response.data.message || response.data.response || 'Response received';
        console.log('✅ Coach response received, simulating stream');
        await simulateStreaming(messageId, responseContent);
        return;
      }

      // If no data, show fallback
      console.warn('⚠️ No response data, using fallback');
      await simulateStreaming(messageId, 'Entschuldigung, es gab ein technisches Problem. Bitte versuche es erneut.');

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