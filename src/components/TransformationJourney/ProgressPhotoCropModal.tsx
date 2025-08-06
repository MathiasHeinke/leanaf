import { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ProgressPhotoCropModalProps {
  image: File | null;
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedFile: File) => void;
}

export const ProgressPhotoCropModal = ({ image, isOpen, onClose, onCropComplete }: ProgressPhotoCropModalProps) => {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 75,
    height: 100,
    x: 12.5,
    y: 0
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (image) {
      const url = URL.createObjectURL(image);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [image]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    
    // Calculate 3:4 aspect ratio crop
    const aspectRatio = 3 / 4;
    let cropWidth = 75;
    let cropHeight = 100;
    let cropX = 12.5;
    let cropY = 0;

    // Adjust crop to fit image dimensions while maintaining 3:4 ratio
    if (width / height > aspectRatio) {
      // Image is wider than 3:4, crop width
      cropHeight = 100;
      cropWidth = (height * aspectRatio / width) * 100;
      cropX = (100 - cropWidth) / 2;
      cropY = 0;
    } else {
      // Image is taller than 3:4, crop height
      cropWidth = 100;
      cropHeight = (width / aspectRatio / height) * 100;
      cropX = 0;
      cropY = (100 - cropHeight) / 2;
    }

    setCrop({
      unit: '%',
      width: cropWidth,
      height: cropHeight,
      x: cropX,
      y: cropY
    });
  };

  const getCroppedImg = async (
    image: HTMLImageElement,
    crop: PixelCrop,
  ): Promise<File> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    // Set canvas size to 3:4 aspect ratio (768x1024)
    const targetWidth = 768;
    const targetHeight = 1024;
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      targetWidth,
      targetHeight
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          
          const file = new File([blob], `progress-photo-${Date.now()}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          
          resolve(file);
        },
        'image/jpeg',
        0.9
      );
    });
  };

  const handleSave = async () => {
    if (!imgRef.current || !completedCrop || !image) {
      toast.error('Bitte wählen Sie einen Bereich zum Zuschneiden aus');
      return;
    }

    try {
      setIsProcessing(true);
      const croppedFile = await getCroppedImg(imgRef.current, completedCrop);
      onCropComplete(croppedFile);
      onClose();
      toast.success('Bild erfolgreich zugeschnitten');
    } catch (error) {
      console.error('Error cropping image:', error);
      toast.error('Fehler beim Zuschneiden des Bildes');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Fortschrittsfoto zuschneiden (3:4 Format)</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Alle Fortschrittsfotos werden im 3:4 Format gespeichert für optimale Vergleichbarkeit.
            Ziehen Sie den Rahmen, um den gewünschten Bereich auszuwählen.
          </div>
          
          {imageUrl && (
            <div className="flex justify-center">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={3/4}
                minWidth={100}
                minHeight={133}
                className="max-h-[60vh]"
              >
                <img
                  ref={imgRef}
                  alt="Crop preview"
                  src={imageUrl}
                  onLoad={onImageLoad}
                  className="max-h-[60vh] w-auto"
                />
              </ReactCrop>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <div className="font-medium mb-1">💡 Tipps für optimale Fortschrittsfotos:</div>
            <ul className="space-y-1">
              <li>• Zentrieren Sie Ihren Körper im Bild</li>
              <li>• Achten Sie auf gute Beleuchtung</li>
              <li>• Halten Sie eine aufrechte Haltung</li>
              <li>• Das 3:4 Format eignet sich perfekt für Ganzkörperaufnahmen</li>
            </ul>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={isProcessing}
            >
              Abbrechen
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isProcessing || !completedCrop}
            >
              {isProcessing ? 'Verarbeitung...' : 'Speichern'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};