import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface ProactiveContext {
  lastInteraction: Date | null;
  conversationLength: number;
  userEngagement: 'high' | 'medium' | 'low';
  suggestedActions: string[];
  contextAwareness: {
    currentTopic: string | null;
    userMood: 'positive' | 'neutral' | 'negative' | 'unknown';
    progressIndicators: string[];
  };
}

interface ProactiveSuggestion {
  id: string;
  type: 'followup' | 'clarification' | 'encouragement' | 'next_step';
  content: string;
  priority: 'high' | 'medium' | 'low';
  timing: 'immediate' | 'delayed';
}

export const useProactiveCoachBehavior = (coachId: string) => {
  const { user } = useAuth();
  const [context, setContext] = useState<ProactiveContext>({
    lastInteraction: null,
    conversationLength: 0,
    userEngagement: 'medium',
    suggestedActions: [],
    contextAwareness: {
      currentTopic: null,
      userMood: 'unknown',
      progressIndicators: []
    }
  });
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeUserMessage = useCallback((message: string, conversationHistory: any[] = []) => {
    setIsAnalyzing(true);
    
    // Analyze sentiment and context
    const sentiment = analyzeSentiment(message);
    const topic = extractTopic(message);
    const engagement = calculateEngagement(message, conversationHistory);
    
    setContext(prev => ({
      ...prev,
      lastInteraction: new Date(),
      conversationLength: conversationHistory.length + 1,
      userEngagement: engagement,
      contextAwareness: {
        ...prev.contextAwareness,
        currentTopic: topic,
        userMood: sentiment
      }
    }));

    // Generate proactive suggestions
    generateSuggestions(message, sentiment, topic, engagement);
    setIsAnalyzing(false);
  }, []);

  const analyzeSentiment = (message: string): 'positive' | 'neutral' | 'negative' => {
    const positiveWords = ['gut', 'super', 'toll', 'freue', 'perfekt', 'danke'];
    const negativeWords = ['schwer', 'müde', 'problem', 'schwierig', 'nicht'];
    
    const words = message.toLowerCase().split(' ');
    const positiveScore = words.filter(word => positiveWords.some(pos => word.includes(pos))).length;
    const negativeScore = words.filter(word => negativeWords.some(neg => word.includes(neg))).length;
    
    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  };

  const extractTopic = (message: string): string | null => {
    const topicKeywords = {
      'training': ['training', 'workout', 'übung', 'sport', 'fitness'],
      'nutrition': ['essen', 'ernährung', 'mahlzeit', 'kalorien', 'diät'],
      'goals': ['ziel', 'abnehmen', 'zunehmen', 'erreichen', 'schaffen'],
      'motivation': ['motivation', 'müde', 'kraft', 'energie', 'durchhalten']
    };

    const lowerMessage = message.toLowerCase();
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return topic;
      }
    }
    return null;
  };

  const calculateEngagement = (message: string, history: any[]): 'high' | 'medium' | 'low' => {
    const messageLength = message.length;
    const recentMessages = history.slice(-5).length;
    
    if (messageLength > 100 && recentMessages >= 3) return 'high';
    if (messageLength > 50 || recentMessages >= 2) return 'medium';
    return 'low';
  };

  const generateSuggestions = (
    message: string, 
    sentiment: string, 
    topic: string | null, 
    engagement: string
  ) => {
    const newSuggestions: ProactiveSuggestion[] = [];

    // Topic-based suggestions
    if (topic === 'training') {
      newSuggestions.push({
        id: `training-${Date.now()}`,
        type: 'followup',
        content: 'Soll ich dir einen personalisierten Trainingsplan erstellen?',
        priority: 'high',
        timing: 'immediate'
      });
    }

    if (topic === 'nutrition') {
      newSuggestions.push({
        id: `nutrition-${Date.now()}`,
        type: 'followup',
        content: 'Möchtest du deine Mahlzeiten für heute planen?',
        priority: 'high',
        timing: 'immediate'
      });
    }

    // Sentiment-based responses
    if (sentiment === 'negative') {
      newSuggestions.push({
        id: `support-${Date.now()}`,
        type: 'encouragement',
        content: 'Du schaffst das! Lass uns zusammen eine Lösung finden.',
        priority: 'high',
        timing: 'immediate'
      });
    }

    // Engagement-based suggestions
    if (engagement === 'high') {
      newSuggestions.push({
        id: `deep-dive-${Date.now()}`,
        type: 'next_step',
        content: 'Du bist sehr engagiert! Sollen wir tiefer ins Detail gehen?',
        priority: 'medium',
        timing: 'delayed'
      });
    }

    setSuggestions(newSuggestions);
  };

  const dismissSuggestion = useCallback((suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  }, []);

  const applySuggestion = useCallback((suggestion: ProactiveSuggestion) => {
    // This would trigger the actual suggestion action
    dismissSuggestion(suggestion.id);
    return suggestion.content;
  }, [dismissSuggestion]);

  const getContextualPromptEnhancement = useCallback(() => {
    const { currentTopic, userMood } = context.contextAwareness;
    
    let enhancement = '';
    
    if (currentTopic) {
      enhancement += `Aktueller Gesprächsfokus: ${currentTopic}. `;
    }
    
    if (userMood !== 'unknown') {
      enhancement += `Aktuelle Stimmung des Users: ${userMood}. `;
    }
    
    if (context.userEngagement === 'high') {
      enhancement += 'User ist sehr engagiert und bereit für detaillierte Antworten. ';
    } else if (context.userEngagement === 'low') {
      enhancement += 'User zeigt wenig Engagement, halte Antworten kurz und motivierend. ';
    }

    return enhancement;
  }, [context]);

  return {
    context,
    suggestions,
    isAnalyzing,
    analyzeUserMessage,
    dismissSuggestion,
    applySuggestion,
    getContextualPromptEnhancement
  };
};