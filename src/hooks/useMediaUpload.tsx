import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface UploadProgress {
  progress: number;
  fileName: string;
}

export const useMediaUpload = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);

  const uploadFiles = async (files: File[]): Promise<string[]> => {
    if (!user?.id) {
      throw new Error('User nicht angemeldet');
    }

    setUploading(true);
    setUploadProgress([]);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        
        if (!isImage && !isVideo) {
          toast.error(`${file.name} ist kein unterstütztes Medienformat`);
          continue;
        }

        // Validate file size (max 250MB for videos, 10MB for images)
        const maxSize = isVideo ? 250 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSize) {
          toast.error(`${file.name} ist zu groß. Max: ${isVideo ? '250MB' : '10MB'}`);
          continue;
        }

        // Update progress
        setUploadProgress(prev => [
          ...prev.filter(p => p.fileName !== file.name),
          { fileName: file.name, progress: 0 }
        ]);

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        try {
          // Upload to Supabase Storage
          const { data, error } = await supabase.storage
            .from('coach-media')
            .upload(fileName, file);

          if (error) {
            console.error('Upload error:', error);
            throw error;
          }

          // Update progress to 50% after upload
          setUploadProgress(prev => 
            prev.map(p => 
              p.fileName === file.name 
                ? { ...p, progress: 50 }
                : p
            )
          );

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('coach-media')
            .getPublicUrl(fileName);

          if (urlData?.publicUrl) {
            uploadedUrls.push(urlData.publicUrl);
            
            // Update progress to 100%
            setUploadProgress(prev => 
              prev.map(p => 
                p.fileName === file.name 
                  ? { ...p, progress: 100 }
                  : p
              )
            );
            
            toast.success(`${file.name} erfolgreich hochgeladen`);
          }
        } catch (uploadError) {
          console.error(`Error uploading ${file.name}:`, uploadError);
          toast.error(`Fehler beim Hochladen von ${file.name}`);
        }
      }

      return uploadedUrls;
    } finally {
      setUploading(false);
      // Clear progress after a delay
      setTimeout(() => setUploadProgress([]), 2000);
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