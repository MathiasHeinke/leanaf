import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { uploadFilesWithProgress } from '@/utils/uploadHelpers';

interface WeightEntry {
  id: string;
  user_id: string;
  weight: number;
  date: string;
  body_fat_percentage?: number;
  muscle_percentage?: number;
  photo_urls?: any; // Changed to any to handle Json type from Supabase
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const useProgressPhotos = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProgressPhotos = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('weight_history')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      
      console.log('Raw data from Supabase:', data);
      console.log('Total entries found:', data?.length || 0);
      
      // Filter only entries that have actual photos
      const entriesWithPhotos = (data || []).filter(entry => {
        console.log('Processing entry:', entry.id, 'photo_urls:', entry.photo_urls, 'type:', typeof entry.photo_urls);
        
        let photoUrls = entry.photo_urls;
        
        // Handle different photo_urls formats
        if (typeof photoUrls === 'string') {
          try {
            photoUrls = JSON.parse(photoUrls);
            console.log('Parsed photo_urls:', photoUrls);
          } catch (e) {
            console.log('Failed to parse photo_urls string:', e);
            return false;
          }
        }
        
        // Check if photoUrls is valid and has content
        const hasPhotos = photoUrls && Array.isArray(photoUrls) && photoUrls.length > 0 && photoUrls.some(url => url && typeof url === 'string' && url.trim() !== '');
        console.log('Entry has photos:', hasPhotos, 'photoUrls:', photoUrls);
        
        return hasPhotos;
      });
      
      console.log('Filtered entries with photos:', entriesWithPhotos.length);
      setPhotos(entriesWithPhotos as WeightEntry[]);
    } catch (error) {
      console.error('Error loading progress photos:', error);
      toast.error('Fehler beim Laden der Fortschrittsfotos');
    } finally {
      setLoading(false);
    }
  };

  const uploadProgressPhoto = async (files: File[], weight?: number, bodyFat?: number, muscleMass?: number, notes?: string) => {
    if (!user || files.length === 0) return;

    try {
      // Upload files using the same system as QuickWeightInput
      const uploadResult = await uploadFilesWithProgress(files, user.id);
      
      if (!uploadResult.success) {
        toast.error('Fehler beim Hochladen der Bilder');
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      
      // Check if weight entry exists for today
      const { data: existingEntry, error: checkError } = await supabase
        .from('weight_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (checkError) throw checkError;

      let updatedEntry;
      
      if (existingEntry) {
        // Update existing entry with new photos
        let existingPhotos: string[] = [];
        if (existingEntry.photo_urls) {
          if (typeof existingEntry.photo_urls === 'string') {
            try {
              existingPhotos = JSON.parse(existingEntry.photo_urls);
            } catch (e) {
              existingPhotos = [];
            }
          } else if (Array.isArray(existingEntry.photo_urls)) {
            existingPhotos = existingEntry.photo_urls.filter((url): url is string => typeof url === 'string');
          }
        }
        const allPhotos = [...existingPhotos, ...uploadResult.urls];
        
        const { data, error: updateError } = await supabase
          .from('weight_history')
          .update({
            photo_urls: allPhotos,
            weight: weight || existingEntry.weight,
            body_fat_percentage: bodyFat || existingEntry.body_fat_percentage,
            muscle_percentage: muscleMass || existingEntry.muscle_percentage,
            notes: notes || existingEntry.notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingEntry.id)
          .select()
          .single();

        if (updateError) throw updateError;
        updatedEntry = data;
      } else {
        // Create new entry
        const { data, error: insertError } = await supabase
          .from('weight_history')
          .insert({
            user_id: user.id,
            date: today,
            weight: weight || 0, // Default weight if not provided
            body_fat_percentage: bodyFat,
            muscle_percentage: muscleMass,
            photo_urls: uploadResult.urls,
            notes
          })
          .select()
          .single();

        if (insertError) throw insertError;
        updatedEntry = data;
      }
      
      // Refresh photos list
      await loadProgressPhotos();
      toast.success('Fortschrittsfotos hochgeladen');
      return updatedEntry;
    } catch (error) {
      console.error('Error uploading progress photo:', error);
      toast.error('Fehler beim Hochladen der Fortschrittsfotos');
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