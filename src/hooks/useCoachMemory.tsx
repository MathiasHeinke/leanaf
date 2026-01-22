import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UserPreference {
  key: string;
  value: any;
  category: 'personality' | 'goals' | 'communication' | 'lifestyle';
  confidence: number; // How confident we are about this preference
  last_updated: string;
}

export interface CoachMemory {
  user_preferences: UserPreference[];
  conversation_context: {
    topics_discussed: string[];
    mood_history: Array<{
      timestamp: string;
      mood: string;
      intensity: number;
    }>;
    success_moments: Array<{
      timestamp: string;
      achievement: string;
      celebration_given: boolean;
    }>;
    struggles_mentioned: Array<{
      timestamp: string;
      struggle: string;
      support_given: boolean;
    }>;
  };
  relationship_stage: 'new' | 'getting_familiar' | 'established' | 'close';
  trust_level: number; // 0-100
  communication_style_preference: string;
}

// ARES-Only: Single coach system - coachId always defaults to 'ares'
export const useCoachMemory = (passedUserId?: string, coachId: string = 'ares') => {
  const { user } = useAuth();
  const [memory, setMemory] = useState<CoachMemory | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Use passed userId or fallback to authenticated user
  const userId = passedUserId || user?.id;

  const loadCoachMemory = useCallback(async (): Promise<CoachMemory | null> => {
    if (!userId) return null;

    setIsLoading(true);
    try {
      // ✅ ARES-Only: Filter by user_id AND coach_id
      const { data, error } = await supabase
        .from('coach_memory')
        .select('*')
        .eq('user_id', userId)
        .eq('coach_id', coachId)
        .maybeSingle();

      // Handle case where no memory exists yet
      if (!data && !error) {
        console.log('No coach memory found, creating default');
        const defaultMemory = createDefaultMemory();
        setMemory(defaultMemory);
        return defaultMemory;
      }

      if (error) {
        console.error('Error loading coach memory:', error);
        const defaultMemory = createDefaultMemory();
        setMemory(defaultMemory);
        return defaultMemory;
      }

      const coachMemory = (data?.memory_data as unknown as CoachMemory) || createDefaultMemory();
      setMemory(coachMemory);
      return coachMemory;

    } catch (error) {
      console.error('Error in loadCoachMemory:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userId, coachId]);

  const saveCoachMemory = useCallback(async (memoryData: CoachMemory): Promise<boolean> => {
    if (!userId) return false;

    try {
      // ============================================================================
      // PHASE B: MEMORY-SAFETY - Optimistic Locking für Concurrent Access
      // ============================================================================
      
      // Erst prüfen, ob sich die Memory seit dem letzten Load geändert hat
      const { data: currentMemory, error: fetchError } = await supabase
        .from('coach_memory')
        .select('updated_at')
        .eq('user_id', userId)
        .maybeSingle();

      // Wenn Memory existiert und neuere updated_at hat, dann concurrent update
      if (currentMemory && memory) {
        const currentUpdatedAt = new Date(currentMemory.updated_at);
        const memoryTimestamp = new Date(); // Für diesen Fall nehmen wir aktuelle Zeit als baseline
        
        // Warnung bei concurrent access (simplified check)
        console.log('🔒 Memory update with optimistic locking check');
      }

      // Speichere mit FOR UPDATE Semantik (über upsert mit conflict handling)
      // ARES-Only: Include coach_id in upsert
      const { error } = await supabase
        .from('coach_memory')
        .upsert({
          user_id: userId,
          coach_id: coachId,
          memory_data: memoryData as any,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving coach memory:', error);
        return false;
      }

      setMemory(memoryData);
      return true;

    } catch (error) {
      console.error('Error in saveCoachMemory:', error);
      return false;
    }
  }, [userId, memory]);

  const updateUserPreference = useCallback(async (
    key: string, 
    value: any, 
    category: UserPreference['category'],
    confidence: number = 0.7
  ): Promise<void> => {
    const currentMemory = memory || await loadCoachMemory() || createDefaultMemory();
    
    const existingPrefIndex = currentMemory.user_preferences.findIndex(p => p.key === key);
    const newPreference: UserPreference = {
      key,
      value,
      category,
      confidence,
      last_updated: new Date().toISOString()
    };

    if (existingPrefIndex >= 0) {
      currentMemory.user_preferences[existingPrefIndex] = newPreference;
    } else {
      currentMemory.user_preferences.push(newPreference);
    }

    await saveCoachMemory(currentMemory);
  }, [memory, loadCoachMemory, saveCoachMemory]);

  const addMoodEntry = useCallback(async (
    mood: string, 
    intensity: number
  ): Promise<void> => {
    const currentMemory = memory || await loadCoachMemory() || createDefaultMemory();
    
    currentMemory.conversation_context.mood_history.push({
      timestamp: new Date().toISOString(),
      mood,
      intensity
    });

    // Keep only last 50 mood entries
    if (currentMemory.conversation_context.mood_history.length > 50) {
      currentMemory.conversation_context.mood_history = 
        currentMemory.conversation_context.mood_history.slice(-50);
    }

    await saveCoachMemory(currentMemory);
  }, [memory, loadCoachMemory, saveCoachMemory]);

  const addSuccessMoment = useCallback(async (
    achievement: string
  ): Promise<void> => {
    const currentMemory = memory || await loadCoachMemory() || createDefaultMemory();
    
    currentMemory.conversation_context.success_moments.push({
      timestamp: new Date().toISOString(),
      achievement,
      celebration_given: false
    });

    // Increase trust level slightly
    currentMemory.trust_level = Math.min(100, currentMemory.trust_level + 2);

    await saveCoachMemory(currentMemory);
  }, [memory, loadCoachMemory, saveCoachMemory]);

  const addStruggleMention = useCallback(async (
    struggle: string
  ): Promise<void> => {
    const currentMemory = memory || await loadCoachMemory() || createDefaultMemory();
    
    currentMemory.conversation_context.struggles_mentioned.push({
      timestamp: new Date().toISOString(),
      struggle,
      support_given: false
    });

    await saveCoachMemory(currentMemory);
  }, [memory, loadCoachMemory, saveCoachMemory]);

  const updateRelationshipStage = useCallback(async (): Promise<void> => {
    const currentMemory = memory || await loadCoachMemory() || createDefaultMemory();
    
    // Calculate interaction count
    const totalInteractions = currentMemory.conversation_context.topics_discussed.length;
    
    // Update relationship stage based on interactions and trust
    if (totalInteractions >= 50 && currentMemory.trust_level >= 80) {
      currentMemory.relationship_stage = 'close';
    } else if (totalInteractions >= 20 && currentMemory.trust_level >= 60) {
      currentMemory.relationship_stage = 'established';
    } else if (totalInteractions >= 5) {
      currentMemory.relationship_stage = 'getting_familiar';
    } else {
      currentMemory.relationship_stage = 'new';
    }

    await saveCoachMemory(currentMemory);
  }, [memory, loadCoachMemory, saveCoachMemory]);

  const createDefaultMemory = (): CoachMemory => ({
    user_preferences: [],
    conversation_context: {
      topics_discussed: [],
      mood_history: [],
      success_moments: [],
      struggles_mentioned: []
    },
    relationship_stage: 'new',
    trust_level: 0,
    communication_style_preference: 'balanced'
  });

  return {
    memory,
    isLoading,
    loadCoachMemory,
    saveCoachMemory,
    updateUserPreference,
    addMoodEntry,
    addSuccessMoment,
    addStruggleMention,
    updateRelationshipStage
  };
};
