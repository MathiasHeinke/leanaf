import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { memoryManager, ChatMessage, ConversationMemory } from '@/utils/memoryManager';

export interface ConversationContext {
  recentMessages: ChatMessage[];
  historicalSummary: string | null;
  messageCount: number;
}

/**
 * Hook for managing conversation memory with rolling compression
 */
export const useConversationMemory = (coachId: string) => {
  const { user } = useAuth();
  const [context, setContext] = useState<ConversationContext>({
    recentMessages: [],
    historicalSummary: null,
    messageCount: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Load conversation context from memory
   */
  const loadContext = useCallback(async () => {
    if (!user?.id || !coachId) return;

    setIsLoading(true);
    try {
      const contextData = await memoryManager.getConversationContext(user.id, coachId);
      setContext(contextData);
    } catch (error) {
      console.error('Error loading conversation context:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, coachId]);

  /**
   * Add a new message to conversation memory
   */
  const addMessage = useCallback(async (message: ChatMessage): Promise<void> => {
    if (!user?.id || !coachId) return;

    try {
      const { memory, needsCompression } = await memoryManager.addMessage(
        user.id,
        coachId,
        message
      );

      // Update local context
      setContext({
        recentMessages: memory.last_messages,
        historicalSummary: memory.rolling_summary,
        messageCount: memory.message_count
      });

      // Handle compression if needed (will be done in backend)
      if (needsCompression) {
        console.log('🗂️ Message compression will be handled by backend');
      }
    } catch (error) {
      console.error('Error adding message:', error);
    }
  }, [user?.id, coachId]);

  /**
   * Get formatted context for AI prompts
   */
  const getPromptContext = useCallback((): string => {
    let promptContext = '';

    if (context.historicalSummary) {
      promptContext += `[Gesprächs-Verlauf]\n${context.historicalSummary}\n\n`;
    }

    if (context.recentMessages.length > 0) {
      promptContext += '[Aktuelle Nachrichten]\n';
      const recentConversation = context.recentMessages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistent'}: ${msg.content}`)
        .join('\n');
      promptContext += recentConversation + '\n\n';
    }

    if (context.messageCount > 0) {
      promptContext += `[Info: Gesamt ${context.messageCount} Nachrichten in diesem Gespräch]\n\n`;
    }

    return promptContext;
  }, [context]);

  /**
   * Clear conversation memory (for testing/debugging)
   */
  const clearMemory = useCallback(async () => {
    if (!user?.id || !coachId) return;

    try {
      await memoryManager.clearConversation(user.id, coachId);
      setContext({
        recentMessages: [],
        historicalSummary: null,
        messageCount: 0
      });
      console.log('✅ Conversation memory cleared');
    } catch (error) {
      console.error('Error clearing memory:', error);
    }
  }, [user?.id, coachId]);

  /**
   * Get memory stats for debugging
   */
  const getMemoryStats = useCallback(() => {
    return {
      recentMessageCount: context.recentMessages.length,
      totalMessageCount: context.messageCount,
      hasHistoricalSummary: !!context.historicalSummary,
      memoryUsage: context.recentMessages.length + (context.historicalSummary ? 1 : 0)
    };
  }, [context]);

  // Load context on mount and when dependencies change
  useEffect(() => {
    loadContext();
  }, [loadContext]);

  return {
    context,
    isLoading,
    loadContext,
    addMessage,
    getPromptContext,
    clearMemory,
    getMemoryStats
  };
};