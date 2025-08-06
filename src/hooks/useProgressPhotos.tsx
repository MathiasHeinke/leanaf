import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { uploadFilesWithProgress } from '@/utils/uploadHelpers';
import { getCurrentDateString } from '@/utils/dateHelpers';

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
        .not('photo_urls', 'is', null)
        .order('date', { ascending: false });

      if (error) throw error;
      
      // Process and transform entries with photos
      const entriesWithPhotos = (data || []).filter(entry => {
        let photoUrls = entry.photo_urls;
        
        // Handle different photo_urls formats
        if (typeof photoUrls === 'string') {
          try {
            photoUrls = JSON.parse(photoUrls);
          } catch (e) {
            return false;
          }
        }
        
        // Support both array and object formats
        if (Array.isArray(photoUrls)) {
          return photoUrls.length > 0 && photoUrls.some(url => url && typeof url === 'string' && url.trim() !== '');
        }
        
        if (photoUrls && typeof photoUrls === 'object') {
          const urls = Object.values(photoUrls);
          return urls.length > 0 && urls.some(url => url && typeof url === 'string' && url.trim() !== '');
        }
        
        return false;
      }).map(entry => {
        // Transform array format to object format for compatibility
        let photoUrls = entry.photo_urls;
        if (typeof photoUrls === 'string') {
          try {
            photoUrls = JSON.parse(photoUrls);
          } catch (e) {
            photoUrls = [];
          }
        }
        
        // Convert array to object format with smart categorization
        if (Array.isArray(photoUrls)) {
          const transformedUrls: any = {};
          photoUrls.forEach((url, index) => {
            if (url && typeof url === 'string' && url.trim() !== '') {
              // Smart categorization: first = front, second = side, third = back, rest = additional fronts
              if (index === 0) transformedUrls.front = url;
              else if (index === 1) transformedUrls.side = url;
              else if (index === 2) transformedUrls.back = url;
              else transformedUrls[`front_${index}`] = url; // Additional front views
            }
          });
          
          console.log(`Entry ${entry.date}: Array with ${photoUrls.length} URLs transformed to:`, transformedUrls);
          
          return {
            ...entry,
            photo_urls: transformedUrls
          };
        }
        
        console.log(`Entry ${entry.date}: Already object format:`, photoUrls);
        return entry;
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

      const today = getCurrentDateString();
      
      // Check if weight entry exists for today
      const { data: existingEntry, error: checkError } = await supabase
        .from('weight_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (checkError) throw checkError;

      let updatedEntry;
      let weightHistoryId: string;
      
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
        weightHistoryId = existingEntry.id;
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
        weightHistoryId = data.id;
      }

      // Analyze each uploaded photo with OpenAI Vision
      const photoAnalyses: Record<string, any> = {};
      
      for (let i = 0; i < uploadResult.urls.length; i++) {
        const imageUrl = uploadResult.urls[i];
        const photoKey = `photo_${i + 1}`;
        
        try {
          const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-body-pose', {
            body: {
              imageUrl,
              weightHistoryId
            }
          });

          if (analysisError) {
            console.error('Analysis error for photo', i + 1, ':', analysisError);
            photoAnalyses[photoKey] = {
              view: 'unknown',
              confidence: 0,
              muscle_definition: 5,
              lighting_quality: 5,
              pose_quality: 5,
              notes: 'Analysis failed',
              error: analysisError.message
            };
          } else {
            photoAnalyses[photoKey] = analysisData.analysis;
          }
        } catch (error) {
          console.error('Error analyzing photo', i + 1, ':', error);
          photoAnalyses[photoKey] = {
            view: 'unknown',
            confidence: 0,
            muscle_definition: 5,
            lighting_quality: 5,
            pose_quality: 5,
            notes: 'Analysis failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }

      // Update weight_history with photo metadata
      const { error: metadataError } = await supabase
        .from('weight_history')
        .update({ photo_metadata: photoAnalyses })
        .eq('id', weightHistoryId);

      if (metadataError) {
        console.error('Error updating photo metadata:', metadataError);
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