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
    if (!inputText.trim()) {
      toast.error('Bitte Text eingeben');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const hasImages = uploadedImages.length > 0;
      
      const { data, error } = await supabase.functions.invoke('analyze-meal', {
        body: { 
          text: inputText,
          images: hasImages ? uploadedImages : undefined
        },
      });

      if (error) throw error;
      if (!data || !data.total) throw new Error('Ungültige Antwort');

      if (hasImages) {
        setAnalyzedMealData(data);
        setSelectedMealType(getCurrentMealType());
        setShowConfirmationDialog(true);
      } else {
        // Direct save for text-only
        const newMeal = {
          user_id: user?.id,
          text: inputText,
          calories: Math.round(data.total.calories),
          protein: Math.round(data.total.protein),
          carbs: Math.round(data.total.carbs),
          fats: Math.round(data.total.fats),
          meal_type: getCurrentMealType()
        };

        const { error: insertError } = await supabase
          .from('meals')
          .insert([newMeal]);

        if (insertError) throw insertError;

        setInputText("");
        toast.success('Mahlzeit hinzugefügt!');
        
        // Trigger refresh event
        window.dispatchEvent(new CustomEvent('meal-added'));
      }
    } catch (error: any) {
      console.error('Error analyzing meal:', error);
      toast.error(error.message || 'Fehler beim Analysieren');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleVoiceRecord = async () => {
    if (isRecording) {
      const transcribedText = await stopRecording();
      if (transcribedText) {
        setInputText(prev => prev ? prev + ' ' + transcribedText : transcribedText);
        toast.success('Spracheingabe hinzugefügt');
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
    
    if (files.length > 5) {
      toast.error('Maximal 5 Bilder erlaubt');
      return;
    }
    
    setIsAnalyzing(true);
    toast.info('Lade Bilder hoch...');
    
    try {
      const uploadedUrls: string[] = [];
      
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`Datei ${file.name} ist zu groß (max. 10MB)`);
        }
        
        if (!file.type.startsWith('image/')) {
          throw new Error(`Datei ${file.name} ist kein Bild`);
        }
        
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('meal-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (error) throw new Error(`Upload fehlgeschlagen: ${error.message}`);
        
        const { data: urlData } = supabase.storage
          .from('meal-images')
          .getPublicUrl(fileName);
        
        uploadedUrls.push(urlData.publicUrl);
      }
      
      setUploadedImages(uploadedUrls);
      
      const { data, error } = await supabase.functions.invoke('analyze-meal', {
        body: { 
          text: inputText || 'Analysiere diese Mahlzeit',
          images: uploadedUrls
        },
      });
      
      if (error) throw new Error(`Analyse fehlgeschlagen: ${error.message}`);
      if (!data || !data.total) throw new Error('Ungültige Antwort vom Analysedienst');
      
      setAnalyzedMealData(data);
      setSelectedMealType(getCurrentMealType());
      setShowConfirmationDialog(true);
      
    } catch (error: any) {
      console.error('Error in photo upload:', error);
      toast.error(error.message || 'Fehler beim Hochladen');
    } finally {
      setIsAnalyzing(false);
      event.target.value = '';
    }
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
    setAnalyzedMealData
  };
};