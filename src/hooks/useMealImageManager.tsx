
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { uploadFilesWithProgress, UploadProgress } from '@/utils/uploadHelpers';
import { toast } from 'sonner';

export interface MealImageManagerProps {
  mealId: string;
  currentImages: string[];
  onImagesUpdate: (newImages: string[]) => void;
}

export const useMealImageManager = ({ mealId, currentImages, onImagesUpdate }: MealImageManagerProps) => {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const uploadImages = async (files: File[], userId: string) => {
    console.log('🔄 [useMealImageManager] Starting upload process', { 
      fileCount: files.length, 
      currentImages: currentImages.length, 
      mealId, 
      userId 
    });

    if (currentImages.length + files.length > 3) {
      const errorMsg = 'Maximal 3 Bilder pro Mahlzeit erlaubt';
      console.error('🔄 [useMealImageManager]', errorMsg);
      toast.error(errorMsg);
      return;
    }

    setIsUploading(true);
    setUploadProgress([]);

    try {
      console.log('🔄 [useMealImageManager] Calling uploadFilesWithProgress...');
      const result = await uploadFilesWithProgress(files, userId, setUploadProgress);
      console.log('🔄 [useMealImageManager] Upload result:', result);
      
      if (result.success && result.urls.length > 0) {
        const newImages = [...currentImages, ...result.urls];
        console.log('🔄 [useMealImageManager] Updating meal with new images:', newImages);
        
        // Update meal in database
        const { error } = await supabase
          .from('meals')
          .update({ images: newImages })
          .eq('id', mealId);

        if (error) {
          console.error('🔄 [useMealImageManager] Database update failed:', error);
          throw error;
        }

        console.log('🔄 [useMealImageManager] Database updated successfully');
        onImagesUpdate(newImages);
        toast.success(`${result.urls.length} Bild${result.urls.length > 1 ? 'er' : ''} hinzugefügt`);
      } else {
        console.warn('🔄 [useMealImageManager] Upload failed or no URLs returned');
      }

      if (result.errors.length > 0) {
        console.error('🔄 [useMealImageManager] Upload errors:', result.errors);
        toast.error(`Fehler beim Upload: ${result.errors[0]}`);
      }
    } catch (error: any) {
      console.error('🔄 [useMealImageManager] Error uploading meal images:', error);
      toast.error(`Fehler beim Upload der Bilder: ${error.message || 'Unbekannter Fehler'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress([]);
      console.log('🔄 [useMealImageManager] Upload process completed');
    }
  };

  const deleteImage = async (imageUrl: string) => {
    try {
      const newImages = currentImages.filter(url => url !== imageUrl);
      
      // Update meal in database
      const { error } = await supabase
        .from('meals')
        .update({ images: newImages })
        .eq('id', mealId);

      if (error) throw error;

      onImagesUpdate(newImages);
      toast.success('Bild entfernt');
    } catch (error: any) {
      console.error('Error deleting meal image:', error);
      toast.error('Fehler beim Löschen des Bildes');
    }
  };

  return {
    uploadImages,
    deleteImage,
    uploadProgress,
    isUploading
  };
};
