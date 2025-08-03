import { useCallback, useRef, useState, useEffect } from "react";

interface MemoryUpdate {
  userId: string;
  coachId: string;
  userMessage: string;
  assistantResponse: string;
  sentiment?: number;
  categories?: string[];
  timestamp: string;
}

export function useMemorySync() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const updateMemoryAfterResponse = useCallback(async (update: MemoryUpdate) => {
    try {
      setIsUpdating(true);
      setError(null);
      
      console.log('🧠 Updating coach memory after response...');
      
      // Simple sentiment analysis
      const sentiment = analyzeSentiment(update.userMessage);
      
      // Category detection
      const categories = detectCategories(update.userMessage, update.assistantResponse);
      
      // Here you would integrate with your existing memory system
      // For now, just log the update
      console.log('Memory update:', {
        ...update,
        sentiment,
        categories,
        processingTime: new Date().toISOString()
      });
      
      // Simulate async memory update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('✅ Memory update completed');
      
    } catch (error: any) {
      console.error('❌ Memory update failed:', error);
      setError(error.message);
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const queueMemoryUpdate = useCallback((update: MemoryUpdate) => {
    // Debounce memory updates to avoid rapid-fire updates
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      updateMemoryAfterResponse(update);
    }, 1000); // Wait 1 second after response before updating memory
  }, [updateMemoryAfterResponse]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    queueMemoryUpdate,
    isUpdating,
    error
  };
}

function analyzeSentiment(text: string): number {
  // Simple sentiment analysis - replace with more sophisticated logic
  const positiveWords = ['gut', 'super', 'toll', 'danke', 'perfekt', 'freue'];
  const negativeWords = ['schlecht', 'müde', 'stress', 'problem', 'schwer', 'nicht'];
  
  const words = text.toLowerCase().split(' ');
  let score = 0;
  
  words.forEach(word => {
    if (positiveWords.some(pos => word.includes(pos))) score += 1;
    if (negativeWords.some(neg => word.includes(neg))) score -= 1;
  });
  
  return Math.max(-1, Math.min(1, score / words.length));
}

function detectCategories(userMessage: string, assistantResponse: string): string[] {
  const categories: string[] = [];
  const text = (userMessage + ' ' + assistantResponse).toLowerCase();
  
  if (text.includes('training') || text.includes('workout') || text.includes('übung')) {
    categories.push('training');
  }
  if (text.includes('ernährung') || text.includes('essen') || text.includes('kalorie')) {
    categories.push('nutrition');
  }
  if (text.includes('schlaf') || text.includes('müde') || text.includes('erholung')) {
    categories.push('recovery');
  }
  if (text.includes('gewicht') || text.includes('abnehmen') || text.includes('zunehmen')) {
    categories.push('weight');
  }
  
  return categories;
}