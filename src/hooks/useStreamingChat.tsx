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

      // 🚀 PRODUCTION-READY: Enhanced error handling with fallback
      console.log('🚀 Starting unified coach stream...', {
        userId,
        message: message.substring(0, 50) + '...',
        messageId,
        coachPersonality,
        conversationHistory: conversationHistory?.length || 0,
        enableStreaming: true
      });
      
      let response;
      try {
        response = await supabase.functions.invoke('enhanced-coach-non-streaming', {
          body: {
            userId,
            message,
            messageId,
            coachId: coachPersonality, // Using coachId as expected by Edge Function
            conversationHistory,
            enableStreaming: true,
            traceId: `stream-${messageId}`
          }
        });

        if (response.error) {
          console.error('❌ Supabase function error:', response.error);
          
          // Check if it's a 400 error (parameter validation)
          if (response.error.message?.includes('400') || response.error.message?.includes('Missing required parameters')) {
            throw new Error(`Parametervalidierung fehlgeschlagen: ${response.error.message}. Bitte überprüfe die Eingabeparameter.`);
          }
          
          // Try direct HTTP call as fallback
          console.log('🔄 Attempting direct HTTP fallback...');
          const { data: { session } } = await supabase.auth.getSession();
          
          const fallbackResponse = await fetch('https://gzczjscctgyxjyodhnhk.supabase.co/functions/v1/enhanced-coach-non-streaming', {
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
              coachId: coachPersonality, // Using coachId for consistency
              conversationHistory,
              enableStreaming: true,
              traceId: `stream-fallback-${messageId}`
            })
          });
          
          if (!fallbackResponse.ok) {
            const errorText = await fallbackResponse.text();
            if (fallbackResponse.status === 400) {
              throw new Error(`HTTP 400 Parametervalidierung fehlgeschlagen: ${errorText}`);
            }
            throw new Error(`Beide Aufrufmethoden fehlgeschlagen. HTTP Status: ${fallbackResponse.status} - ${errorText}`);
          }
          
          const fallbackData = await fallbackResponse.json();
          console.log('✅ Fallback HTTP call successful');
          
          // Handle successful fallback response
          if (fallbackData) {
            const responseContent = fallbackData.content || fallbackData.message || fallbackData.response || 'Response received via fallback';
            await simulateStreaming(messageId, responseContent);
            return;
          }
        } else {
          console.log('✅ Supabase function call successful');
          
          // Handle successful response
          if (response.data) {
            const responseContent = response.data.content || response.data.message || response.data.response || 'Response received';
            console.log('✅ Coach response received, simulating stream');
            await simulateStreaming(messageId, responseContent);
            return;
          }
        }
      } catch (networkError) {
        console.error('🔥 Critical network error:', networkError);
        throw new Error(`Network failure: ${(networkError as Error).message}`);
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