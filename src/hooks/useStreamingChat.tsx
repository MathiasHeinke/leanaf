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

      // Call the unified coach engine with streaming enabled
      const { data, error } = await supabase.functions.invoke('unified-coach-engine', {
        body: {
          userId,
          message,
          coachPersonality,
          conversationHistory,
          enableStreaming: true
        },
        headers: {
          'Accept': 'text/event-stream',
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // For now, handle the response directly since Supabase client doesn't support SSE yet
      // In a real implementation, you'd parse the SSE stream
      const content = data?.response || data?.content || '';
      
      // Simulate streaming by chunking the response
      if (content) {
        await simulateStreaming(messageId, content);
      }

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