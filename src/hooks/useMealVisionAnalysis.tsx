import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FoodItem {
  name: string;
  estimated_weight_g: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  confidence: number;
  reference?: string;
}

interface MealAnalysisResult {
  title: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  confidence: number;
  meal_type: string;
  analysis_notes?: string;
  items?: FoodItem[];
}
export const useMealVisionAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeImages = useCallback(async (
    images: string[], 
    text: string = ''
  ): Promise<MealAnalysisResult> => {
    if (!images || images.length === 0) {
      throw new Error('Keine Bilder zum Analysieren vorhanden');
    }

    setIsAnalyzing(true);
    
    try {
      console.log('🔍 [useMealVisionAnalysis] Starting GPT-4o vision analysis:', {
        imageCount: images.length,
        hasText: !!text.trim()
      });

      const { data, error } = await supabase.functions.invoke('vision-meal-analyzer', {
        body: {
          images: images,
          text: text.trim()
        }
      });

      if (error) {
        console.error('❌ [useMealVisionAnalysis] Edge function error:', error);
        // Still use the data if available (fallback response)
        if (data) {
          toast.warning('Analyse unvollständig - bitte Werte überprüfen');
          return data as MealAnalysisResult;
        }
        throw error;
      }

      console.log('✅ [useMealVisionAnalysis] Analysis successful:', data);
      
      // Show confidence warning if low
      if (data.confidence < 0.7) {
        toast.warning('Analyse unsicher - bitte Werte überprüfen');
      } else if (data.confidence > 0.9) {
        toast.success('Mahlzeit erfolgreich analysiert');
      }

      return data as MealAnalysisResult;

    } catch (error: any) {
      console.error('💥 [useMealVisionAnalysis] Analysis failed:', error);
      
      // Create fallback result for ConfirmMealModal
      const fallback: MealAnalysisResult = {
        title: text.trim() || 'Mahlzeit (Analyse fehlgeschlagen)',
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        confidence: 0,
        meal_type: 'other',
        analysis_notes: 'Automatische Analyse nicht verfügbar - bitte Werte manuell eingeben'
      };

      toast.error('Analyse fehlgeschlagen - bitte Werte manuell eingeben');
      return fallback;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return {
    analyzeImages,
    isAnalyzing
  };
};