import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SimpleStreamingMessage {
  id: string;
  content: string;
  isComplete: boolean;
  isStreaming: boolean;
}

export const useSimpleStreamingChat = () => {
  const [streamingMessage, setStreamingMessage] = useState<SimpleStreamingMessage | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStreaming = useCallback(async (
    userId: string,
    message: string,
    coachId: string,
    conversationHistory: any[] = []
  ) => {
    try {
      console.log('🚀 Starting simple stream for Lucy');
      
      // Stop any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      const messageId = `stream-${Date.now()}`;
      setStreamingMessage({
        id: messageId,
        content: '',
        isComplete: false,
        isStreaming: true
      });
      
      setIsConnected(true);
      setError(null);

      // Call unified coach engine
      const response = await supabase.functions.invoke('unified-coach-engine', {
        body: {
          userId,
          message,
          messageId,
          coachId,
          conversationHistory,
          enableStreaming: false // Use non-streaming for now to fix Lucy
        }
      });

      if (response.error) {
        console.error('❌ Coach response error:', response.error);
        setError(`Error: ${response.error.message}`);
        setStreamingMessage(null);
        setIsConnected(false);
        return;
      }

      // Success - simulate streaming for smooth UX
      const responseContent = response.data?.content || response.data?.message || 'Antwort erhalten!';
      console.log('✅ Coach response received:', responseContent.substring(0, 100));
      
      await simulateStreaming(messageId, responseContent);
      
    } catch (error) {
      console.error('❌ Streaming error:', error);
      setError(`Fehler: ${(error as Error).message}`);
      setStreamingMessage(null);
      setIsConnected(false);
    }
  }, []);

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
      
      // Faster streaming for better UX
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    
    setIsConnected(false);
  };

  const stopStreaming = useCallback(() => {
    console.log('🛑 Stopping streaming...');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setIsConnected(false);
    setStreamingMessage(null);
    setError(null);
  }, []);

  const clearStreamingMessage = useCallback(() => {
    setStreamingMessage(null);
    setError(null);
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
    error,
    startStreaming,
    stopStreaming,
    clearStreamingMessage
  };
};