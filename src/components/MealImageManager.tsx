import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Plus, X } from 'lucide-react';
import { useMealImageManager } from '@/hooks/useMealImageManager';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface MealImageManagerProps {
  mealId: string;
  images: string[];
  onImagesUpdate: (newImages: string[]) => void;
  compact?: boolean;
}

export const MealImageManager = ({ 
  mealId, 
  images = [], 
  onImagesUpdate, 
  compact = false 
}: MealImageManagerProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadImages, deleteImage, isUploading } = useMealImageManager({
    mealId,
    currentImages: images,
    onImagesUpdate
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📸 [MealImageManager] File selection event triggered');
    
    const files = Array.from(event.target.files || []);
    console.log('📸 [MealImageManager] Selected files:', files.length);
    
    if (files.length === 0) {
      console.log('📸 [MealImageManager] No files selected');
      return;
    }

    if (!user) {
      console.error('📸 [MealImageManager] No user available - authentication required');
      toast.error('Bitte loggen Sie sich ein, um Bilder hochzuladen');
      return;
    }
    
    try {
      console.log('📸 [MealImageManager] Starting upload for meal:', mealId);
      await uploadImages(files, user.id);
      console.log('📸 [MealImageManager] Upload completed successfully');
      
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('📸 [MealImageManager] Upload failed:', error);
    }
  };

  const handleAddPhoto = () => {
    console.log('📸 [MealImageManager] Add photo button clicked');
    
    if (!user) {
      console.error('📸 [MealImageManager] No user available - authentication required');
      toast.error('Bitte loggen Sie sich ein, um Bilder hochzuladen');
      return;
    }
    
    if (!fileInputRef.current) {
      console.error('📸 [MealImageManager] File input ref not available');
      return;
    }
    
    console.log('📸 [MealImageManager] Triggering file picker');
    fileInputRef.current.click();
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {images.length > 0 && (
          <div className="flex items-center gap-1">
            <Camera className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{images.length}</span>
          </div>
        )}
        {images.length < 3 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddPhoto}
              disabled={isUploading}
              className="h-6 w-6 p-0"
            >
              <Plus className="h-3 w-3" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Existing Images */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {images.slice(0, 2).map((imageUrl, index) => (
            <div key={index} className="relative group">
              <img
                src={imageUrl}
                alt={`Mahlzeit ${index + 1}`}
                className="w-full h-24 object-cover rounded-md"
              />
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteImage(imageUrl)}
                className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add Photo Button */}
      {images.length < 3 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddPhoto}
            disabled={isUploading}
            className="flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            <span className="text-xs">Foto hinzufügen</span>
          </Button>
          {isUploading && (
            <span className="text-xs text-muted-foreground">Wird hochgeladen...</span>
          )}
        </div>
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
