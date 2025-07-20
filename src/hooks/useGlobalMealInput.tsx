
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { uploadFilesWithProgress, UploadProgress } from "@/utils/uploadHelpers";

export const useGlobalMealInput = () => {
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [analyzedMealData, setAnalyzedMealData] = useState<any>(null);
  const [selectedMealType, setSelectedMealType] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const { user } = useAuth();
  const voiceHook = useVoiceRecording();
  const isRecording = voiceHook?.isRecording || false;
  const isProcessing = voiceHook?.isProcessing || false;
  const startRecording = voiceHook?.startRecording || (() => Promise.resolve());
  const stopRecording = voiceHook?.stopRecording || (() => Promise.resolve(null));

  const getCurrentMealType = () => {
    const hour = new Date().getHours();
    if (hour < 10) return "breakfast";
    if (hour < 15) return "lunch"; 
    if (hour < 19) return "dinner";
    return "snack";
  };

  const handleSubmitMeal = async () => {
    console.log('🚀 handleSubmitMeal called with:', {
      inputText: inputText.trim(),
      uploadedImages: uploadedImages.length,
      userAuthenticated: !!user?.id,
      userId: user?.id
    });
    
    if (!user?.id) {
      console.log('❌ Submit blocked: User not authenticated');
      toast.error('Bitte melden Sie sich zuerst an');
      return;
    }
    
    if (!inputText.trim() && uploadedImages.length === 0) {
      console.log('❌ Submit blocked: No text and no images');
      toast.error('Bitte Text eingeben oder Bilder hochladen');
      return;
    }

    console.log('✅ Submit validation passed, starting analysis...');
    setIsAnalyzing(true);
    
    try {
      const hasImages = uploadedImages.length > 0;
      
      console.log('📡 Calling analyze-meal with:', {
        text: inputText || 'Analysiere diese Mahlzeit',
        images: hasImages ? uploadedImages : undefined,
        imageCount: hasImages ? uploadedImages.length : 0
      });
      
      const { data, error } = await supabase.functions.invoke('analyze-meal', {
        body: { 
          text: inputText || 'Analysiere diese Mahlzeit',
          images: hasImages ? uploadedImages : undefined
        },
      });

      console.log('📡 analyze-meal response:', { data, error });

      if (error) {
        console.error('❌ Supabase function error:', error);
        throw new Error(`Analyse fehlgeschlagen: ${error.message}`);
      }
      
      if (!data || !data.total) {
        console.error('❌ Invalid response data:', data);
        throw new Error('Ungültige Antwort vom Analysedienst');
      }

      console.log('✅ Analysis successful, setting dialog state...');
      console.log('📋 Analyzed meal data:', JSON.stringify(data, null, 2));
      
      // Get meal type before setting states
      const currentMealType = getCurrentMealType();
      console.log('🍽️ Current meal type:', currentMealType);
      
      // Set all states synchronously
      console.log('📊 Setting analyzedMealData...');
      setAnalyzedMealData(data);
      
      console.log('🍽️ Setting selectedMealType...');
      setSelectedMealType(currentMealType);
      
      console.log('🎯 Setting showConfirmationDialog to true...');
      setShowConfirmationDialog(true);
      
      console.log('📊 Final state after analysis:', {
        analyzedMealDataSet: !!data,
        selectedMealType: currentMealType,
        showConfirmationDialog: true
      });
      
      // NO SUCCESS TOAST - Dialog opening indicates success
      
    } catch (error: any) {
      console.error('❌ Error analyzing meal:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: error.cause
      });
      toast.error(error.message || 'Fehler beim Analysieren');
    } finally {
      console.log('🏁 Analysis finished, setting isAnalyzing to false');
      setIsAnalyzing(false);
    }
  };

  const handleVoiceRecord = async () => {
    if (isRecording) {
      const transcribedText = await stopRecording();
      if (transcribedText) {
        setInputText(prev => prev ? prev + ' ' + transcribedText : transcribedText);
        // NO TOAST - Visual feedback is sufficient
      }
    } else {
      try {
        await startRecording();
        // NO TOAST - Visual indicator shows recording state
      } catch (error) {
        toast.error('Fehler bei der Sprachaufnahme');
      }
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    
    if (!user?.id) {
      toast.error('Benutzer nicht authentifiziert');
      return;
    }
    
    if (uploadedImages.length + files.length > 5) {
      toast.error('Maximal 5 Bilder erlaubt');
      return;
    }
    
    console.log(`🚀 Starting enhanced upload for ${files.length} files, user: ${user.id}`);
    
    setIsUploading(true);
    setUploadProgress([]);
    
    try {
      const result = await uploadFilesWithProgress(
        files,
        user.id,
        (progress) => {
          console.log('📊 Upload progress update:', progress);
          setUploadProgress([...progress]);
        }
      );

      if (result.success && result.urls.length > 0) {
        setUploadedImages(prev => [...prev, ...result.urls]);
        console.log(`✅ Upload completed: ${result.urls.length} files successful`);
        
        // SIMPLIFIED TOAST - Only show if there were errors
        if (result.errors.length > 0) {
          console.warn('⚠️ Some uploads failed:', result.errors);
          toast.warning(`${result.urls.length} Bilder hochgeladen, ${result.errors.length} fehlgeschlagen`);
        }
        // NO SUCCESS TOAST - Visual feedback (images appearing) is sufficient
      } else {
        console.error('❌ All uploads failed:', result.errors);
        toast.error('Upload fehlgeschlagen');
      }
      
    } catch (error: any) {
      console.error('❌ Critical upload error:', error);
      toast.error('Fehler beim Upload');
    } finally {
      setIsUploading(false);
      // Clear progress after a delay to show final state
      setTimeout(() => {
        setUploadProgress([]);
      }, 3000);
      event.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const duplicateMeal = (meal: any) => {
    console.log('🔄 duplicateMeal called with:', meal);
    setInputText(meal.text);
    setSelectedMealType(meal.meal_type);
    // Note: For duplicated meals, we use the existing image URLs
    if (meal.images && meal.images.length > 0) {
      setUploadedImages(meal.images);
      console.log('📸 Setting images:', meal.images);
    } else {
      setUploadedImages([]);
    }
    console.log('✅ Meal duplicated - input text set to:', meal.text);
    
    // Scroll to the meal input at the bottom
    setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
    
    // SIMPLIFIED TOAST - Much shorter and less intrusive
    toast.success("Mahlzeit dupliziert");
  };

  const resetForm = () => {
    console.log('🔄 Resetting form and dialog state');
    setInputText("");
    setUploadedImages([]);
    setSelectedMealType("");
    setShowConfirmationDialog(false);
    setAnalyzedMealData(null);
    setUploadProgress([]);
    setIsUploading(false);
    console.log('✅ Form reset complete');
  };

  // Enhanced dialog close handler with logging
  const handleCloseDialog = () => {
    console.log('🚪 Closing confirmation dialog');
    setShowConfirmationDialog(false);
    setAnalyzedMealData(null);
  };

  return {
    inputText,
    setInputText,
    handleSubmitMeal,
    handlePhotoUpload,
    handleVoiceRecord,
    isAnalyzing,
    isRecording,
    isProcessing,
    showConfirmationDialog,
    setShowConfirmationDialog: handleCloseDialog,
    analyzedMealData,
    selectedMealType,
    setSelectedMealType,
    uploadedImages,
    setUploadedImages,
    setAnalyzedMealData,
    removeImage,
    duplicateMeal,
    resetForm,
    uploadProgress,
    isUploading
  };
};
