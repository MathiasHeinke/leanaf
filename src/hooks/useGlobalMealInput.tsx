
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface MealData {
  text: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  meal_type?: string;
}

export const useGlobalMealInput = () => {
  const { user } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const analyzeMealText = useCallback(async (text: string): Promise<MealData | null> => {
    if (!user || !text.trim()) return null;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-meal', {
        body: { meal_description: text.trim() }
      });

      if (error) throw error;

      if (data?.meal) {
        return {
          text: text.trim(),
          calories: data.meal.calories || 0,
          protein: data.meal.protein || 0,
          carbs: data.meal.carbs || 0,
          fats: data.meal.fats || 0,
          meal_type: data.meal.meal_type || 'other'
        };
      }
      return null;
    } catch (error: any) {
      console.error('Meal analysis error:', error);
      toast.error('Analyse fehlgeschlagen');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [user]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Recording error:', error);
      toast.error('Mikrofonzugriff verweigert');
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          
          const { data, error } = await supabase.functions.invoke('voice-to-text', {
            body: { audio: Array.from(new Uint8Array(await audioBlob.arrayBuffer())) }
          });

          if (error) throw error;
          resolve(data?.text || null);
        } catch (error) {
          console.error('Voice processing error:', error);
          toast.error('Spracherkennung fehlgeschlagen');
          resolve(null);
        }
      };

      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      
      setIsRecording(false);
      setRecordingTime(0);
    });
  }, [isRecording]);

  const uploadImages = useCallback(async (files: File[]): Promise<string[]> => {
    if (!user || files.length === 0) return [];

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} zu groß (max. 10MB)`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('meal-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('meal-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      return uploadedUrls;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Upload fehlgeschlagen');
      return [];
    } finally {
      setIsUploading(false);
    }
  }, [user]);

  return {
    analyzeMealText,
    startRecording,
    stopRecording,
    uploadImages,
    isAnalyzing,
    isRecording,
    isUploading,
    recordingTime
  };
};
