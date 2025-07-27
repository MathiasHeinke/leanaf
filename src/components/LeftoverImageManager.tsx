import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Plus, X, Trash2 } from 'lucide-react';
import { useLeftoverImageManager } from '@/hooks/useLeftoverImageManager';
import { useAuth } from '@/hooks/useAuth';

interface LeftoverImageManagerProps {
  mealId: string;
  leftoverImages: string[];
  onLeftoverImagesUpdate: (newImages: string[]) => void;
  onAnalyzeLeftovers?: () => void;
  isAnalyzing?: boolean;
}

export const LeftoverImageManager = ({ 
  mealId, 
  leftoverImages = [], 
  onLeftoverImagesUpdate,
  onAnalyzeLeftovers,
  isAnalyzing = false
}: LeftoverImageManagerProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadLeftoverImages, deleteLeftoverImage, isUploading } = useLeftoverImageManager({
    mealId,
    currentLeftoverImages: leftoverImages,
    onLeftoverImagesUpdate
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0 && user) {
      await uploadLeftoverImages(files, user.id);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddPhoto = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3 p-3 border rounded-lg bg-secondary/30">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Reste-Bilder</h4>
        {leftoverImages.length > 0 && onAnalyzeLeftovers && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAnalyzeLeftovers}
            disabled={isAnalyzing}
            className="flex items-center gap-1"
          >
            <Camera className="h-3 w-3" />
            {isAnalyzing ? 'Analysiere...' : 'Reste analysieren'}
          </Button>
        )}
      </div>

      {/* Existing Leftover Images */}
      {leftoverImages.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {leftoverImages.slice(0, 2).map((imageUrl, index) => (
            <div key={index} className="relative group">
              <img
                src={imageUrl}
                alt={`Reste ${index + 1}`}
                className="w-full h-20 object-cover rounded-md border-2 border-orange-200"
              />
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteLeftoverImage(imageUrl)}
                className="absolute top-1 right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-2 w-2" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add Photo Button */}
      {leftoverImages.length < 2 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddPhoto}
            disabled={isUploading}
            className="flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            <span className="text-xs">Reste-Foto hinzufügen</span>
          </Button>
          {isUploading && (
            <span className="text-xs text-muted-foreground">Wird hochgeladen...</span>
          )}
        </div>
      )}

      {leftoverImages.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Füge Bilder der übriggebliebenen Reste hinzu, um die tatsächlich verzehrte Menge zu berechnen.
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
