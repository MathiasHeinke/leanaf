import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface TargetImage {
  id: string;
  image_url: string;
  image_type: 'uploaded' | 'ai_generated';
  target_weight_kg: number | null;
  target_body_fat_percentage: number | null;
  generation_prompt: string | null;
  image_category: string;
  ai_generated_from_photo_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useTargetImages = () => {
  const { user } = useAuth();
  const [targetImages, setTargetImages] = useState<TargetImage[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTargetImages = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('target_images')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTargetImages((data || []) as TargetImage[]);
    } catch (error) {
      console.error('Error loading target images:', error);
      toast.error('Fehler beim Laden der Zielbilder');
    } finally {
      setLoading(false);
    }
  };

  const uploadTargetImage = async (file: File, targetWeight?: number, targetBodyFat?: number, imageCategory: string = 'unspecified') => {
    if (!user) return;

    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('coach-media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('coach-media')
        .getPublicUrl(fileName);

      // Save to database
      const { data, error } = await supabase
        .from('target_images')
        .insert([{
          user_id: user.id,
          image_url: publicUrl,
          image_type: 'uploaded' as const,
          target_weight_kg: targetWeight,
          target_body_fat_percentage: targetBodyFat,
          image_category: imageCategory
        }])
        .select()
        .single();

      if (error) throw error;
      
      setTargetImages(prev => [data as TargetImage, ...prev]);
      toast.success('Zielbild hochgeladen');
      return data;
    } catch (error) {
      console.error('Error uploading target image:', error);
      toast.error('Fehler beim Hochladen des Zielbilds');
    }
  };

  const generateTargetImage = async (
    targetWeight?: number,
    targetBodyFat?: number,
    onProgress?: (stage: string, progress?: number) => void,
    progressPhotoUrl?: string,
    imageCategory?: string,
    progressPhotoId?: string
  ) => {
    if (!user) return;

    try {
      onProgress?.('connecting', 0);
      
      // Get user profile data for better AI generation
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      onProgress?.('context', 25);

      const requestData = {
        targetWeight: targetWeight || profileData?.target_weight || 70,
        targetBodyFat: targetBodyFat || profileData?.target_body_fat_percentage || 15,
        gender: profileData?.gender || 'unspecified',
        height: profileData?.height || 175,
        currentWeight: profileData?.weight || 80,
        fitnessGoal: profileData?.goal || 'fitness',
        progressPhotoUrl: progressPhotoUrl,
        imageCategory: imageCategory || 'unspecified',
        progressPhotoId: progressPhotoId
      };

      console.log('🚀 Calling generate-target-image with requestData:', {
        ...requestData,
        progressPhotoUrl: progressPhotoUrl?.substring(0, 50) + '...'
      });

      console.log('Calling generate-target-image with:', requestData);
      onProgress?.('streaming', 50);

      const { data: generationResult, error: generationError } = await supabase.functions
        .invoke('generate-target-image', {
          body: requestData
        });

      if (generationError) throw generationError;

      onProgress?.('complete', 100);

      // Return the generation result with multiple images for selection
      return {
        ...generationResult,
        requestData
      };
    } catch (error) {
      console.error('Error generating target image:', error);
      onProgress?.('error', 0);
      toast.error('Fehler beim Generieren des Zielbilds');
      throw error;
    }
  };

  const saveSelectedTargetImage = async (selectedImageUrl: string, imageData: any, imageCategory?: string) => {
    if (!user) return;

    try {
      console.log('Saving selected target image...', { selectedImageUrl, imageData });
      
      const { data, error } = await supabase.functions.invoke('save-target-image', {
        body: {
          selectedImageUrl,
          targetWeight: imageData.targetWeight,
          targetBodyFat: imageData.targetBodyFat,
          generationPrompt: imageData.prompt,
          hasProgressPhoto: imageData.hasProgressPhoto,
          currentWeight: imageData.currentWeight,
          currentBodyFat: imageData.currentBodyFat,
          imageCategory: imageCategory || imageData.selectedCategory || 'unspecified',
          progressPhotoUrl: imageData.progressPhotoUrl,
          progressPhotoId: imageData.selectedPhotoId
        }
      });

      if (error) throw error;

      console.log('Target image saved successfully:', data);
      
      // Create new target image object to add to state immediately
      const newTargetImage: TargetImage = {
        id: data.id,
        image_url: selectedImageUrl,
        image_type: 'ai_generated',
        target_weight_kg: imageData.targetWeight,
        target_body_fat_percentage: imageData.targetBodyFat,
        generation_prompt: imageData.prompt,
        image_category: imageCategory || imageData.selectedCategory || 'unspecified',
        ai_generated_from_photo_id: data.ai_generated_from_photo_id || imageData.selectedPhotoId || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Update state immediately for instant UI feedback
      setTargetImages(prev => [newTargetImage, ...prev]);
      
      console.log('Target images state updated, refreshing from database...');
      
      // Also refresh from database to ensure consistency
      setTimeout(() => loadTargetImages(), 500);
      
      toast.success('Zielbild gespeichert!');
      return data;
    } catch (error) {
      console.error('Error saving target image:', error);
      toast.error('Fehler beim Speichern des Zielbilds');
      throw error;
    }
  };

  const deleteTargetImage = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('target_images')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setTargetImages(prev => prev.filter(img => img.id !== id));
      toast.success('Zielbild entfernt');
    } catch (error) {
      console.error('Error deleting target image:', error);
      toast.error('Fehler beim Entfernen des Zielbilds');
    }
  };

  useEffect(() => {
    loadTargetImages();
  }, [user]);

  // Helper function to get linked photo pairs for Before/After comparison
  const getLinkedPhotoPairs = (progressPhotos: any[]) => {
    return targetImages
      .filter(target => target.ai_generated_from_photo_id)
      .map(target => {
        const originalPhoto = progressPhotos.find(photo => 
          photo.id === target.ai_generated_from_photo_id
        );
        return originalPhoto ? { originalPhoto, generatedImage: target } : null;
      })
      .filter(pair => pair !== null);
  };

  return {
    targetImages,
    loading,
    uploadTargetImage,
    generateTargetImage,
    saveSelectedTargetImage,
    deleteTargetImage,
    refreshTargetImages: loadTargetImages,
    getLinkedPhotoPairs
  };
};