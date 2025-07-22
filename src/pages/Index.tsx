import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MealInput } from "@/components/MealInput";
import { MealList } from "@/components/MealList";
import { DailyProgress } from "@/components/DailyProgress";
import { QuickWeightInput } from "@/components/QuickWeightInput";
import { QuickWorkoutInput } from "@/components/QuickWorkoutInput";
import { QuickSleepInput } from "@/components/QuickSleepInput";
import { DailyGreeting } from "@/components/DailyGreeting";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { useGlobalMealInput } from "@/hooks/useGlobalMealInput";
import { uploadImages, UploadProgress as UploadProgressType } from "@/utils/uploadHelpers";

interface MealData {
  id: string;
  text: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  timestamp: Date;
  meal_type?: string;
  quality_score?: number;
  bonus_points?: number;
  ai_feedback?: string;
  evaluation_criteria?: any;
}

const Index = () => {
  const { user } = useAuth();
  const { awardPoints, updateStreak, evaluateMeal, getPointsForActivity } = usePointsSystem();
  const {
    inputText,
    setInputText,
    uploadedImages,
    setUploadedImages,
    clearInput,
    isAnalyzing,
    setIsAnalyzing,
    uploadProgress,
    setUploadProgress,
    isUploading,
    setIsUploading
  } = useGlobalMealInput();

  const [dailyMeals, setDailyMeals] = useState<MealData[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load today's meals
  const loadTodaysMeals = async () => {
    if (!user?.id) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading meals:', error);
        return;
      }

      const mealsWithTimestamp = (data || []).map(meal => ({
        ...meal,
        timestamp: new Date(meal.created_at)
      }));

      setDailyMeals(mealsWithTimestamp);
    } catch (error) {
      console.error('Error in loadTodaysMeals:', error);
    }
  };

  useEffect(() => {
    loadTodaysMeals();
  }, [user?.id, refreshTrigger]);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user?.id) return;

    setIsUploading(true);
    try {
      const { uploadedUrls } = await uploadImages(Array.from(files), user.id, setUploadProgress);
      setUploadedImages(prev => [...prev, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} Bild(er) hochgeladen`);
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Fehler beim Hochladen der Bilder');
    } finally {
      setIsUploading(false);
      setUploadProgress([]);
    }
  };

  const handleVoiceRecord = async () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error('Sprachaufnahme wird von diesem Browser nicht unterstützt');
      return;
    }

    try {
      setIsRecording(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        
        if (audioChunks.length === 0) return;

        setIsProcessing(true);
        try {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.wav');

          const { data, error } = await supabase.functions.invoke('voice-to-text', {
            body: formData
          });

          if (error) throw error;

          if (data.text) {
            setInputText(data.text);
            toast.success('Sprachaufnahme erfolgreich transkribiert');
          } else {
            toast.error('Keine Sprache erkannt');
          }
        } catch (error) {
          console.error('Error processing voice:', error);
          toast.error('Fehler bei der Sprachverarbeitung');
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();

      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsRecording(false);
        }
      }, 30000);

    } catch (error) {
      console.error('Error starting voice recording:', error);
      toast.error('Fehler beim Zugriff auf das Mikrofon');
      setIsRecording(false);
    }
  };

  const handleSubmitMeal = async () => {
    if ((!inputText.trim() && uploadedImages.length === 0) || !user?.id) {
      return;
    }

    setIsAnalyzing(true);
    try {
      let mealData;
      
      if (uploadedImages.length > 0) {
        // Analyze with images
        const { data, error } = await supabase.functions.invoke('analyze-meal', {
          body: {
            images: uploadedImages,
            description: inputText.trim() || undefined
          }
        });

        if (error) throw error;
        mealData = data;
      } else {
        // Text-only analysis
        const { data, error } = await supabase.functions.invoke('analyze-meal', {
          body: {
            description: inputText.trim()
          }
        });

        if (error) throw error;
        mealData = data;
      }

      // Save meal to database
      const { data: savedMeal, error: saveError } = await supabase
        .from('meals')
        .insert({
          user_id: user.id,
          text: mealData.title || inputText.trim(),
          calories: mealData.calories || 0,
          protein: mealData.protein || 0,
          carbs: mealData.carbs || 0,
          fats: mealData.fats || 0,
          meal_type: mealData.meal_type || 'other'
        })
        .select()
        .single();

      if (saveError) throw saveError;

      // Save images if any
      if (uploadedImages.length > 0) {
        const imageInserts = uploadedImages.map(imageUrl => ({
          user_id: user.id,
          meal_id: savedMeal.id,
          image_url: imageUrl
        }));

        const { error: imageError } = await supabase
          .from('meal_images')
          .insert(imageInserts);

        if (imageError) {
          console.error('Error saving meal images:', imageError);
        }
      }

      // Award points for meal tracking
      const hasPhoto = uploadedImages.length > 0;
      const basePoints = hasPhoto ? 5 : 3;
      
      await awardPoints(
        hasPhoto ? 'meal_tracked_with_photo' : 'meal_tracked',
        basePoints,
        `Mahlzeit eingetragen${hasPhoto ? ' (mit Foto)' : ''}`
      );

      // Update meal streak
      await updateStreak('meal');

      // **PHASE 1: Automatische Mahlzeit-Bewertung**
      try {
        const evaluationResult = await evaluateMeal(savedMeal.id, {
          ...savedMeal,
          images: uploadedImages.map((url, index) => ({ id: `temp_${index}`, image_url: url }))
        });
        
        if (evaluationResult) {
          console.log('✅ Meal evaluation completed:', evaluationResult);
        }
      } catch (evaluationError) {
        console.error('❌ Meal evaluation failed (non-critical):', evaluationError);
        // Don't show error to user - evaluation is optional enhancement
      }

      // Show success message
      toast.success(`🎯 ${basePoints} Punkte! Mahlzeit erfolgreich eingetragen`);

      // Clear form and refresh
      clearInput();
      setRefreshTrigger(prev => prev + 1);

    } catch (error: any) {
      console.error('Error submitting meal:', error);
      toast.error('Fehler beim Eintragen der Mahlzeit');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEditMeal = (meal: MealData) => {
    console.log('Edit meal:', meal);
  };

  const handleDeleteMeal = async (mealId: string) => {
    if (!user?.id) return;

    try {
      // Delete meal images first
      const { error: imageError } = await supabase
        .from('meal_images')
        .delete()
        .eq('meal_id', mealId);

      if (imageError) {
        console.error('Error deleting meal images:', imageError);
      }

      // Delete meal
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', mealId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Mahlzeit gelöscht');
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting meal:', error);
      toast.error('Fehler beim Löschen der Mahlzeit');
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto p-4 space-y-6 pb-20">
      <DailyGreeting />
      
      <DailyProgress />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <QuickWeightInput onWeightAdded={() => setRefreshTrigger(prev => prev + 1)} />
          <QuickWorkoutInput onWorkoutAdded={() => setRefreshTrigger(prev => prev + 1)} />
          <QuickSleepInput onSleepAdded={() => setRefreshTrigger(prev => prev + 1)} />
        </div>
        
        <div className="space-y-6">
          <MealInput
            inputText={inputText}
            setInputText={setInputText}
            onSubmitMeal={handleSubmitMeal}
            onPhotoUpload={handlePhotoUpload}
            onVoiceRecord={handleVoiceRecord}
            isAnalyzing={isAnalyzing}
            isRecording={isRecording}
            isProcessing={isProcessing}
            uploadedImages={uploadedImages}
            onRemoveImage={removeImage}
            uploadProgress={uploadProgress}
            isUploading={isUploading}
          />
          
          <MealList
            dailyMeals={dailyMeals}
            onEditMeal={handleEditMeal}
            onDeleteMeal={handleDeleteMeal}
            onUpdateMeal={() => setRefreshTrigger(prev => prev + 1)}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
