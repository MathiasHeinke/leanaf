import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ClassificationResult {
  category: 'exercise' | 'food' | 'supplement' | 'body_progress' | 'general';
  confidence: number;
  description: string;
  suggestedAction: string;
}

interface ImageAnalysisResult {
  classification: ClassificationResult;
  analysisData?: any;
  suggestedModal?: string;
}

export const useUniversalImageAnalysis = () => {
  const { user } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null);

  const analyzeImageRef = useRef<(imageUrl: string, userMessage?: string) => Promise<ImageAnalysisResult>>(
    async () => ({} as ImageAnalysisResult)
  );

  useEffect(() => {
    analyzeImageRef.current = async (imageUrl: string, userMessage?: string): Promise<ImageAnalysisResult> => {
    if (!user?.id) throw new Error('User not authenticated');
    
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      console.log('🔍 Starting universal image analysis...');
      
      // Step 1: Classify image
      const { data: classificationData, error: classifyError } = await supabase.functions.invoke('image-classifier', {
        body: { imageUrl, userId: user.id }
      });

      if (classifyError) throw classifyError;
      
      const classification = classificationData.classification as ClassificationResult;
      console.log('📋 Image classified as:', classification.category);

      // Step 2: Route to specialized analysis
      let analysisData = null;
      let suggestedModal = null;

      switch (classification.category) {
        case 'exercise':
          console.log('🏋️ Analyzing exercise data...');
          const { data: exerciseData, error: exerciseError } = await supabase.functions.invoke('extract-exercise-data', {
            body: { 
              userId: user.id, 
              mediaUrls: [imageUrl], 
              userMessage: userMessage || classification.description,
              shouldSave: false // Preview mode
            }
          });
          
          if (exerciseError) {
            console.warn('Exercise analysis failed:', exerciseError);
          } else {
            analysisData = exerciseData;
            suggestedModal = 'exercise';
          }
          break;

        case 'food':
          console.log('🍽️ Analyzing meal...');
          const { data: mealData, error: mealError } = await supabase.functions.invoke('analyze-meal', {
            body: { 
              text: userMessage || classification.description,
              images: [imageUrl],
              userId: user.id
            }
          });
          
          if (mealError) {
            console.warn('Meal analysis failed:', mealError);
          } else {
            analysisData = mealData;
            suggestedModal = 'meal';
      }
      break;

        case 'supplement':
          console.log('💊 Analyzing supplements...');
          const { data: supplementData, error: supplementError } = await supabase.functions.invoke('supplement-recognition', {
            body: { 
              imageUrl,
              userId: user.id,
              userQuestion: userMessage || classification.description
            }
          });
          
          if (supplementError) {
            console.warn('Supplement analysis failed:', supplementError);
            // Still provide fallback data for user feedback
            analysisData = {
              error: supplementError.message,
              fallback: true,
              category: 'supplement'
            };
            suggestedModal = 'supplement';
          } else {
            analysisData = supplementData;
            suggestedModal = 'supplement';
          }
          break;

        case 'body_progress':
          console.log('📸 Analyzing body progress...');
          const { data: bodyData, error: bodyError } = await supabase.functions.invoke('body-analysis', {
            body: { 
              imageUrl,
              userId: user.id,
              userMessage: userMessage || classification.description
            }
          });
          
          if (bodyError) {
            console.warn('Body analysis failed:', bodyError);
          } else {
            analysisData = bodyData;
            suggestedModal = 'body_progress';
          }
          break;

        default:
          console.log('🔍 General image - no specialized analysis');
          break;
      }

      const result: ImageAnalysisResult = {
        classification,
        analysisData,
        suggestedModal
      };

      setAnalysisResult(result);
      
      // ✅ NO MORE TOAST - Chat integration only

      return result;

    } catch (error) {
      console.error('❌ Universal image analysis failed:', error);
      toast.error('Bildanalyse fehlgeschlagen');
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
    };
  }, []); // hier wirklich KEINE instabilen deps

  const clearAnalysis = () => {
    setAnalysisResult(null);
  };

  return {
    analyzeImage: analyzeImageRef.current,  // stabile Referenz
    isAnalyzing,
    analysisResult,
    clearAnalysis
  };
};