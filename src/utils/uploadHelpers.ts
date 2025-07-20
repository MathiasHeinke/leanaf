
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface UploadResult {
  success: boolean;
  urls: string[];
  errors: string[];
  progress: UploadProgress[];
}

// Image compression utility
export const compressImage = async (file: File, maxWidth = 1024, maxHeight = 1024, quality = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          console.log(`✅ Image compressed: ${file.name} from ${(file.size / 1024).toFixed(1)}KB to ${(compressedFile.size / 1024).toFixed(1)}KB`);
          resolve(compressedFile);
        } else {
          resolve(file);
        }
      }, 'image/jpeg', quality);
    };
    
    img.onerror = () => {
      console.warn('Image compression failed, using original file');
      resolve(file);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Enhanced upload function with progress tracking
export const uploadFilesWithProgress = async (
  files: File[],
  userId: string,
  onProgress?: (progress: UploadProgress[]) => void
): Promise<UploadResult> => {
  console.log(`🚀 Starting upload for ${files.length} files, user: ${userId}`);
  
  if (!userId) {
    console.error('❌ No user ID provided');
    throw new Error('Benutzer nicht authentifiziert');
  }

  const uploadProgress: UploadProgress[] = files.map(file => ({
    fileName: file.name,
    progress: 0,
    status: 'pending'
  }));

  // Isolated progress update function
  const updateProgress = (index: number, updates: Partial<UploadProgress>) => {
    uploadProgress[index] = { ...uploadProgress[index], ...updates };
    if (onProgress) {
      // Create a deep copy to prevent reference issues
      onProgress(JSON.parse(JSON.stringify(uploadProgress)));
    }
  };

  const uploadedUrls: string[] = [];
  const errors: string[] = [];

  // Check auth state before upload
  console.log('🔐 Checking authentication state...');
  const { data: authUser, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser.user) {
    console.error('❌ Authentication check failed:', authError);
    throw new Error('Authentifizierung fehlgeschlagen');
  }
  console.log('✅ Authentication verified');

  // Process files sequentially to avoid overwhelming the system
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      console.log(`📁 Processing file ${i + 1}/${files.length}: ${file.name}`);
      updateProgress(i, { status: 'uploading', progress: 10 });

      // Validate file
      if (file.size > 10 * 1024 * 1024) {
        throw new Error(`Datei ist zu groß (max. 10MB)`);
      }

      if (!file.type.startsWith('image/')) {
        throw new Error(`Datei ist kein Bild`);
      }

      updateProgress(i, { progress: 20 });

      // Compress image if needed
      let processedFile = file;
      if (file.size > 1024 * 1024) { // If larger than 1MB
        console.log(`🗜️ Compressing ${file.name}...`);
        processedFile = await compressImage(file);
        updateProgress(i, { progress: 40 });
      }

      const fileExt = processedFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      console.log(`⬆️ Uploading to: ${fileName}`);
      updateProgress(i, { progress: 60 });

      // Upload with proper error handling
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('meal-images')
        .upload(fileName, processedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error(`❌ Upload failed for ${file.name}:`, uploadError);
        throw new Error(`Upload fehlgeschlagen: ${uploadError.message}`);
      }

      updateProgress(i, { progress: 80 });

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('meal-images')
        .getPublicUrl(fileName);

      console.log(`✅ Upload successful: ${file.name} -> ${urlData.publicUrl}`);
      uploadedUrls.push(urlData.publicUrl);
      updateProgress(i, { progress: 100, status: 'completed' });

    } catch (error: any) {
      console.error(`❌ Error uploading ${file.name}:`, error);
      const errorMessage = error.message || 'Unbekannter Fehler beim Upload';
      errors.push(`${file.name}: ${errorMessage}`);
      updateProgress(i, { 
        status: 'error', 
        error: errorMessage,
        progress: 0 
      });
    }
  }

  const result: UploadResult = {
    success: uploadedUrls.length > 0,
    urls: uploadedUrls,
    errors,
    progress: uploadProgress
  };

  console.log(`🏁 Upload complete: ${uploadedUrls.length} success, ${errors.length} errors`);
  return result;
};
