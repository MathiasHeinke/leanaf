import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useConversationMemory } from '@/hooks/useConversationMemory';
import { useMemorySync } from '@/hooks/useMemorySync';
import { ChatMessage } from '@/utils/memoryManager';

export interface EnhancedChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  coach_personality: string;
  coach_name?: string;
  coach_avatar?: string;
  coach_color?: string;
  coach_accent_color?: string;
  metadata?: {
    traceId?: string;
    tokensUsed?: number;
    duration?: number;
    hasMemory?: boolean;
    hasRag?: boolean;
    hasDaily?: boolean;
  };
}

interface UseEnhancedChatOptions {
  onError?: (error: string) => void;
  onSuccess?: (response: string, metadata?: any) => void;
  enableMemory?: boolean;
  enableRag?: boolean;
  enableProactive?: boolean;
}

export function useEnhancedChat(options: UseEnhancedChatOptions = {}) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [lastMetadata, setLastMetadata] = useState<any>(null);
  
  // Enhanced memory and context management
  const { 
    context: conversationContext, 
    addMessage: addToMemory, 
    getPromptContext,
    clearMemory: clearConversationMemory 
  } = useConversationMemory('');
  
  const { queueMemoryUpdate, isUpdating: isMemoryUpdating } = useMemorySync();
  
  // Refs for stable functions
  const conversationHistoryRef = useRef<EnhancedChatMessage[]>([]);
  const currentCoachRef = useRef<string>('');

  const sendMessage = useCallback(async (
    message: string, 
    coachId: string = 'lucy',
    additionalContext?: any
  ): Promise<string | null> => {
    if (!user?.id || !message.trim()) {
      const errorMsg = 'User ID or message missing';
      setError(errorMsg);
      options.onError?.(errorMsg);
      return null;
    }

    setIsLoading(true);
    setError(null);
    currentCoachRef.current = coachId;

    try {
      // Generate message ID and trace ID
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const traceId = `t_${Math.random().toString(36).substring(2, 12)}`;

      // Add user message to memory immediately
      const userMessage: ChatMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };
      
      if (options.enableMemory !== false) {
        addToMemory(userMessage);
      }

      // Get conversation history for context
      const conversationHistory = conversationHistoryRef.current.slice(-6).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Prepare request body with enhanced context
      const requestBody = {
        userId: user.id,
        coachId,
        message,
        messageId,
        traceId,
        conversationHistory,
        enableRag: options.enableRag !== false,
        enableMemory: options.enableMemory !== false,
        ...additionalContext
      };

      console.log('🚀 Sending enhanced chat request:', {
        coachId,
        messageLength: message.length,
        hasHistory: conversationHistory.length > 0,
        enableRag: options.enableRag !== false,
        enableMemory: options.enableMemory !== false
      });

      // Call enhanced coach engine
      const { data, error: functionError } = await supabase.functions.invoke('enhanced-coach-non-streaming', {
        body: requestBody
      });

      if (functionError) {
        throw new Error(`Function call failed: ${functionError.message}`);
      }

      if (!data || !data.response) {
        throw new Error('No response received from AI coach');
      }

      const aiResponse = data.response;
      const metadata = data.metadata || {};
      
      console.log('✅ Enhanced chat response received:', {
        responseLength: aiResponse.length,
        tokensUsed: metadata.tokensUsed,
        duration: metadata.duration,
        hasMemory: metadata.hasMemory,
        hasRag: metadata.hasRag,
        hasDaily: metadata.hasDaily,
        traceId: data.traceId
      });

      // Add AI response to memory
      const assistantMessage: ChatMessage = {
        role: 'assistant', 
        content: aiResponse,
        timestamp: new Date().toISOString()
      };
      
      if (options.enableMemory !== false) {
        addToMemory(assistantMessage);
        
        // Queue memory update with enhanced analysis
        queueMemoryUpdate({
          userId: user.id,
          coachId,
          userMessage: message,
          assistantResponse: aiResponse,
          sentiment: calculateBasicSentiment(message),
          categories: detectConversationCategories(message, aiResponse),
          timestamp: new Date().toISOString()
        });
      }

      // Store conversation history
      const userChatMessage: EnhancedChatMessage = {
        id: `user-${messageId}`,
        role: 'user',
        content: message,
        created_at: new Date().toISOString(),
        coach_personality: coachId
      };

      const assistantChatMessage: EnhancedChatMessage = {
        id: `assistant-${messageId}`,
        role: 'assistant',
        content: aiResponse,
        created_at: new Date().toISOString(),
        coach_personality: coachId,
        metadata: {
          traceId: data.traceId,
          tokensUsed: metadata.tokensUsed,
          duration: metadata.duration,
          hasMemory: metadata.hasMemory,
          hasRag: metadata.hasRag,
          hasDaily: metadata.hasDaily
        }
      };

      conversationHistoryRef.current.push(userChatMessage, assistantChatMessage);
      
      setLastResponse(aiResponse);
      setLastMetadata(metadata);
      options.onSuccess?.(aiResponse, metadata);
      
      return aiResponse;

    } catch (error: any) {
      console.error('❌ Enhanced chat error:', error);
      const errorMessage = error.message || 'Unbekannter Fehler beim Senden der Nachricht';
      setError(errorMessage);
      options.onError?.(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, options, addToMemory, queueMemoryUpdate]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearHistory = useCallback(() => {
    conversationHistoryRef.current = [];
    clearConversationMemory();
  }, [clearConversationMemory]);

  const getConversationStats = useCallback(() => {
    return {
      messageCount: conversationHistoryRef.current.length,
      memoryContext: conversationContext,
      isMemoryLoaded: !!conversationContext,
      isMemoryUpdating,
      currentCoach: currentCoachRef.current
    };
  }, [conversationContext, isMemoryUpdating]);

  return {
    sendMessage,
    isLoading,
    error,
    lastResponse,
    lastMetadata,
    clearError,
    clearHistory,
    getConversationStats,
    conversationHistory: conversationHistoryRef.current,
    memoryContext: conversationContext,
    isMemoryUpdating
  };
}

// Helper functions for sentiment and category analysis
function calculateBasicSentiment(text: string): number {
  const positiveWords = ['gut', 'super', 'toll', 'prima', 'klasse', 'perfekt', 'danke', 'freue', 'motiviert'];
  const negativeWords = ['schlecht', 'furchtbar', 'ärgerlich', 'frustriert', 'nervt', 'blöd', 'dumm', 'müde'];
  
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  
  words.forEach(word => {
    if (positiveWords.some(pos => word.includes(pos))) score += 1;
    if (negativeWords.some(neg => word.includes(neg))) score -= 1;
  });
  
  return Math.max(-1, Math.min(1, score / Math.max(1, words.length) * 10));
}

function detectConversationCategories(userMessage: string, assistantResponse: string): string[] {
  const categories: string[] = [];
  const text = (userMessage + ' ' + assistantResponse).toLowerCase();
  
  if (text.includes('training') || text.includes('workout') || text.includes('übung')) {
    categories.push('training');
  }
  if (text.includes('ernährung') || text.includes('essen') || text.includes('kalorien')) {
    categories.push('nutrition');
  }
  if (text.includes('schlaf') || text.includes('müde') || text.includes('erholung')) {
    categories.push('recovery');
  }
  if (text.includes('ziel') || text.includes('motivation') || text.includes('fortschritt')) {
    categories.push('motivation');
  }
  if (text.includes('gesundheit') || text.includes('wohlbefinden') || text.includes('stress')) {
    categories.push('wellness');
  }
  
  return categories.length > 0 ? categories : ['general'];
}