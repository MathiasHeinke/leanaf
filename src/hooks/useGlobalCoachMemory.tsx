import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCoachMemory, CoachMemory } from '@/hooks/useCoachMemory';
import { useSentimentAnalysis } from '@/hooks/useSentimentAnalysis';
import { useProactiveCoaching } from '@/hooks/useProactiveCoaching';

/**
 * Global Coach Memory Hook
 * Synchronizes memory across all coach components and provides unified interface
 */
export const useGlobalCoachMemory = () => {
  const { user } = useAuth();
  const { 
    memory, 
    loadCoachMemory, 
    saveCoachMemory,
    updateUserPreference,
    addMoodEntry,
    addSuccessMoment,
    addStruggleMention,
    updateRelationshipStage 
  } = useCoachMemory();
  
  const { analyzeSentiment } = useSentimentAnalysis();
  const { checkForProactiveOpportunities } = useProactiveCoaching();
  
  const [isGlobalMemoryLoaded, setIsGlobalMemoryLoaded] = useState(false);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string | null>(null);

  // Load global memory on user authentication
  useEffect(() => {
    if (user?.id && !isGlobalMemoryLoaded) {
      initializeGlobalMemory();
    }
  }, [user?.id, isGlobalMemoryLoaded]);

  const initializeGlobalMemory = useCallback(async () => {
    try {
      console.log('🧠 Initializing Global Coach Memory...');
      await loadCoachMemory();
      setIsGlobalMemoryLoaded(true);
      setLastSyncTimestamp(new Date().toISOString());
      console.log('✅ Global Coach Memory initialized');
    } catch (error) {
      console.error('❌ Error initializing global memory:', error);
    }
  }, [loadCoachMemory]);

  // Enhanced message processing with unified memory updates
  const processMessage = useCallback(async (
    message: string, 
    coachPersonality: string,
    isUserMessage: boolean = true
  ) => {
    if (!message || !user?.id) return null;

    try {
      // Analyze sentiment
      const sentiment = await analyzeSentiment(message);
      
      // Update memory based on message type
      if (isUserMessage) {
        // Update mood history
        if (sentiment.emotion !== 'neutral') {
          await addMoodEntry(sentiment.emotion, sentiment.intensity);
        }
        
        // Detect success or struggle patterns
        if (sentiment.sentiment === 'positive' && sentiment.confidence > 0.7) {
          await addSuccessMoment(`Positive interaction: ${sentiment.emotion}`);
        } else if (sentiment.sentiment === 'negative' && sentiment.confidence > 0.7) {
          await addStruggleMention(`User expressing: ${sentiment.emotion}`);
        }
        
        // Update relationship stage
        await updateRelationshipStage();
      }
      
      // Trigger proactive coaching check
      await checkForProactiveOpportunities();
      
      setLastSyncTimestamp(new Date().toISOString());
      
      return sentiment;
    } catch (error) {
      console.error('Error processing message:', error);
      return null;
    }
  }, [user?.id, analyzeSentiment, addMoodEntry, addSuccessMoment, addStruggleMention, updateRelationshipStage, checkForProactiveOpportunities]);

  // Update user preference with global sync
  const updateGlobalPreference = useCallback(async (
    key: string,
    value: any,
    category: 'personality' | 'goals' | 'communication' | 'lifestyle',
    confidence: number = 0.7
  ) => {
    await updateUserPreference(key, value, category, confidence);
    setLastSyncTimestamp(new Date().toISOString());
  }, [updateUserPreference]);

  // Get memory summary for coach context
  const getMemorySummary = useCallback(() => {
    if (!memory) return null;

    return {
      relationshipStage: memory.relationship_stage,
      trustLevel: memory.trust_level,
      recentMoods: memory.conversation_context.mood_history.slice(-5),
      recentSuccesses: memory.conversation_context.success_moments.slice(-3),
      recentStruggles: memory.conversation_context.struggles_mentioned.slice(-3),
      topPreferences: memory.user_preferences.slice(-5),
      communicationStyle: memory.communication_style_preference
    };
  }, [memory]);

  // Check if memory needs sync (useful for detecting external updates)
  const shouldSync = useCallback(() => {
    if (!lastSyncTimestamp) return true;
    
    const now = new Date();
    const lastSync = new Date(lastSyncTimestamp);
    const diffMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60);
    
    return diffMinutes > 5; // Sync if last update was more than 5 minutes ago
  }, [lastSyncTimestamp]);

  // Manual sync trigger
  const syncMemory = useCallback(async () => {
    if (user?.id) {
      await loadCoachMemory();
      setLastSyncTimestamp(new Date().toISOString());
    }
  }, [user?.id, loadCoachMemory]);

  return {
    // Memory state
    memory,
    isGlobalMemoryLoaded,
    lastSyncTimestamp,
    
    // Core functions
    processMessage,
    updateGlobalPreference,
    getMemorySummary,
    
    // Sync functions
    shouldSync,
    syncMemory,
    
    // Individual memory functions (for backward compatibility)
    addMoodEntry,
    addSuccessMoment,
    addStruggleMention,
    updateRelationshipStage,
    loadCoachMemory,
    saveCoachMemory
  };
};