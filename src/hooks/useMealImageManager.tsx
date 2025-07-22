
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
    if (currentImages.length + files.length > 3) {
      toast.error('Maximal 3 Bilder pro Mahlzeit erlaubt');
      return;
    }

    setIsUploading(true);
    setUploadProgress([]);

    try {
      const result = await uploadFilesWithProgress(files, userId, setUploadProgress);
      
      if (result.success && result.urls.length > 0) {
        const newImages = [...currentImages, ...result.urls];
        
        // Update meal in database
        const { error } = await supabase
          .from('meals')
          .update({ images: newImages })
          .eq('id', mealId);

        if (error) throw error;

        onImagesUpdate(newImages);
        toast.success(`${result.urls.length} Bild${result.urls.length > 1 ? 'er' : ''} hinzugefügt`);
      }

      if (result.errors.length > 0) {
        toast.error(`Fehler beim Upload: ${result.errors[0]}`);
      }
    } catch (error: any) {
      console.error('Error uploading meal images:', error);
      toast.error('Fehler beim Upload der Bilder');
    } finally {
      setIsUploading(false);
      setUploadProgress([]);
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
