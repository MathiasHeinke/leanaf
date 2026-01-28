import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface RecognizedSupplement {
  product_name: string;
  supplement_match: string | null;
  supplement_id: string | null;
  confidence: number;
  quantity_estimate?: string;
  notes?: string;
}

interface SupplementRecognitionResult {
  success: boolean;
  recognized_supplements: RecognizedSupplement[];
  analysis: string;
  confidence_score: number;
  recommendations?: string;
  error?: string;
}

export const useSupplementRecognition = () => {
  const { user } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const recognizeSupplements = async (imageUrl: string, userQuestion?: string): Promise<SupplementRecognitionResult> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setIsAnalyzing(true);

    try {
      console.log('🔍 Starting supplement recognition for image:', imageUrl);

      const { data, error } = await supabase.functions.invoke('supplement-recognition', {
        body: {
          userId: user.id,
          imageUrl,
          userQuestion
        }
      });

      if (error) {
        console.error('Error calling supplement recognition function:', error);
        throw new Error(error.message || 'Failed to analyze supplements');
      }

      console.log('✅ Supplement recognition result:', data);

      return data as SupplementRecognitionResult;

    } catch (error: any) {
      console.error('Error in supplement recognition:', error);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addRecognizedSupplementsToStack = async (recognizedSupplements: RecognizedSupplement[]) => {
    if (!user || !recognizedSupplements.length) return;

    try {
      console.log('📦 Adding recognized supplements to user stack:', recognizedSupplements);

      const supplementsToAdd = [];

      for (const recognized of recognizedSupplements) {
        // Only add supplements with reasonable confidence
        if (recognized.confidence >= 0.7) {
          const supplementData = {
            user_id: user.id,
            supplement_id: recognized.supplement_id,
            custom_name: recognized.supplement_id ? null : recognized.product_name,
            dosage: 'Nach Packungsangabe',
            unit: 'Portion',
            timing: ['morning'], // Default timing
            goal: 'Erkannt aus Bild',
            notes: `Automatisch erkannt: ${recognized.notes || recognized.product_name}. Bitte Dosierung und Timing anpassen.`,
            is_active: true
          };

          supplementsToAdd.push(supplementData);
        }
      }

      if (supplementsToAdd.length > 0) {
        const { error } = await supabase
          .from('user_supplements')
          .upsert(supplementsToAdd, {
            onConflict: 'user_id,supplement_id,custom_name',
            ignoreDuplicates: true
          });

        if (error) {
          console.error('Error adding supplements:', error);
          throw error;
        }

        console.log(`✅ Added ${supplementsToAdd.length} supplements to user stack`);
        
        // Fire unified event to refresh supplement list
        window.dispatchEvent(new CustomEvent('supplement-stack-changed'));

        toast.success(`${supplementsToAdd.length} Supplement${supplementsToAdd.length > 1 ? 'e' : ''} zur Übersicht hinzugefügt!`);
      } else {
        toast.info('Keine Supplements mit ausreichender Erkennungsqualität gefunden.');
      }

    } catch (error) {
      console.error('Error adding recognized supplements:', error);
      toast.error('Fehler beim Hinzufügen der erkannten Supplements');
    }
  };

  return {
    recognizeSupplements,
    addRecognizedSupplementsToStack,
    isAnalyzing
  };
};