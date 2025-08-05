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

  const uploadTargetImage = async (file: File, targetWeight?: number, targetBodyFat?: number) => {
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
          target_body_fat_percentage: targetBodyFat
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
    targetBodyFat?: number
  ) => {
    if (!user) return;

    try {
      // Get user profile data for better AI generation
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const requestData = {
        targetWeight: targetWeight || profileData?.target_weight || 70,
        targetBodyFat: targetBodyFat || profileData?.target_body_fat_percentage || 15,
        gender: profileData?.gender || 'unspecified',
        height: profileData?.height || 175,
        currentWeight: profileData?.weight || 80,
        fitnessGoal: profileData?.goal || 'fitness'
      };

      console.log('Calling generate-target-image with:', requestData);

      const { data: generationResult, error: generationError } = await supabase.functions
        .invoke('generate-target-image', {
          body: requestData
        });

      if (generationError) throw generationError;

      // Save to database
      const { data, error } = await supabase
        .from('target_images')
        .insert([{
          user_id: user.id,
          image_url: generationResult.imageUrl,
          image_type: 'ai_generated' as const,
          target_weight_kg: requestData.targetWeight,
          target_body_fat_percentage: requestData.targetBodyFat,
          generation_prompt: generationResult.prompt
        }])
        .select()
        .single();

      if (error) throw error;
      
      setTargetImages(prev => [data as TargetImage, ...prev]);
      toast.success('AI-Zielbild generiert!');
      return data;
    } catch (error) {
      console.error('Error generating target image:', error);
      toast.error('Fehler beim Generieren des Zielbilds');
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

  return {
    targetImages,
    loading,
    uploadTargetImage,
    generateTargetImage,
    deleteTargetImage,
    refreshTargetImages: loadTargetImages
  };
};