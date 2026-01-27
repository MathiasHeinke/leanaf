/**
 * useMealAdvisor - Hook for AI-powered meal suggestions & evaluation
 * Supports two modes: suggestion (no input) and evaluation (with user idea)
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDailyMetrics } from './useDailyMetrics';
import { useToast } from './use-toast';

export interface MealSuggestion {
  title: string;
  reason: string;
  macros: { kcal: number; protein: number; carbs: number; fats: number };
  prepTime: string;
  tags: string[];
}

export interface MealEvaluation {
  type: 'evaluation';
  userIdea: string;
  verdict: 'optimal' | 'ok' | 'suboptimal';
  reason: string;
  macros: { kcal: number; protein: number; carbs: number; fats: number };
  optimization: string;
  tags: string[];
  alternatives: MealSuggestion[];
}

interface MealAdvisorState {
  suggestions: MealSuggestion[];
  evaluation: MealEvaluation | null;
  isLoading: boolean;
  error: string | null;
  isFallback: boolean;
  mode: 'idle' | 'suggestions' | 'evaluation';
}

export function useMealAdvisor() {
  const [state, setState] = useState<MealAdvisorState>({
    suggestions: [],
    evaluation: null,
    isLoading: false,
    error: null,
    isFallback: false,
    mode: 'idle'
  });

  const { data: metrics } = useDailyMetrics();
  const { toast } = useToast();

  const generateSuggestions = useCallback(async (userIdea?: string) => {
    const isEvaluationMode = !!userIdea?.trim();
    
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null,
      mode: isEvaluationMode ? 'evaluation' : 'suggestions'
    }));

    try {
      const { data, error } = await supabase.functions.invoke('ares-nutrition-advisor', {
        body: { userIdea: userIdea?.trim() || undefined }
      });

      if (error) {
        throw new Error(error.message || 'Vorschläge konnten nicht generiert werden');
      }

      // Handle evaluation response
      if (data?.type === 'evaluation') {
        setState({
          suggestions: [],
          evaluation: {
            type: 'evaluation',
            userIdea: data.userIdea,
            verdict: data.verdict,
            reason: data.reason,
            macros: data.macros,
            optimization: data.optimization,
            tags: data.tags || [],
            alternatives: data.alternatives || []
          },
          isLoading: false,
          error: null,
          isFallback: data.fallback || false,
          mode: 'evaluation'
        });
        return;
      }

      // Handle suggestions response
      if (!data?.suggestions || !Array.isArray(data.suggestions)) {
        throw new Error('Ungültige Antwort vom Server');
      }

      setState({
        suggestions: data.suggestions,
        evaluation: null,
        isLoading: false,
        error: null,
        isFallback: data.fallback || false,
        mode: 'suggestions'
      });

      if (data.fallback) {
        toast({
          title: "Offline-Vorschläge",
          description: "Die KI war nicht erreichbar. Hier sind bewährte Vorschläge.",
          variant: "default"
        });
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        mode: 'idle'
      }));

      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [toast]);

  const clearSuggestions = useCallback(() => {
    setState({
      suggestions: [],
      evaluation: null,
      isLoading: false,
      error: null,
      isFallback: false,
      mode: 'idle'
    });
  }, []);

  // Calculate remaining macros for display
  const remainingMacros = metrics ? {
    kcal: Math.max(0, (metrics.goals?.calories || 0) - (metrics.nutrition?.calories || 0)),
    protein: Math.max(0, (metrics.goals?.protein || 0) - (metrics.nutrition?.protein || 0)),
    carbs: Math.max(0, (metrics.goals?.carbs || 0) - (metrics.nutrition?.carbs || 0)),
    fats: Math.max(0, (metrics.goals?.fats || 0) - (metrics.nutrition?.fats || 0))
  } : null;

  return {
    suggestions: state.suggestions,
    evaluation: state.evaluation,
    isLoading: state.isLoading,
    error: state.error,
    isFallback: state.isFallback,
    mode: state.mode,
    hasSuggestions: state.suggestions.length > 0,
    hasEvaluation: state.evaluation !== null,
    generateSuggestions,
    clearSuggestions,
    remainingMacros
  };
}
