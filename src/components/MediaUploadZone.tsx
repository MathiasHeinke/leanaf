import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Image, Video, X, FileImage } from 'lucide-react';
import { useMediaUpload } from '@/hooks/useMediaUpload';

interface MediaUploadZoneProps {
  onMediaUploaded: (urls: string[]) => void;
  maxFiles?: number;
  accept?: string[];
  className?: string;
}

export const MediaUploadZone: React.FC<MediaUploadZoneProps> = ({
  onMediaUploaded,
  maxFiles = 5,
  accept = ['image/*', 'video/*'],
  className = ''
}) => {
  const { 
    uploadFiles, 
    uploading, 
    uploadProgress, 
    getMediaType 
  } = useMediaUpload();
  const [uploadedMedia, setUploadedMedia] = useState<Array<{url: string, type: 'image' | 'video', isPreview?: boolean}>>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    // Instant preview of files before upload
    const instantPreviews = acceptedFiles.map(file => ({
      url: URL.createObjectURL(file),
      type: file.type.startsWith('image/') ? 'image' as const : 'video' as const,
      isPreview: true
    }));
    
    setUploadedMedia(prev => [...prev, ...instantPreviews]);

    try {
      const urls = await uploadFiles(acceptedFiles);
      
      // Replace previews with real URLs
      setUploadedMedia(prev => {
        const newMedia = [...prev];
        // Remove preview items
        const filtered = newMedia.filter(item => !item.isPreview);
        // Add real uploaded items
        const realItems = urls.map(url => ({
          url,
          type: getMediaType(url) as 'image' | 'video'
        }));
        return [...filtered, ...realItems];
      });
      
      onMediaUploaded(urls);
      
      // Cleanup preview URLs
      instantPreviews.forEach(preview => {
        if (preview.url.startsWith('blob:')) {
          URL.revokeObjectURL(preview.url);
        }
      });
    } catch (error) {
      console.error('Upload failed:', error);
      // Remove failed previews
      setUploadedMedia(prev => prev.filter(item => !item.isPreview));
    }
  }, [uploadFiles, onMediaUploaded, getMediaType]);

  const removeMedia = (indexToRemove: number) => {
    setUploadedMedia(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const clearAll = () => {
    setUploadedMedia([]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi', '.webm']
    },
    maxFiles,
    maxSize: 250 * 1024 * 1024, // 250MB max file size
    disabled: uploading
  });

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* Upload Zone */}
      <Card
        {...getRootProps()}
        className={`
          relative border-2 border-dashed transition-all duration-200 cursor-pointer
          ${isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-primary/50'
          }
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <div className="mb-4">
            {isDragActive ? (
              <Upload className="h-12 w-12 text-primary animate-pulse" />
            ) : (
              <div className="flex space-x-2">
                <Image className="h-10 w-10 text-muted-foreground" />
                <Video className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <p className="text-lg font-medium">
              {isDragActive
                ? 'Dateien hier ablegen...'
                : 'Bilder oder Videos hochladen'
              }
            </p>
            <p className="text-sm text-muted-foreground">
              Drag & Drop oder klicken zum Auswählen
            </p>
            <p className="text-xs text-muted-foreground">
              Max {maxFiles} Dateien • Bilder bis 10MB • Videos bis 250MB
            </p>
          </div>
        </div>
      </Card>

      {/* Upload Progress with Enhanced UI */}
      {(uploading || uploadProgress.length > 0) && (
        <Card className="p-4 bg-muted/30 border-dashed">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-primary">
                🚀 Upload läuft... ({uploadProgress.filter(p => p.status === 'completed').length}/{uploadProgress.length})
              </h4>
              <div className="text-xs text-muted-foreground">
                Parallel-Upload aktiv
              </div>
            </div>
            
            <div className="grid gap-2 max-h-40 overflow-y-auto">
              {uploadProgress.map((progress, index) => (
                <div key={index} className="bg-background rounded-lg p-2 border">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="truncate max-w-[150px] font-medium">{progress.fileName}</span>
                    <div className="flex items-center gap-2">
                      {progress.status === 'uploading' && (
                        <span className="text-primary font-mono">{Math.round(progress.progress)}%</span>
                      )}
                      {progress.status === 'completed' && (
                        <span className="text-green-500 font-bold">✓</span>
                      )}
                      {progress.status === 'error' && (
                        <span className="text-red-500 font-bold">✗</span>
                      )}
                    </div>
                  </div>
                  {progress.status === 'uploading' && (
                    <Progress value={progress.progress} className="h-1.5" />
                  )}
                  {progress.status === 'error' && (
                    <div className="text-xs text-red-500 mt-1">{progress.error}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Uploaded Media Preview */}
      {uploadedMedia.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Hochgeladene Medien ({uploadedMedia.length})
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-xs"
            >
              Alle entfernen
            </Button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {uploadedMedia.map((media, index) => (
              <div key={index} className="relative group">
                <Card className="overflow-hidden">
                  <div className="aspect-square relative bg-muted">
                    {media.type === 'image' ? (
                      <img
                        src={media.url}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    
                     {/* Media Type Badge */}
                    <Badge
                      variant={media.isPreview ? "outline" : "secondary"}
                      className="absolute top-2 left-2 text-xs"
                    >
                      {media.isPreview && "📤 "}
                      {media.type === 'image' ? (
                        <><Image className="h-3 w-3 mr-1" /> Bild</>
                      ) : (
                        <><Video className="h-3 w-3 mr-1" /> Video</>
                      )}
                    </Badge>
                    
                    {/* Remove Button */}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeMedia(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};