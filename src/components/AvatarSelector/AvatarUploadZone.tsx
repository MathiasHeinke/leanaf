import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AvatarUploadZoneProps {
  onImageSelected: (file: File) => void;
  onCancel: () => void;
}

export const AvatarUploadZone: React.FC<AvatarUploadZoneProps> = ({
  onImageSelected,
  onCancel
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onImageSelected(acceptedFiles[0]);
    }
  }, [onImageSelected]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const hasRejectedFiles = fileRejections.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Eigenes Bild hochladen</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-8 w-8 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          "hover:border-primary hover:bg-primary/5",
          isDragActive && "border-primary bg-primary/5",
          hasRejectedFiles && "border-destructive bg-destructive/5"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            hasRejectedFiles ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
          )}>
            {hasRejectedFiles ? (
              <AlertCircle className="w-6 h-6" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
          </div>
          
          {hasRejectedFiles ? (
            <div className="text-sm text-destructive">
              <p className="font-medium">Fehler beim Upload</p>
              <p>Erlaubte Formate: JPG, PNG, WebP, GIF (max. 10MB)</p>
            </div>
          ) : isDragActive ? (
            <div className="text-sm">
              <p className="font-medium">Bild hier ablegen...</p>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              <p className="font-medium">Bild hochladen oder hier ablegen</p>
              <p>JPG, PNG, WebP, GIF bis 10MB</p>
              <p className="text-xs mt-1">Wird automatisch auf 1:1 Format zugeschnitten</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <p className="font-medium mb-1">💡 Tipp für beste Ergebnisse:</p>
        <ul className="space-y-1">
          <li>• Verwende ein Bild mit dir in der Mitte</li>
          <li>• Quadratisches Format ist optimal</li>
          <li>• Heller Hintergrund funktioniert besser</li>
          <li>• Gesicht sollte gut sichtbar sein</li>
        </ul>
      </div>
    </div>
  );
};