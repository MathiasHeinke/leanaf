import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ProgressPhoto {
  id: string;
  user_id: string;
  image_url: string;
  taken_at: string;
  weight_kg?: number;
  body_fat_percentage?: number;
  notes?: string;
  created_at: string;
}

export const useProgressPhotos = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProgressPhotos = async () => {
    if (!user) return;

    try {
      // For now, we'll get from existing profiles or body data
      // This is a simplified implementation - in real app we'd have a dedicated progress_photos table
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Placeholder data - in real implementation would come from actual progress photos table
      const mockPhotos: ProgressPhoto[] = [];
      
      setPhotos(mockPhotos);
    } catch (error) {
      console.error('Error loading progress photos:', error);
      toast.error('Fehler beim Laden der Fortschrittsfotos');
    } finally {
      setLoading(false);
    }
  };

  const uploadProgressPhoto = async (file: File, weight?: number, bodyFat?: number, notes?: string) => {
    if (!user) return;

    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `progress/${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('coach-media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('coach-media')
        .getPublicUrl(fileName);

      // For now, we'll just store the URL in memory
      // In real implementation, we'd save to a progress_photos table
      const newPhoto: ProgressPhoto = {
        id: Date.now().toString(),
        user_id: user.id,
        image_url: publicUrl,
        taken_at: new Date().toISOString(),
        weight_kg: weight,
        body_fat_percentage: bodyFat,
        notes,
        created_at: new Date().toISOString()
      };
      
      setPhotos(prev => [newPhoto, ...prev]);
      toast.success('Fortschrittsfoto hochgeladen');
      return newPhoto;
    } catch (error) {
      console.error('Error uploading progress photo:', error);
      toast.error('Fehler beim Hochladen des Fortschrittsfotos');
    }
  };

  useEffect(() => {
    loadProgressPhotos();
  }, [user]);

  return {
    photos,
    loading,
    uploadProgressPhoto,
    refreshPhotos: loadProgressPhotos
  };
};