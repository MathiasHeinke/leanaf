import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { uploadFilesWithProgress, UploadProgress } from '@/utils/uploadHelpers';
import { toast } from 'sonner';

export interface LeftoverImageManagerProps {
  mealId: string;
  currentLeftoverImages: string[];
  onLeftoverImagesUpdate: (newImages: string[]) => void;
}

export const useLeftoverImageManager = ({ 
  mealId, 
  currentLeftoverImages, 
  onLeftoverImagesUpdate 
}: LeftoverImageManagerProps) => {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const uploadLeftoverImages = async (files: File[], userId: string) => {
    if (currentLeftoverImages.length + files.length > 2) {
      toast.error('Maximal 2 Reste-Bilder pro Mahlzeit erlaubt');
      return;
    }

    setIsUploading(true);
    setUploadProgress([]);

    try {
      const result = await uploadFilesWithProgress(files, userId, setUploadProgress);
      
      if (result.success && result.urls.length > 0) {
        const newLeftoverImages = [...currentLeftoverImages, ...result.urls];
        
        // DON'T update database here, just pass the new images to parent component
        onLeftoverImagesUpdate(newLeftoverImages);
        toast.success(`${result.urls.length} Reste-Bild${result.urls.length > 1 ? 'er' : ''} hinzugefügt`);
      }

      if (result.errors.length > 0) {
        toast.error(`Fehler beim Upload: ${result.errors[0]}`);
      }
    } catch (error: any) {
      console.error('Error uploading leftover images:', error);
      toast.error('Fehler beim Upload der Reste-Bilder');
    } finally {
      setIsUploading(false);
      setUploadProgress([]);
    }
  };

  const deleteLeftoverImage = async (imageUrl: string) => {
    try {
      const newLeftoverImages = currentLeftoverImages.filter(url => url !== imageUrl);
      
      // DON'T update database here either, just pass the new images to parent component
      onLeftoverImagesUpdate(newLeftoverImages);
      toast.success('Reste-Bild entfernt');
    } catch (error: any) {
      console.error('Error deleting leftover image:', error);
      toast.error('Fehler beim Löschen des Reste-Bildes');
    }
  };

  return {
    uploadLeftoverImages,
    deleteLeftoverImage,
    uploadProgress,
    isUploading
  };
};