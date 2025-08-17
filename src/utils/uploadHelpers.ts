
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import heic2any from "heic2any";

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

// Detect if file is HEIC format
const isHEICFormat = (file: File): boolean => {
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();
  return fileName.endsWith('.heic') || fileName.endsWith('.heif') || 
         fileType.includes('heic') || fileType.includes('heif');
};

// Convert HEIC/HEIF files to WebP
const convertHEICToWebP = async (file: File): Promise<File> => {
  try {
    console.log(`🔄 [CONVERT] Converting HEIC file: ${file.name}`);
    const convertedBlob = await heic2any({
      blob: file,
      toType: "image/webp",
      quality: 0.8
    }) as Blob;
    
    const webpFile = new File([convertedBlob], file.name.replace(/\.(heic|heif)$/i, '.webp'), {
      type: 'image/webp',
      lastModified: Date.now()
    });
    
    console.log(`✅ [CONVERT] HEIC converted: ${file.name} → ${webpFile.name} (${(file.size / 1024).toFixed(1)}KB → ${(webpFile.size / 1024).toFixed(1)}KB)`);
    return webpFile;
  } catch (error) {
    console.error('❌ [CONVERT] HEIC conversion failed:', error);
    throw new Error(`HEIC-Konvertierung fehlgeschlagen: ${error.message}`);
  }
};

// Convert any image to WebP format for optimal compatibility and size
const convertToWebP = async (file: File, quality = 0.8): Promise<File> => {
  // If already WebP, return as-is
  if (file.type === 'image/webp') {
    console.log(`✅ [CONVERT] Already WebP: ${file.name}`);
    return file;
  }

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw image to canvas
      ctx?.drawImage(img, 0, 0);
      
      // Convert to WebP
      canvas.toBlob((blob) => {
        if (blob) {
          const webpFile = new File([blob], file.name.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp'), {
            type: 'image/webp',
            lastModified: Date.now()
          });
          console.log(`✅ [CONVERT] → WebP: ${file.name} → ${webpFile.name} (${(file.size / 1024).toFixed(1)}KB → ${(webpFile.size / 1024).toFixed(1)}KB)`);
          resolve(webpFile);
        } else {
          console.warn('⚠️ [CONVERT] WebP conversion failed, using original');
          resolve(file);
        }
      }, 'image/webp', quality);
    };
    
    img.onerror = () => {
      console.warn('⚠️ [CONVERT] Image load failed for WebP conversion');
      resolve(file);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Image compression utility (now works with WebP)
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
          // Always output as WebP for optimal compatibility and size
          const compressedFile = new File([blob], file.name.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '.webp'), {
            type: 'image/webp',
            lastModified: Date.now()
          });
          console.log(`✅ Image compressed: ${file.name} from ${(file.size / 1024).toFixed(1)}KB to ${(compressedFile.size / 1024).toFixed(1)}KB (WebP)`);
          resolve(compressedFile);
        } else {
          console.warn('⚠️ Compression failed, using original file');
          resolve(file);
        }
      }, 'image/webp', quality);
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
  // Check authentication first
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Bitte logge dich ein, um Dateien hochzuladen');
  }
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/') || isHEICFormat(file);
  
  if (!isImage && !isVideo) {
    throw new Error('Datei muss ein Bild oder Video sein (unterstützt: JPG, PNG, WebP, HEIC, MP4)');
  }

  // Validate file size (increased limits)
  const maxSize = isVideo ? 250 * 1024 * 1024 : 50 * 1024 * 1024; // 50MB for images
  if (file.size > maxSize) {
    const maxSizeText = isVideo ? '250MB' : '50MB';
    throw new Error(`Datei ist zu groß (max. ${maxSizeText})`);
  }

  // Process images: HEIC → WebP conversion and compression
  let processedFile = file;
  if (isImage) {
    onProgress(10);
    
    // Step 1: Convert HEIC files to WebP
    if (isHEICFormat(file)) {
      console.log(`🔄 [UPLOAD] Converting HEIC file: ${file.name}`);
      processedFile = await convertHEICToWebP(file);
      onProgress(15);
    }
    
    // Step 2: Convert all images to WebP for consistency and OpenAI compatibility
    if (processedFile.type !== 'image/webp') {
      console.log(`🔄 [UPLOAD] Converting to WebP: ${processedFile.name}`);
      processedFile = await convertToWebP(processedFile, 0.9);
      onProgress(20);
    }
    
    // Step 3: Compress if still large (WebP is already efficient)
    if (processedFile.size > 3 * 1024 * 1024) { // Compress WebP over 3MB
      console.log(`🗜️ [UPLOAD] Compressing large WebP: ${processedFile.name}`);
      const quality = processedFile.size > 10 * 1024 * 1024 ? 0.6 : 0.8;
      processedFile = await compressImage(processedFile, 1024, 1024, quality);
      onProgress(25);
    }
    
    console.log(`✅ [UPLOAD] Final image: ${processedFile.name} (${processedFile.type}, ${(processedFile.size / 1024).toFixed(1)}KB)`);
    // SAFEGUARD: ensure a proper File object with correct MIME type for images
    const beforeType = (processedFile as any)?.type;
    if (!isVideo && (!(processedFile instanceof File) || beforeType !== 'image/webp')) {
      const webpBlob = processedFile instanceof Blob ? processedFile : new Blob([processedFile], { type: 'image/webp' });
      const forcedName = processedFile.name?.replace(/\.[^.]+$/, '.webp') || `${Date.now()}.webp`;
      const webpFile = new File([webpBlob], forcedName, { type: 'image/webp', lastModified: Date.now() });
      console.log(`🛠️ [UPLOAD] Forcing File with correct MIME. beforeType=${beforeType} → image/webp (${webpFile.name})`);
      processedFile = webpFile as File;
    }
  }

  // Ensure WebP extension for processed images
  const fileExt = isVideo ? (processedFile.name.split('.').pop()?.toLowerCase() || 'mp4') : 'webp';
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const bucketName = isVideo ? 'coach-media' : 'meal-images';
  const contentType = isVideo ? 'video/mp4' : 'image/webp';
  console.log(`🗂️ [UPLOAD] Target -> bucket: ${bucketName}, path: ${fileName}, contentType param: ${contentType}, file.type: ${processedFile.type}`);

  // Use Supabase's upload with progress tracking simulation
  onProgress(30);
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(fileName, processedFile, {
      cacheControl: '3600',
      upsert: false,
      contentType
    });

  if (uploadError) {
    throw new Error(`Upload fehlgeschlagen: ${uploadError.message}`);
  }

  onProgress(90);

  onProgress(100);
  
  // Use public URL directly since meal-images bucket is public
  // This ensures the analyze-meal Edge Function can access images
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fileName);
  console.log('🔗 [UPLOAD] Public URL:', urlData.publicUrl);
  
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
