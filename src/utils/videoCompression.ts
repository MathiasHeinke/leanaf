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
  private static readonly MAX_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly TARGET_SIZE = 25 * 1024 * 1024; // 25MB target
  private static readonly MIN_QUALITY = 0.3;
  private static readonly MAX_QUALITY = 0.8;

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
      // Create video element to analyze
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      // Load video
      const videoUrl = URL.createObjectURL(file);
      video.src = videoUrl;
      
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
      });

      onProgress?.({ progress: 30, stage: 'compressing' });

      // Calculate compression parameters
      const originalWidth = video.videoWidth;
      const originalHeight = video.videoHeight;
      const duration = video.duration;
      
      // Determine target resolution (max 1080p for efficiency)
      let targetWidth = originalWidth;
      let targetHeight = originalHeight;
      
      if (originalWidth > 1920) {
        targetWidth = 1920;
        targetHeight = Math.round((originalHeight * 1920) / originalWidth);
      } else if (originalWidth > 1280 && file.size > this.TARGET_SIZE * 2) {
        targetWidth = 1280;
        targetHeight = Math.round((originalHeight * 1280) / originalWidth);
      }

      // Calculate quality based on file size
      const sizeRatio = file.size / this.TARGET_SIZE;
      let quality = Math.max(
        this.MIN_QUALITY,
        Math.min(this.MAX_QUALITY, 0.7 / Math.sqrt(sizeRatio))
      );

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Setup MediaRecorder for compression
      const stream = canvas.captureStream(30); // 30 FPS
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: this.calculateBitrate(targetWidth, targetHeight, duration)
      });

      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      // Start recording
      mediaRecorder.start();
      video.currentTime = 0;
      
      let frameCount = 0;
      const totalFrames = Math.ceil(duration * 30); // Assuming 30 FPS

      const processFrame = async () => {
        if (video.currentTime >= duration) {
          mediaRecorder.stop();
          return;
        }

        // Draw current frame
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        
        frameCount++;
        const progress = 30 + (frameCount / totalFrames) * 60;
        onProgress?.({ 
          progress: Math.min(90, progress), 
          stage: 'compressing',
          estimatedTime: Math.round((totalFrames - frameCount) / 30)
        });

        // Advance to next frame
        video.currentTime += 1/30;
        
        // Use requestAnimationFrame for smooth processing
        requestAnimationFrame(processFrame);
      };

      video.onseeked = processFrame;

      // Wait for recording to complete
      const compressedBlob = await new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => {
          resolve(new Blob(chunks, { type: 'video/webm' }));
        };
      });

      onProgress?.({ progress: 95, stage: 'finalizing' });

      // Clean up
      URL.revokeObjectURL(videoUrl);

      // Create compressed file
      const compressedFile = new File(
        [compressedBlob], 
        file.name.replace(/\.[^/.]+$/, '_compressed.webm'),
        { type: 'video/webm' }
      );

      const result: CompressionResult = {
        file: compressedFile,
        originalSize: file.size,
        compressedSize: compressedFile.size,
        compressionRatio: file.size / compressedFile.size
      };

      onProgress?.({ progress: 100, stage: 'finalizing' });

      console.log('Compression complete:', {
        original: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        compressed: `${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
        ratio: `${result.compressionRatio.toFixed(2)}x`
      });

      return result;

    } catch (error) {
      console.error('Video compression failed:', error);
      toast.error('Video-Komprimierung fehlgeschlagen');
      
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
      
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          size: file.size
        });
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video metadata'));
      };
      
      video.src = url;
    });
  }
}