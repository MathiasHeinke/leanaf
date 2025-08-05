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
      const { data, error } = await supabase
        .from('progress_photos')
        .select('*')
        .eq('user_id', user.id)
        .order('taken_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
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

      // Save to database
      const { data: newPhoto, error: dbError } = await supabase
        .from('progress_photos')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          taken_at: new Date().toISOString(),
          weight_kg: weight,
          body_fat_percentage: bodyFat,
          notes
        })
        .select()
        .single();

      if (dbError) throw dbError;
      
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