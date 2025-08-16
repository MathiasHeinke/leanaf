import { useState, useCallback, useRef, useEffect, createContext, useContext, ReactNode } from 'react';
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

const ERROR_MESSAGES = {
  NO_INPUT: 'Bitte geben Sie Text ein oder laden Sie ein Bild hoch',
  TIMEOUT: 'Analyse dauert zu lange - bitte versuchen Sie erneut',
  ANALYSIS_FAILED: 'Analyse fehlgeschlagen',
  MICROPHONE_DENIED: 'Mikrofonzugriff verweigert',
  VOICE_FAILED: 'Spracherkennung fehlgeschlagen',
  UPLOAD_FAILED: 'Upload fehlgeschlagen',
  RECORDING_TIMEOUT: 'Aufnahme-Timeout - bitte erneut versuchen',
  AUDIO_CONVERSION_FAILED: 'Audio-Konvertierung fehlgeschlagen',
  AUDIO_PROCESSING_FAILED: 'Audio-Verarbeitung fehlgeschlagen',
  RECORDING_STOP_FAILED: 'Fehler beim Stoppen der Aufnahme'
};

export const MealInputContext = createContext<any>(null);

export const MealInputProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  // Core states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [analyzedMealData, setAnalyzedMealData] = useState<AnalyzedMealData | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<string>('other');
  
  // Edit mode states
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [quickMealSheetOpen, setQuickMealSheetOpen] = useState(false);
  
  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  // Refs for media recorder
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Streamlined data parsing function
  const parseAnalyzeResponse = useCallback((data: any) => {
    try {
      if (!data) return null;

      // Helper to coerce possible string numbers (e.g. "12,5")
      const num = (v: any) => {
        if (typeof v === 'number') return v;
        if (typeof v === 'string') {
          const n = parseFloat(v.replace(',', '.'));
          return Number.isFinite(n) ? n : 0;
        }
        return 0;
      };

      // Some functions may wrap payloads
      const candidates = [data, data?.data, data?.result];

      for (const d of candidates) {
        if (!d) continue;
        // Case 1: total object present
        if (d.total && typeof d.total === 'object') {
          return {
            text: d.title || 'Analysierte Mahlzeit',
            calories: num(d.total.calories),
            protein: num(d.total.protein),
            carbs: num(d.total.carbs),
            fats: num(d.total.fats),
            meal_type: 'other'
          } as MealData;
        }
        // Case 2: flattened totals
        if (d.calories !== undefined || d.protein !== undefined || d.carbs !== undefined || d.fats !== undefined) {
          return {
            text: d.title || 'Analysierte Mahlzeit',
            calories: num(d.calories),
            protein: num(d.protein),
            carbs: num(d.carbs),
            fats: num(d.fats),
            meal_type: 'other'
          } as MealData;
        }
        // Case 3: derive totals from items
        if (Array.isArray(d.items) && d.items.length > 0) {
          const totals = d.items.reduce(
            (a: any, it: any) => ({
              calories: a.calories + num(it.calories),
              protein: a.protein + num(it.protein),
              carbs: a.carbs + num(it.carbs),
              fats: a.fats + num(it.fats)
            }),
            { calories: 0, protein: 0, carbs: 0, fats: 0 }
          );
          return {
            text: d.title || 'Analysierte Mahlzeit',
            calories: Math.round(totals.calories),
            protein: Math.round(totals.protein * 10) / 10,
            carbs: Math.round(totals.carbs * 10) / 10,
            fats: Math.round(totals.fats * 10) / 10,
            meal_type: 'other'
          } as MealData;
        }
      }
      return null;
    } catch (e) {
      console.warn('parseAnalyzeResponse: unexpected format', e, data);
      return null;
    }
  }, []);

  // Cleanup function for media recorder
  const cleanupMediaRecorder = useCallback(() => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (error) {
          console.warn('Error stopping MediaRecorder:', error);
        }
      }
      mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    
    audioChunksRef.current = [];
    setIsRecording(false);
    setIsVoiceProcessing(false);
    setRecordingTime(0);
  }, []);

  useEffect(() => {
    return () => {
      cleanupMediaRecorder();
    };
  }, [cleanupMediaRecorder]);

  // Meal analysis function
  const analyzeMealText = useCallback(async (text: string, images: string[] = []): Promise<MealData | null> => {
    if (!user || (!text.trim() && images.length === 0)) return null;
    
    setIsAnalyzing(true);
    
    try {
      // Get current session for authorization
      const session = await supabase.auth.getSession();
      console.log('🔍 Trigger analyze-meal with text:', text, 'and images:', images);
      console.log('📋 Request payload:', JSON.stringify({ text: text.trim() || null, images: images.length > 0 ? images : null }, null, 2));
      
      const { data, error } = await supabase.functions.invoke('analyze-meal', {
        body: { 
          text: text.trim() || null,
          images: images.length > 0 ? images : null
        },
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`,
        }
      });

      if (error) throw error;

      const parsedMealData = parseAnalyzeResponse(data);
      if (!parsedMealData && data) {
        // Fallback: open dialog with editable zeros so the user isn't blocked
        console.debug('analyze-meal: unrecognized payload, using fallback', data);
        return {
          text: data?.title || data?.text || 'Analysierte Mahlzeit',
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          meal_type: 'other'
        } as MealData;
      }
      return parsedMealData;
    } catch (error: any) {
      if (error.message?.includes('Weder Text noch Bild')) {
        toast.error(ERROR_MESSAGES.NO_INPUT);
      } else if (error.message?.includes('timeout')) {
        toast.error(ERROR_MESSAGES.TIMEOUT);
      } else {
        toast.error(ERROR_MESSAGES.ANALYSIS_FAILED + ': ' + (error.message || 'Unbekannter Fehler'));
      }
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [user, parseAnalyzeResponse]);

  // Voice recording functions
  const startRecording = useCallback(async () => {
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

    } catch (error) {
      toast.error(ERROR_MESSAGES.MICROPHONE_DENIED);
      cleanupMediaRecorder();
    }
  }, [cleanupMediaRecorder]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    setIsRecording(false);
    setIsVoiceProcessing(true);

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        setIsVoiceProcessing(false);
        resolve(null);
        return;
      }

      stopTimeoutRef.current = setTimeout(() => {
        cleanupMediaRecorder();
        toast.error(ERROR_MESSAGES.RECORDING_TIMEOUT);
        resolve(null);
      }, 5000);

      try {
        mediaRecorderRef.current.onstop = async () => {
          if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current);
            stopTimeoutRef.current = null;
          }
          
          try {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            
            const reader = new FileReader();
            reader.onload = async () => {
              try {
                const base64Data = reader.result as string;
                
                const { data, error } = await supabase.functions.invoke('voice-to-text', {
                  body: { audio: base64Data }
                });

                if (error) throw error;
                resolve(data?.text || null);
              } catch (error) {
                toast.error(ERROR_MESSAGES.VOICE_FAILED);
                resolve(null);
              } finally {
                cleanupMediaRecorder();
              }
            };
            
            reader.onerror = () => {
              toast.error(ERROR_MESSAGES.AUDIO_CONVERSION_FAILED);
              cleanupMediaRecorder();
              resolve(null);
            };
            
            reader.readAsDataURL(audioBlob);
          } catch (error) {
            toast.error(ERROR_MESSAGES.AUDIO_PROCESSING_FAILED);
            cleanupMediaRecorder();
            resolve(null);
          }
        };

        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        } else {
          cleanupMediaRecorder();
          resolve(null);
        }
      } catch (error) {
        cleanupMediaRecorder();
        toast.error(ERROR_MESSAGES.RECORDING_STOP_FAILED);
        resolve(null);
      }
    });
  }, [cleanupMediaRecorder]);

  // Upload function
  const uploadImages = useCallback(async (files: File[]): Promise<string[]> => {
    if (!user || files.length === 0) return [];
    
    setIsUploading(true);
    setUploadProgress([]);

    try {
      const result = await uploadFilesWithProgress(files, user.id, (progress) => {
        setUploadProgress(progress);
      });

      if (result.errors.length > 0) {
        result.errors.forEach(error => toast.error(error));
      }

      if (result.success) {
        // UI zeigt bereits visuelles Feedback
      }

      return result.urls;
    } catch (error: any) {
      toast.error(ERROR_MESSAGES.UPLOAD_FAILED + ': ' + (error.message || 'Unbekannter Fehler'));
      return [];
    } finally {
      setIsUploading(false);
    }
  }, [user]);

  // Simplified state update function
  const updateDialogState = useCallback((mealData: AnalyzedMealData, mealType: string) => {
    setAnalyzedMealData(mealData);
    setSelectedMealType(mealType);
    setTimeout(() => setShowConfirmationDialog(true), 50);
  }, []);

  // Event handlers
  const handleSubmitMeal = useCallback(async () => {
    if (!inputText.trim() && uploadedImages.length === 0) {
      toast.error(ERROR_MESSAGES.NO_INPUT);
      return;
    }

    try {
      const mealData = await analyzeMealText(inputText, uploadedImages);
      
      if (mealData) {
        const analyzedData = {
          title: mealData.text,
          calories: mealData.calories,
          protein: mealData.protein,
          carbs: mealData.carbs,
          fats: mealData.fats,
          meal_type: mealData.meal_type || 'other',
          confidence: 0.85
        };
        
        updateDialogState(analyzedData, mealData.meal_type || 'other');
      } else {
        toast.error('Keine Daten von der Analyse erhalten');
      }
    } catch (error) {
      toast.error('Fehler beim Analysieren der Mahlzeit');
    }
  }, [inputText, uploadedImages, analyzeMealText, updateDialogState]);

  const handlePhotoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    event.target.value = '';
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

  const appendUploadedImages = useCallback((urls: string[]) => {
    if (!urls || urls.length === 0) return;
    setUploadedImages(prev => [...prev, ...urls]);
  }, []);

  const resetForm = useCallback(() => {
    setInputText('');
    setUploadedImages([]);
    setShowConfirmationDialog(false);
    setAnalyzedMealData(null);
    setSelectedMealType('other');
    setUploadProgress([]);
  }, []);

  const closeDialog = useCallback(() => {
    setShowConfirmationDialog(false);
  }, []);

  // Edit mode functions
  const enterEditMode = useCallback((mealData: AnalyzedMealData) => {
    setInputText(mealData.title);
    setAnalyzedMealData(mealData);
    setSelectedMealType(mealData.meal_type);
    setIsEditingMode(true);
    setShowConfirmationDialog(false);
  }, []);

  const exitEditMode = useCallback(() => {
    setIsEditingMode(false);
  }, []);

  const openQuickMealSheet = useCallback((tab?: "text" | "photo" | "voice") => {
    setQuickMealSheetOpen(true);
  }, []);

  const closeQuickMealSheet = useCallback(() => {
    setQuickMealSheetOpen(false);
    if (isEditingMode) {
      exitEditMode();
    }
  }, [isEditingMode, exitEditMode]);

  const value = {
    // Core API functions
    analyzeMealText,
    startRecording,
    stopRecording,
    uploadImages,
    
    // State
    isAnalyzing,
    isRecording,
    isProcessing: isVoiceProcessing,
    isUploading,
    recordingTime,
    inputText,
    setInputText,
    uploadedImages,
    showConfirmationDialog,
    analyzedMealData,
    selectedMealType,
    uploadProgress,
    
    // Handlers
    handleSubmitMeal,
    handlePhotoUpload,
    handleVoiceRecord,
    removeImage,
    appendUploadedImages,
    resetForm,
    closeDialog,
    
    // Dialog control
    setShowConfirmationDialog,
    setAnalyzedMealData,
    setSelectedMealType,
    
    // Edit mode
    isEditingMode,
    enterEditMode,
    exitEditMode,
    
    // Sheet control
    quickMealSheetOpen,
    openQuickMealSheet,
    closeQuickMealSheet
  };

  return (
    <MealInputContext.Provider value={value}>
      {children}
    </MealInputContext.Provider>
  );
};

export const useGlobalMealInput = () => {
  const ctx = useContext(MealInputContext);
  if (!ctx) {
    throw new Error('useGlobalMealInput must be used within MealInputProvider');
  }
  return ctx;
};