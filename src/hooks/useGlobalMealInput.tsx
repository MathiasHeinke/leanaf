import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { uploadFilesWithProgress, UploadProgress } from '@/utils/uploadHelpers';

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
  
  // Core states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [analyzedMealData, setAnalyzedMealData] = useState<AnalyzedMealData | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<string>('other');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Upload states - completely isolated
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  
  // Recording states - completely isolated
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  // Refs for media recorder
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function for media recorder
  const cleanupMediaRecorder = useCallback(() => {
    console.log('🧹 Cleaning up MediaRecorder...');
    
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current.stream?.getTracks().forEach(track => {
        track.stop();
        console.log('🔇 Audio track stopped');
      });
      mediaRecorderRef.current = null;
    }
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingTime(0);
    console.log('✅ MediaRecorder cleanup complete');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupMediaRecorder();
    };
  }, [cleanupMediaRecorder]);

  // Meal analysis function
  const analyzeMealText = useCallback(async (text: string, images: string[] = []): Promise<MealData | null> => {
    if (!user || (!text.trim() && images.length === 0)) return null;

    const analysisStartTime = Date.now();
    console.log('🔍 [FRONTEND] Starting meal analysis...', { 
      textLength: text?.length || 0,
      textPreview: text ? text.substring(0, 50) + '...' : 'NO TEXT',
      imageCount: images.length,
      imageUrls: images.map(url => url.substring(0, 50) + '...')
    });
    
    setIsAnalyzing(true);
    
    try {
      const requestPayload = { 
        text: text.trim() || null,
        images: images.length > 0 ? images : null
      };
      
      console.log('📤 [FRONTEND] Sending to analyze-meal function:', requestPayload);
      
      const { data, error } = await supabase.functions.invoke('analyze-meal', {
        body: requestPayload
      });

      const analysisDuration = Date.now() - analysisStartTime;
      console.log(`⏱️ [FRONTEND] Analysis completed in ${analysisDuration}ms (${(analysisDuration/1000).toFixed(1)}s)`);

      if (error) {
        console.error('❌ [FRONTEND] Meal analysis error:', error);
        throw error;
      }

      console.log('✅ [FRONTEND] Meal analysis successful:', {
        hasTitle: !!data?.title,
        hasTotal: !!data?.total,
        totalCalories: data?.total?.calories,
        itemsCount: data?.items?.length || 0,
        confidence: data?.confidence,
        hasNotes: !!data?.notes
      });

      // Handle standardized response format
      if (data?.total) {
        const result = {
          text: data.title || text.trim() || 'Analysierte Mahlzeit',
          calories: data.total.calories || 0,
          protein: data.total.protein || 0,
          carbs: data.total.carbs || 0,
          fats: data.total.fats || 0,
          meal_type: 'other'
        };
        
        console.log('📋 [FRONTEND] Returning meal data:', result);
        return result;
      }

      // Fallback for legacy format
      if (data?.meal) {
        console.log('⚠️ [FRONTEND] Using legacy response format');
        return {
          text: text.trim() || 'Analysierte Mahlzeit',
          calories: data.meal.calories || 0,
          protein: data.meal.protein || 0,
          carbs: data.meal.carbs || 0,
          fats: data.meal.fats || 0,
          meal_type: data.meal.meal_type || 'other'
        };
      }

      console.error('❌ [FRONTEND] Unexpected response format:', data);
      return null;
    } catch (error: any) {
      const analysisDuration = Date.now() - analysisStartTime;
      console.error('❌ [FRONTEND] Meal analysis failed after', `${analysisDuration}ms:`, error);
      
      if (error.message?.includes('Weder Text noch Bild')) {
        toast.error('Bitte geben Sie Text ein oder laden Sie ein Bild hoch');
      } else if (error.message?.includes('timeout')) {
        toast.error('Analyse dauert zu lange - bitte versuchen Sie es erneut');
      } else {
        toast.error('Analyse fehlgeschlagen: ' + (error.message || 'Unbekannter Fehler'));
      }
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [user]);

  // Voice recording functions - completely isolated
  const startRecording = useCallback(async () => {
    console.log('🎤 Starting voice recording...');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      console.log('✅ Voice recording started');

    } catch (error) {
      console.error('❌ Recording error:', error);
      toast.error('Mikrofonzugriff verweigert');
      cleanupMediaRecorder();
    }
  }, [cleanupMediaRecorder]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    console.log('🛑 Stopping voice recording...');
    
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        console.log('❌ No active recording to stop');
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        setIsProcessing(true);
        
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          console.log('🔄 Converting audio to base64...');
          
          // Convert to base64 for edge function
          const reader = new FileReader();
          reader.onload = async () => {
            try {
              const base64Data = reader.result as string;
              
              console.log('📤 Sending audio to voice-to-text...');
              const { data, error } = await supabase.functions.invoke('voice-to-text', {
                body: { audio: base64Data }
              });

              if (error) {
                console.error('❌ Voice processing error:', error);
                throw error;
              }

              console.log('✅ Voice transcription successful:', data?.text);
              resolve(data?.text || null);
            } catch (error) {
              console.error('❌ Voice processing error:', error);
              toast.error('Spracherkennung fehlgeschlagen');
              resolve(null);
            } finally {
              setIsProcessing(false);
              cleanupMediaRecorder();
            }
          };
          
          reader.onerror = () => {
            console.error('❌ FileReader error');
            toast.error('Audio-Konvertierung fehlgeschlagen');
            setIsProcessing(false);
            cleanupMediaRecorder();
            resolve(null);
          };
          
          reader.readAsDataURL(audioBlob);
        } catch (error) {
          console.error('❌ Audio processing error:', error);
          toast.error('Audio-Verarbeitung fehlgeschlagen');
          setIsProcessing(false);
          cleanupMediaRecorder();
          resolve(null);
        }
      };

      mediaRecorderRef.current.stop();
    });
  }, [isRecording, cleanupMediaRecorder]);

  // Upload functions - completely isolated
  const uploadImages = useCallback(async (files: File[]): Promise<string[]> => {
    if (!user || files.length === 0) return [];

    const uploadStartTime = Date.now();
    console.log('📤 [FRONTEND] Starting image upload...', { 
      fileCount: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0)
    });
    
    setIsUploading(true);
    setUploadProgress([]);

    try {
      const result = await uploadFilesWithProgress(files, user.id, (progress) => {
        console.log('📊 [FRONTEND] Upload progress update:', progress);
        setUploadProgress(progress);
      });

      const uploadDuration = Date.now() - uploadStartTime;
      console.log(`⏱️ [FRONTEND] Upload completed in ${uploadDuration}ms (${(uploadDuration/1000).toFixed(1)}s)`);

      if (result.errors.length > 0) {
        console.error('⚠️ [FRONTEND] Upload errors:', result.errors);
        result.errors.forEach(error => {
          toast.error(error);
        });
      }

      if (result.success) {
        console.log('✅ [FRONTEND] Upload successful:', result.urls);
        toast.success(`${result.urls.length} Bild(er) erfolgreich hochgeladen`);
      }

      return result.urls;
    } catch (error: any) {
      const uploadDuration = Date.now() - uploadStartTime;
      console.error('❌ [FRONTEND] Upload error after', `${uploadDuration}ms:`, error);
      toast.error('Upload fehlgeschlagen: ' + (error.message || 'Unbekannter Fehler'));
      return [];
    } finally {
      setIsUploading(false);
    }
  }, [user]);

  // Event handlers - completely decoupled
  const handleSubmitMeal = useCallback(async () => {
    console.log('🚀 [FRONTEND] Submitting meal...', { 
      textLength: inputText?.length || 0,
      textPreview: inputText ? inputText.substring(0, 50) + '...' : 'NO TEXT',
      imageCount: uploadedImages.length 
    });
    
    if (!inputText.trim() && uploadedImages.length === 0) {
      toast.error('Bitte geben Sie Text ein oder laden Sie ein Bild hoch');
      return;
    }

    setIsProcessing(true);
    try {
      const mealData = await analyzeMealText(inputText, uploadedImages);
      if (mealData) {
        console.log('✅ [FRONTEND] Meal analysis completed, showing confirmation dialog');
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
      } else {
        console.error('❌ [FRONTEND] No meal data received');
        toast.error('Keine Daten von der Analyse erhalten');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [inputText, uploadedImages, analyzeMealText]);

  const handlePhotoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📷 Photo upload triggered');
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Clear the input to allow re-uploading the same file
    event.target.value = '';

    const urls = await uploadImages(files);
    setUploadedImages(prev => [...prev, ...urls]);
  }, [uploadImages]);

  const handleVoiceRecord = useCallback(async () => {
    console.log('🎙️ Voice record button clicked, current state:', { isRecording, isProcessing });
    
    if (isRecording) {
      console.log('🛑 Stopping recording...');
      const transcription = await stopRecording();
      if (transcription) {
        setInputText(prev => prev + (prev ? ' ' : '') + transcription);
      }
    } else {
      console.log('🎤 Starting recording...');
      await startRecording();
    }
  }, [isRecording, isProcessing, stopRecording, startRecording]);

  const removeImage = useCallback((index: number) => {
    console.log('🗑️ Removing image at index:', index);
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const resetForm = useCallback(() => {
    console.log('🔄 Resetting form...');
    setInputText('');
    setUploadedImages([]);
    setShowConfirmationDialog(false);
    setAnalyzedMealData(null);
    setSelectedMealType('other');
    setIsProcessing(false);
    setUploadProgress([]);
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
