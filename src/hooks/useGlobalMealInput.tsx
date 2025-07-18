import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";

export const useGlobalMealInput = () => {
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [analyzedMealData, setAnalyzedMealData] = useState<any>(null);
  const [selectedMealType, setSelectedMealType] = useState<string>('');
  
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
      userAuthenticated: !!user?.id
    });
    
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

      console.log('✅ Analysis successful, showing confirmation dialog');
      
      // Always show confirmation dialog for review
      setAnalyzedMealData(data);
      setSelectedMealType(getCurrentMealType());
      setShowConfirmationDialog(true);
      
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
      }
    } else {
      try {
        await startRecording();
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
    
    console.log('Starting upload for user:', user.id);
    
    setIsAnalyzing(true);
    
    try {
      const uploadedUrls: string[] = [];
      
      for (const file of files) {
        console.log('Processing file:', file.name, 'Size:', file.size, 'Type:', file.type);
        
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`Datei ${file.name} ist zu groß (max. 10MB)`);
        }
        
        if (!file.type.startsWith('image/')) {
          throw new Error(`Datei ${file.name} ist kein Bild`);
        }
        
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        console.log('Uploading to:', fileName);
        
        let data;
        try {
          const uploadResult = await supabase.storage
            .from('meal-images')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (uploadResult.error) {
            console.error('Storage upload error:', uploadResult.error);
            throw new Error(`Upload fehlgeschlagen: ${uploadResult.error.message}`);
          }
          
          data = uploadResult.data;
          console.log('Upload successful:', data);
        } catch (uploadError: any) {
          console.error('Upload attempt failed:', uploadError);
          
          // Check auth state
          const { data: authUser } = await supabase.auth.getUser();
          console.log('Current auth state:', authUser.user ? 'Authenticated' : 'Not authenticated');
          
          // Try with different settings as fallback
          console.log('Retrying upload with different settings...');
          try {
            const retryResult = await supabase.storage
              .from('meal-images')
              .upload(fileName, file, {
                cacheControl: '0',
                upsert: true
              });
              
            if (retryResult.error) {
              console.error('Retry upload also failed:', retryResult.error);
              throw new Error(`Upload fehlgeschlagen (auch bei Wiederholung): ${retryResult.error.message}`);
            }
            
            data = retryResult.data;
            console.log('Retry upload successful:', data);
          } catch (retryError: any) {
            console.error('Both upload attempts failed:', retryError);
            throw new Error(`Upload komplett fehlgeschlagen: ${uploadError.message || 'Netzwerkfehler'}`);
          }
        }
        
        const { data: urlData } = supabase.storage
          .from('meal-images')
          .getPublicUrl(fileName);
        
        console.log('Public URL:', urlData.publicUrl);
        uploadedUrls.push(urlData.publicUrl);
      }
      
      setUploadedImages(prev => [...prev, ...uploadedUrls]);
      
    } catch (error: any) {
      console.error('Error in photo upload:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      toast.error(error.message || 'Fehler beim Hochladen');
    } finally {
      setIsAnalyzing(false);
      event.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
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
    setShowConfirmationDialog,
    analyzedMealData,
    selectedMealType,
    setSelectedMealType,
    uploadedImages,
    setUploadedImages,
    setAnalyzedMealData,
    removeImage
  };
};