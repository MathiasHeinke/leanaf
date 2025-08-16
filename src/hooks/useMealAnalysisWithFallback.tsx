import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MealData {
  text: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  meal_type: string;
}

export const useMealAnalysisWithFallback = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeMealWithFallback = useCallback(async (
    text: string, 
    images: string[] = []
  ): Promise<MealData | null> => {
    if (!text.trim() && images.length === 0) return null;
    
    setIsAnalyzing(true);
    
    try {
      console.log('🔍 [analyzeMealWithFallback] Starting analysis:', {
        text: text.trim(),
        imageCount: images.length
      });

      const { data, error } = await supabase.functions.invoke('analyze-meal', {
        body: {
          text: text.trim(),
          images: images
        }
      });

      if (error) {
        console.error('[analyzeMealWithFallback] Analysis failed:', error);
        
        // Fallback: Create meal entry with user's text and zero values
        toast.warning('Analyse fehlgeschlagen. Mahlzeit wird mit Standardwerten gespeichert.');
        return {
          text: text.trim() || 'Mahlzeit',
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          meal_type: 'other'
        };
      }

      console.log('✅ [analyzeMealWithFallback] Analysis successful:', data);
      
      // Parse response and apply fallback if needed
      if (data?.total) {
        return {
          text: data.title || text.trim() || 'Analysierte Mahlzeit',
          calories: data.total.calories || 0,
          protein: data.total.protein || 0,
          carbs: data.total.carbs || 0,
          fats: data.total.fats || 0,
          meal_type: 'other'
        };
      }

      // If no valid data, use fallback
      console.warn('[analyzeMealWithFallback] No valid data, using fallback');
      return {
        text: text.trim() || 'Mahlzeit',
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        meal_type: 'other'
      };

    } catch (error: any) {
      console.error('[analyzeMealWithFallback] Exception:', error);
      
      // Always provide fallback - never block the user
      toast.warning('Analyse nicht verfügbar. Mahlzeit wird mit Standardwerten gespeichert.');
      return {
        text: text.trim() || 'Mahlzeit',
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        meal_type: 'other'
      };
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return {
    analyzeMealWithFallback,
    isAnalyzing
  };
};