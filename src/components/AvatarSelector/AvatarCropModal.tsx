import React, { useState, useRef } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { toast } from 'sonner';
import 'react-image-crop/dist/ReactCrop.css';

interface AvatarCropModalProps {
  image: File;
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedImageUrl: string) => void;
}

export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({
  image,
  isOpen,
  onClose,
  onCropComplete
}) => {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 90,
    height: 90,
    x: 5,
    y: 5
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const { uploadFiles } = useMediaUpload();

  React.useEffect(() => {
    if (image) {
      const url = URL.createObjectURL(image);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [image]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
    
    // Set initial crop to be square and centered
    const size = Math.min(width, height);
    const x = (width - size) / 2;
    const y = (height - size) / 2;
    
    setCrop({
      unit: 'px',
      width: size,
      height: size,
      x,
      y
    });
  };

  const getCroppedImg = async (): Promise<File | null> => {
    if (!completedCrop || !imgRef.current) return null;

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    // Set canvas size to desired avatar size (256x256)
    const targetSize = 256;
    canvas.width = targetSize;
    canvas.height = targetSize;

    // Calculate scale factor
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Draw the cropped image
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      targetSize,
      targetSize
    );

    // Convert canvas to blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `avatar-${Date.now()}.png`, { type: 'image/png' });
          resolve(file);
        } else {
          resolve(null);
        }
      }, 'image/png', 0.9);
    });
  };

  const handleSave = async () => {
    if (!completedCrop) {
      toast.error('Bitte wähle einen Bildbereich aus');
      return;
    }

    setIsProcessing(true);
    try {
      const croppedFile = await getCroppedImg();
      if (!croppedFile) {
        throw new Error('Fehler beim Zuschneiden des Bildes');
      }

      // Upload the cropped image
      const uploadedUrls = await uploadFiles([croppedFile]);
      if (uploadedUrls.length > 0) {
        onCropComplete(uploadedUrls[0]);
        toast.success('Avatar erfolgreich hochgeladen');
      } else {
        throw new Error('Upload fehlgeschlagen');
      }
    } catch (error) {
      console.error('Error processing avatar:', error);
      toast.error('Fehler beim Verarbeiten des Avatars');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Avatar zuschneiden</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Wähle den gewünschten Bildbereich für deinen Avatar aus. Der Bereich wird automatisch quadratisch zugeschnitten.
          </div>
          
          {imageUrl && (
            <div className="flex justify-center">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1} // Force square aspect ratio
                minWidth={50}
                minHeight={50}
                className="max-w-full max-h-[60vh]"
              >
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  className="max-w-full max-h-[60vh] object-contain"
                />
              </ReactCrop>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p className="font-medium mb-1">💡 Zuschnitt-Tipps:</p>
            <ul className="space-y-1">
              <li>• Ziehe die Ecken um den Bereich anzupassen</li>
              <li>• Zentriere dein Gesicht im Auswahlbereich</li>
              <li>• Der Avatar wird auf 256x256 Pixel skaliert</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={isProcessing}>
            {isProcessing ? 'Verarbeite...' : 'Avatar speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};