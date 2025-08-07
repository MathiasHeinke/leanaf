import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Image, X, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoUploadProps {
  onPhotoSelect: (file: File) => void;
  onPhotoRemove: () => void;
  photoPreview?: string;
  isUploading?: boolean;
  className?: string;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  onPhotoSelect,
  onPhotoRemove,
  photoPreview,
  isUploading = false,
  className
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      onPhotoSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {!photoPreview ? (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors",
            "border-violet-200 dark:border-violet-800 hover:border-violet-300 dark:hover:border-violet-700",
            dragOver && "border-violet-400 bg-violet-50 dark:bg-violet-950/30"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
          
          {isUploading ? (
            <div className="flex items-center justify-center gap-2 text-violet-600 dark:text-violet-400">
              <Upload className="h-4 w-4 animate-spin" />
              <span className="text-xs">Hochladen...</span>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2 text-violet-500">
                <Camera className="h-4 w-4" />
                <Image className="h-4 w-4" />
              </div>
              <p className="text-xs text-violet-600 dark:text-violet-400">
                Foto hinzufügen
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <img
            src={photoPreview}
            alt="Journal entry"
            className="w-full h-20 object-cover rounded-lg border border-violet-200 dark:border-violet-800"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={onPhotoRemove}
            className="absolute top-1 right-1 h-6 w-6 p-0 bg-background/80 hover:bg-background"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};