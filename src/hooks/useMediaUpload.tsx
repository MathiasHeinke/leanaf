import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { uploadFilesWithProgress, UploadProgress } from '@/utils/uploadHelpers';

export const useMediaUpload = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);

  const uploadFiles = async (files: File[]): Promise<string[]> => {
    if (!user?.id) {
      toast.error('Bitte melden Sie sich an, um Dateien hochzuladen');
      throw new Error('User nicht angemeldet');
    }

    setUploading(true);
    setUploadProgress([]);

    try {
      const result = await uploadFilesWithProgress(files, user.id, (progress) => {
        setUploadProgress(progress);
      });

      if (result.errors && result.errors.length > 0) {
        result.errors.forEach(error => {
          toast.error(error);
        });
      }

      if (result.success) {
        const successCount = result.urls.length;
        const totalCount = files.length;
        if (successCount === totalCount) {
          toast.success(`🎉 Alle ${successCount} Dateien erfolgreich hochgeladen!`);
        } else {
          toast.success(`${successCount} von ${totalCount} Dateien hochgeladen`);
        }
      }

      return result.urls;
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error(error.message || 'Upload fehlgeschlagen');
      throw error;
    } finally {
      setUploading(false);
      // Clear progress after delay to show final state
      setTimeout(() => setUploadProgress([]), 3000);
    }
  };

  const getMediaType = (url: string): 'image' | 'video' | 'unknown' => {
    const extension = url.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return 'image';
    }
    
    if (['mp4', 'mov', 'avi', 'webm'].includes(extension || '')) {
      return 'video';
    }
    
    return 'unknown';
  };

  return {
    uploadFiles,
    uploading,
    uploadProgress,
    getMediaType
  };
};