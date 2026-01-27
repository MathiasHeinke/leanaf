/**
 * useMealAdvisor - Hook for AI-powered meal suggestions
 * Aggregates context from various hooks and calls the edge function
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

interface MealAdvisorState {
  suggestions: MealSuggestion[];
  isLoading: boolean;
  error: string | null;
  isFallback: boolean;
}

export function useMealAdvisor() {
  const [state, setState] = useState<MealAdvisorState>({
    suggestions: [],
    isLoading: false,
    error: null,
    isFallback: false
  });

  const { data: metrics } = useDailyMetrics();
  const { toast } = useToast();

  const generateSuggestions = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke('ares-nutrition-advisor', {
        body: {}
      });

      if (error) {
        throw new Error(error.message || 'Vorschläge konnten nicht generiert werden');
      }

      if (!data?.suggestions || !Array.isArray(data.suggestions)) {
        throw new Error('Ungültige Antwort vom Server');
      }

      setState({
        suggestions: data.suggestions,
        isLoading: false,
        error: null,
        isFallback: data.fallback || false
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
        error: errorMessage
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
      isLoading: false,
      error: null,
      isFallback: false
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
    isLoading: state.isLoading,
    error: state.error,
    isFallback: state.isFallback,
    hasSuggestions: state.suggestions.length > 0,
    generateSuggestions,
    clearSuggestions,
    remainingMacros
  };
}
