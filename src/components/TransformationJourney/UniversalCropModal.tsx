import { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { WandIcon, RefreshCw, Crop as CropIcon } from 'lucide-react';
import { toast } from 'sonner';

export interface UniversalCropModalProps {
  image: File | string | null;
  imageType: 'progress' | 'ai';
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedFile: File) => void;
  onRegenerateAI?: (originalPrompt: string) => void;
  originalPrompt?: string;
  imageCategory?: string;
  targetWeight?: number;
  targetBodyFat?: number;
}

export const UniversalCropModal = ({ 
  image, 
  imageType, 
  isOpen, 
  onClose, 
  onCropComplete,
  onRegenerateAI,
  originalPrompt,
  imageCategory,
  targetWeight,
  targetBodyFat
}: UniversalCropModalProps) => {
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
  const [isRegenerating, setIsRegenerating] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (image) {
      if (typeof image === 'string') {
        setImageUrl(image);
      } else {
        const url = URL.createObjectURL(image);
        setImageUrl(url);
        return () => URL.revokeObjectURL(url);
      }
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
          
          const timestamp = Date.now();
          const fileName = imageType === 'progress' 
            ? `progress-photo-${timestamp}.jpg`
            : `ai-image-cropped-${timestamp}.jpg`;
          
          const file = new File([blob], fileName, {
            type: 'image/jpeg',
            lastModified: timestamp,
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

  const handleRegenerateAI = async () => {
    if (!originalPrompt || !onRegenerateAI) return;

    try {
      setIsRegenerating(true);
      
      // Enhanced prompt for 3:4 aspect ratio generation
      const enhancedPrompt = `${originalPrompt}, 3:4 aspect ratio, perfect framing, centered composition, professional photography, optimal lighting`;
      
      await onRegenerateAI(enhancedPrompt);
      onClose();
      toast.success('KI-Bild wird neu generiert...');
    } catch (error) {
      console.error('Error regenerating AI image:', error);
      toast.error('Fehler beim Neu-Generieren des KI-Bildes');
    } finally {
      setIsRegenerating(false);
    }
  };

  const getModalTitle = () => {
    switch (imageType) {
      case 'progress':
        return 'Fortschrittsfoto zuschneiden (3:4 Format)';
      case 'ai':
        return 'KI-Bild zuschneiden (3:4 Format)';
      default:
        return 'Bild zuschneiden (3:4 Format)';
    }
  };

  const getImageTypeInfo = () => {
    switch (imageType) {
      case 'progress':
        return {
          badge: { color: 'bg-blue-500 text-white', text: 'Fortschrittsfoto' },
          description: 'Alle Fortschrittsfotos werden im 3:4 Format gespeichert für optimale Vergleichbarkeit.'
        };
      case 'ai':
        return {
          badge: { color: 'bg-purple-500 text-white', text: 'KI-Generiert' },
          description: 'Optimieren Sie die Bildausrichtung für perfekte Before/After Vergleiche.'
        };
      default:
        return {
          badge: { color: 'bg-gray-500 text-white', text: 'Bild' },
          description: 'Bild im 3:4 Format zuschneiden.'
        };
    }
  };

  const imageInfo = getImageTypeInfo();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <CropIcon className="w-5 h-5" />
              {getModalTitle()}
            </DialogTitle>
            <Badge className={imageInfo.badge.color}>
              {imageType === 'ai' && <WandIcon className="h-3 w-3 mr-1" />}
              {imageInfo.badge.text}
            </Badge>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-sm text-muted-foreground">
            {imageInfo.description}
            Ziehen Sie den Rahmen, um den gewünschten Bereich auszuwählen.
          </div>

          {/* Image Category and Target Info for AI images */}
          {imageType === 'ai' && (imageCategory || targetWeight || targetBodyFat) && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="text-sm space-y-1">
                {imageCategory && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Kategorie:</span>
                    <Badge variant="outline" className="text-xs">
                      {imageCategory === 'front' ? 'Front' : 
                       imageCategory === 'back' ? 'Rücken' :
                       imageCategory === 'side' ? 'Seite' : imageCategory}
                    </Badge>
                  </div>
                )}
                {(targetWeight || targetBodyFat) && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {targetWeight && <span>Zielgewicht: {targetWeight}kg</span>}
                    {targetBodyFat && <span>Ziel-KFA: {targetBodyFat}%</span>}
                  </div>
                )}
              </div>
            </div>
          )}
          
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
            <div className="font-medium mb-2">💡 Tipps für optimale Ergebnisse:</div>
            <ul className="space-y-1">
              <li>• Zentrieren Sie den Körper im Bildausschnitt</li>
              <li>• Das 3:4 Format (768x1024px) ist ideal für Ganzkörperaufnahmen</li>
              <li>• Einheitliche Formate ermöglichen perfekte Before/After Vergleiche</li>
              {imageType === 'ai' && (
                <li>• Nach dem Zuschneiden können Sie das KI-Bild neu generieren lassen</li>
              )}
            </ul>
          </div>
          
          <div className="flex flex-col gap-3">
            {/* AI Regeneration Option */}
            {imageType === 'ai' && originalPrompt && onRegenerateAI && (
              <>
                <div className="flex justify-center">
                  <Button 
                    variant="outline"
                    onClick={handleRegenerateAI}
                    disabled={isRegenerating || isProcessing}
                    className="w-full"
                  >
                    {isRegenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Neu generieren...
                      </>
                    ) : (
                      <>
                        <WandIcon className="h-4 w-4 mr-2" />
                        Nach Crop neu generieren (3:4 optimiert)
                      </>
                    )}
                  </Button>
                </div>
                <Separator />
              </>
            )}
            
            {/* Standard Actions */}
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={onClose}
                disabled={isProcessing || isRegenerating}
              >
                Abbrechen
              </Button>
              <Button 
                onClick={handleSave}
                disabled={isProcessing || isRegenerating || !completedCrop}
              >
                {isProcessing ? 'Verarbeitung...' : 'Zuschneiden & Speichern'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};