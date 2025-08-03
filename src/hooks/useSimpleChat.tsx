import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SimpleChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  coach_personality: string;
}

interface UseSimpleChatOptions {
  onError?: (error: string) => void;
  onSuccess?: (response: string) => void;
}

export function useSimpleChat(options: UseSimpleChatOptions = {}) {
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<string>('');

  const sendMessage = useCallback(async (
    message: string,
    coachPersonality: string = 'lucy'
  ): Promise<string | null> => {
    if (!session?.access_token) {
      const errorMsg = 'Not authenticated';
      setError(errorMsg);
      options.onError?.(errorMsg);
      return null;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🚀 Sending message to simple-gpt:', message.substring(0, 50) + '...');
      
      const response = await fetch('https://gzczjscctgyxjyodhnhk.supabase.co/functions/v1/simple-gpt', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDc5ODIsImV4cCI6MjA2ODMyMzk4Mn0.RIEpNuSbszttym0v9KulYOxXX_Klose6QRAfEMuub1I'
        },
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error from simple-gpt');
      }

      console.log('✅ Got response from simple-gpt:', data.response.substring(0, 50) + '...');
      
      setLastResponse(data.response);
      options.onSuccess?.(data.response);
      return data.response;
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Simple chat error:', errorMsg);
      setError(errorMsg);
      options.onError?.(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [session, options]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    sendMessage,
    isLoading,
    error,
    lastResponse,
    clearError
  };
}