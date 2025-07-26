import { toast } from 'sonner';

export interface CompressionProgress {
  progress: number;
  stage: 'analyzing' | 'compressing' | 'finalizing';
  estimatedTime?: number;
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export class VideoCompressor {
  private static readonly MAX_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly TARGET_SIZE = 50 * 1024 * 1024; // 50MB target
  private static readonly MIN_QUALITY = 0.3;
  private static readonly MAX_QUALITY = 0.8;
  private static readonly METADATA_TIMEOUT = 60000; // 60s timeout for metadata
  private static readonly COMPRESSION_TIMEOUT = 300000; // 5min timeout for compression

  static async compressVideo(
    file: File,
    onProgress?: (progress: CompressionProgress) => void
  ): Promise<CompressionResult> {
    console.log('Starting video compression for:', file.name, 'Size:', file.size);
    
    // If file is already small enough, return as-is
    if (file.size <= this.MAX_SIZE) {
      console.log('File already under size limit, skipping compression');
      return {
        file,
        originalSize: file.size,
        compressedSize: file.size,
        compressionRatio: 1
      };
    }

    onProgress?.({ progress: 10, stage: 'analyzing' });

    try {
      // For now, use a simple fallback approach until we can implement proper compression
      // This prevents the empty file issue while we work on a better solution
      
      onProgress?.({ progress: 50, stage: 'compressing' });
      
      // Check if browser supports proper compression
      if (!MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        console.log('VP9 not supported, returning original file');
        onProgress?.({ progress: 100, stage: 'finalizing' });
        return {
          file,
          originalSize: file.size,
          compressedSize: file.size,
          compressionRatio: 1
        };
      }

      // Create video element to get metadata
      const video = document.createElement('video');
      const videoUrl = URL.createObjectURL(file);
      video.src = videoUrl;
      
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
        setTimeout(() => reject(new Error('Metadata loading timeout')), this.METADATA_TIMEOUT);
      });

      const originalWidth = video.videoWidth;
      const originalHeight = video.videoHeight;
      const duration = video.duration;
      
      // Clean up immediately
      URL.revokeObjectURL(videoUrl);

      onProgress?.({ progress: 80, stage: 'finalizing' });

      // For large files, return original for now to prevent upload failures
      // TODO: Implement proper compression in a future update
      console.log('Returning original file to prevent compression issues');
      
      onProgress?.({ progress: 100, stage: 'finalizing' });
      
      return {
        file,
        originalSize: file.size,
        compressedSize: file.size,
        compressionRatio: 1
      };

    } catch (error) {
      console.error('Video compression failed:', error);
      toast.error('Video-Komprimierung fehlgeschlagen');
      
      onProgress?.({ progress: 100, stage: 'finalizing' });
      
      // Return original file if compression fails
      return {
        file,
        originalSize: file.size,
        compressedSize: file.size,
        compressionRatio: 1
      };
    }
  }

  private static calculateBitrate(width: number, height: number, duration: number): number {
    // Calculate bitrate to target ~25MB file size
    const targetBytes = this.TARGET_SIZE;
    const targetBitrate = (targetBytes * 8) / duration; // bits per second
    
    // Ensure minimum quality based on resolution
    const minBitrate = (width * height * 0.1); // 0.1 bits per pixel per second
    const maxBitrate = (width * height * 0.3); // 0.3 bits per pixel per second
    
    return Math.max(minBitrate, Math.min(maxBitrate, targetBitrate));
  }

  static formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  static async getVideoInfo(file: File): Promise<{
    duration: number;
    width: number;
    height: number;
    size: number;
  }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(url);
        reject(new Error('Video metadata loading timeout'));
      }, this.METADATA_TIMEOUT);
      
      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(url);
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          size: file.size
        });
      };
      
      video.onerror = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video metadata'));
      };
      
      video.src = url;
    });
  }
}