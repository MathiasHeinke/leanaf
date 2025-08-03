import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StreamingChatOptions {
  onTokenReceived?: (token: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}

export const useStreamingChat = (options: StreamingChatOptions = {}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStreaming = useCallback(async (
    endpoint: string,
    requestBody: any
  ) => {
    try {
      setIsStreaming(true);
      setStreamedContent('');
      
      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();
      
      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: requestBody,
        headers: {
          'Accept': 'text/event-stream',
        }
      });

      if (error) throw error;

      // For now, return the full response
      // TODO: Implement proper SSE streaming
      const fullResponse = data?.response || data?.content || '';
      setStreamedContent(fullResponse);
      options.onComplete?.(fullResponse);
      
    } catch (error) {
      console.error('Streaming error:', error);
      options.onError?.(error as Error);
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [options]);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  }, []);

  return {
    isStreaming,
    streamedContent,
    startStreaming,
    stopStreaming
  };
};