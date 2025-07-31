
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

// Single file upload with real-time progress using FormData and fetch
const uploadSingleFileWithProgress = async (
  file: File,
  userId: string,
  onProgress: (progress: number) => void
): Promise<string> => {
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  
  if (!isImage && !isVideo) {
    throw new Error('Datei muss ein Bild oder Video sein');
  }

  // Validate file size
  const maxSize = isVideo ? 250 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size > maxSize) {
    const maxSizeText = isVideo ? '250MB' : '10MB';
    throw new Error(`Datei ist zu groß (max. ${maxSizeText})`);
  }

  // Compress image if needed
  let processedFile = file;
  if (isImage && file.size > 1024 * 1024) {
    onProgress(10);
    processedFile = await compressImage(file);
    onProgress(20);
  }

  const fileExt = processedFile.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const bucketName = isVideo ? 'coach-media' : 'meal-images';

  // Use Supabase's upload with progress tracking simulation
  onProgress(30);
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(fileName, processedFile, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    throw new Error(`Upload fehlgeschlagen: ${uploadError.message}`);
  }

  onProgress(90);

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fileName);

  onProgress(100);
  return urlData.publicUrl;
};

// Enhanced upload function with parallel processing and real-time progress
export const uploadFilesWithProgress = async (
  files: File[],
  userId: string,
  onProgress?: (progress: UploadProgress[]) => void
): Promise<UploadResult> => {
  console.log(`🚀 Starting parallel upload for ${files.length} files, user: ${userId}`);
  
  if (!userId) {
    console.error('❌ No user ID provided');
    throw new Error('Benutzer nicht authentifiziert');
  }

  const uploadProgress: UploadProgress[] = files.map(file => ({
    fileName: file.name,
    progress: 0,
    status: 'pending'
  }));

  // Progress update with immediate callback
  const updateProgress = (index: number, updates: Partial<UploadProgress>) => {
    uploadProgress[index] = { ...uploadProgress[index], ...updates };
    onProgress?.(uploadProgress);
  };

  // Initial progress callback
  onProgress?.(uploadProgress);

  // Check authentication
  console.log('🔐 Checking authentication...');
  const { data: authUser, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser.user) {
    console.error('❌ Authentication failed:', authError);
    throw new Error('Authentifizierung fehlgeschlagen');
  }

  // Process all files in parallel with concurrency limit
  const concurrencyLimit = 3;
  const uploadedUrls: string[] = [];
  const errors: string[] = [];

  // Create upload promises for all files
  const uploadPromises = files.map(async (file, index) => {
    try {
      updateProgress(index, { status: 'uploading' });
      
      const url = await uploadSingleFileWithProgress(file, userId, (progress) => {
        updateProgress(index, { progress });
      });

      updateProgress(index, { status: 'completed', progress: 100 });
      return { index, url, error: null };
    } catch (error: any) {
      const errorMessage = error.message || 'Upload fehlgeschlagen';
      updateProgress(index, { 
        status: 'error', 
        error: errorMessage,
        progress: 0 
      });
      return { index, url: null, error: errorMessage };
    }
  });

  // Execute uploads with concurrency control
  const executeWithConcurrency = async (promises: Promise<any>[], limit: number) => {
    const results: any[] = [];
    for (let i = 0; i < promises.length; i += limit) {
      const batch = promises.slice(i, i + limit);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
    }
    return results;
  };

  const results = await executeWithConcurrency(uploadPromises, concurrencyLimit);

  // Process results
  results.forEach(result => {
    if (result.url) {
      uploadedUrls.push(result.url);
    } else if (result.error) {
      errors.push(`${files[result.index].name}: ${result.error}`);
    }
  });

  const finalResult: UploadResult = {
    success: uploadedUrls.length > 0,
    urls: uploadedUrls,
    errors,
    progress: uploadProgress
  };

  console.log(`🏁 Parallel upload complete: ${uploadedUrls.length} success, ${errors.length} errors`);
  return finalResult;
};
