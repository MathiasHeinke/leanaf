
import { useState, useCallback, useRef, useEffect } from 'react';
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

interface AnalyzedMealData {
  title: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  meal_type: string;
  confidence?: number;
}

export const useGlobalMealInput = () => {
  const { user } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [inputText, setInputText] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [analyzedMealData, setAnalyzedMealData] = useState<AnalyzedMealData | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<string>('other');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<any[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function for media recorder
  const cleanupMediaRecorder = useCallback(() => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    setIsRecording(false);
    setRecordingTime(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupMediaRecorder();
    };
  }, [cleanupMediaRecorder]);

  const analyzeMealText = useCallback(async (text: string, images: string[] = []): Promise<MealData | null> => {
    if (!user || (!text.trim() && images.length === 0)) return null;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-meal', {
        body: { 
          text: text.trim() || null,
          images: images.length > 0 ? images : null
        }
      });

      if (error) {
        console.error('Meal analysis error:', error);
        throw error;
      }

      // Handle standardized response format
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

      // Fallback for legacy format
      if (data?.meal) {
        return {
          text: text.trim() || 'Analysierte Mahlzeit',
          calories: data.meal.calories || 0,
          protein: data.meal.protein || 0,
          carbs: data.meal.carbs || 0,
          fats: data.meal.fats || 0,
          meal_type: data.meal.meal_type || 'other'
        };
      }

      return null;
    } catch (error: any) {
      if (error.message?.includes('Weder Text noch Bild')) {
        toast.error('Bitte geben Sie Text ein oder laden Sie ein Bild hoch');
      } else {
        toast.error('Analyse fehlgeschlagen');
      }
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
        } finally {
          cleanupMediaRecorder();
        }
      };

      mediaRecorderRef.current.stop();
    });
  }, [isRecording, cleanupMediaRecorder]);

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

  const handleSubmitMeal = useCallback(async () => {
    if (!inputText.trim() && uploadedImages.length === 0) {
      toast.error('Bitte geben Sie Text ein oder laden Sie ein Bild hoch');
      return;
    }

    setIsProcessing(true);
    try {
      const mealData = await analyzeMealText(inputText, uploadedImages);
      if (mealData) {
        setAnalyzedMealData({
          title: mealData.text,
          calories: mealData.calories,
          protein: mealData.protein,
          carbs: mealData.carbs,
          fats: mealData.fats,
          meal_type: mealData.meal_type || 'other',
          confidence: 0.85
        });
        setSelectedMealType(mealData.meal_type || 'other');
        setShowConfirmationDialog(true);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [inputText, uploadedImages, analyzeMealText]);

  const handlePhotoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const urls = await uploadImages(files);
    setUploadedImages(prev => [...prev, ...urls]);
  }, [uploadImages]);

  const handleVoiceRecord = useCallback(async () => {
    if (isRecording) {
      const transcription = await stopRecording();
      if (transcription) {
        setInputText(prev => prev + (prev ? ' ' : '') + transcription);
      }
    } else {
      await startRecording();
    }
  }, [isRecording, stopRecording, startRecording]);

  const removeImage = useCallback((index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const resetForm = useCallback(() => {
    setInputText('');
    setUploadedImages([]);
    setShowConfirmationDialog(false);
    setAnalyzedMealData(null);
    setSelectedMealType('other');
    setIsProcessing(false);
  }, []);

  const closeDialog = useCallback(() => {
    setShowConfirmationDialog(false);
  }, []);

  return {
    // Core API functions
    analyzeMealText,
    startRecording,
    stopRecording,
    uploadImages,
    
    // State
    isAnalyzing,
    isRecording,
    isUploading,
    recordingTime,
    inputText,
    setInputText,
    uploadedImages,
    showConfirmationDialog,
    analyzedMealData,
    selectedMealType,
    isProcessing,
    uploadProgress,
    
    // Handlers
    handleSubmitMeal,
    handlePhotoUpload,
    handleVoiceRecord,
    removeImage,
    resetForm,
    closeDialog,
    
    // Dialog control
    setShowConfirmationDialog,
    setAnalyzedMealData,
    setSelectedMealType
  };
};
