import { useState } from 'react';
import { useTargetImages } from './useTargetImages';
import { toast } from 'sonner';

interface ImageCroppingState {
  isOpen: boolean;
  image: File | string | null;
  imageType: 'progress' | 'ai';
  imageId?: string;
  originalPrompt?: string;
  imageCategory?: string;
  targetWeight?: number;
  targetBodyFat?: number;
}

export const useImageCropping = () => {
  const [croppingState, setCroppingState] = useState<ImageCroppingState>({
    isOpen: false,
    image: null,
    imageType: 'progress'
  });

  const { generateTargetImage, updateTargetImageUrl, refreshTargetImages } = useTargetImages();

  const openCropModal = (
    image: File | string,
    imageType: 'progress' | 'ai',
    options?: {
      imageId?: string;
      originalPrompt?: string;
      imageCategory?: string;
      targetWeight?: number;
      targetBodyFat?: number;
    }
  ) => {
    setCroppingState({
      isOpen: true,
      image,
      imageType,
      imageId: options?.imageId,
      originalPrompt: options?.originalPrompt,
      imageCategory: options?.imageCategory,
      targetWeight: options?.targetWeight,
      targetBodyFat: options?.targetBodyFat
    });
  };

  const closeCropModal = () => {
    setCroppingState({
      isOpen: false,
      image: null,
      imageType: 'progress'
    });
  };

  const handleCropComplete = async (croppedFile: File, onComplete?: (file: File) => void) => {
    try {
      if (onComplete) {
        onComplete(croppedFile);
      }
      
      closeCropModal();
      toast.success('Bild erfolgreich zugeschnitten');
    } catch (error) {
      console.error('Error handling crop completion:', error);
      toast.error('Fehler beim Verarbeiten des zugeschnittenen Bildes');
    }
  };

  const handleRegenerateAI = async (enhancedPrompt: string) => {
    if (!croppingState.imageCategory) {
      toast.error('Bildkategorie fehlt für KI-Regeneration');
      return;
    }

    try {
      await generateTargetImage(
        croppingState.targetWeight,
        croppingState.targetBodyFat,
        undefined, // onProgress
        undefined, // progressPhotoUrl
        croppingState.imageCategory
      );
      
      // Refresh target images to show the newly generated one
      setTimeout(() => refreshTargetImages(), 1000);
      
      closeCropModal();
      toast.success('KI-Bild wird neu generiert...');
    } catch (error) {
      console.error('Error regenerating AI image:', error);
      toast.error('Fehler beim Neu-Generieren des KI-Bildes');
    }
  };

  return {
    croppingState,
    openCropModal,
    closeCropModal,
    handleCropComplete,
    handleRegenerateAI
  };
};