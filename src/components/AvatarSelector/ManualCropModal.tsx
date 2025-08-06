import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Crop as CropIcon, RotateCcw, Loader2, Move } from 'lucide-react';
import 'react-image-crop/dist/ReactCrop.css';

interface ManualCropModalProps {
  beforeImage: string;
  afterImage: string;
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedAfterImage: string) => void;
  title?: string;
}

export const ManualCropModal: React.FC<ManualCropModalProps> = ({
  beforeImage,
  afterImage,
  isOpen,
  onClose,
  onCropComplete,
  title = 'Manuelles Cropping'
}) => {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 80,
    height: 100,
    x: 10,
    y: 0
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [rotation, setRotation] = useState(0);
  const [transparency, setTransparency] = useState(50);
  const [isProcessing, setIsProcessing] = useState(false);
  const [overlayPosition, setOverlayPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setCrop({
        unit: '%',
        width: 80,
        height: 100,
        x: 10,
        y: 0
      });
      setRotation(0);
      setTransparency(50);
      setOverlayPosition({ x: 0, y: 0 });
      setCompletedCrop(undefined);
    }
  }, [isOpen]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
    
    // Set initial crop with 3:4 aspect ratio
    const aspectRatio = 3 / 4;
    let cropWidth, cropHeight;
    
    if (width / height > aspectRatio) {
      // Image is wider - fit to height
      cropHeight = height * 0.9;
      cropWidth = cropHeight * aspectRatio;
    } else {
      // Image is taller - fit to width
      cropWidth = width * 0.9;
      cropHeight = cropWidth / aspectRatio;
    }
    
    const x = (width - cropWidth) / 2;
    const y = (height - cropHeight) / 2;
    
    setCrop({
      unit: 'px',
      width: cropWidth,
      height: cropHeight,
      x,
      y
    });
  };

  const getCroppedImage = async (): Promise<string> => {
    const image = imgRef.current;
    if (!completedCrop || !image) {
      throw new Error('No crop area selected');
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Set target size with 3:4 aspect ratio
    const targetWidth = 384; // 3:4 ratio = 384x512
    const targetHeight = 512;
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Apply rotation if needed
    if (rotation !== 0) {
      ctx.translate(targetWidth / 2, targetHeight / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-targetWidth / 2, -targetHeight / 2);
    }

    // Calculate scale factors
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Draw cropped and rotated image
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      targetWidth,
      targetHeight
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(URL.createObjectURL(blob));
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
      const croppedImageUrl = await getCroppedImage();
      onCropComplete(croppedImageUrl);
      toast.success('Bild erfolgreich zugeschnitten');
      onClose();
    } catch (error) {
      console.error('Error cropping image:', error);
      toast.error('Fehler beim Zuschneiden des Bildes');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetCrop = () => {
    const img = imgRef.current;
    if (!img) return;

    const { naturalWidth: width, naturalHeight: height } = img;
    const aspectRatio = 3 / 4;
    let cropWidth, cropHeight;
    
    if (width / height > aspectRatio) {
      cropHeight = height * 0.9;
      cropWidth = cropHeight * aspectRatio;
    } else {
      cropWidth = width * 0.9;
      cropHeight = cropWidth / aspectRatio;
    }
    
    const x = (width - cropWidth) / 2;
    const y = (height - cropHeight) / 2;
    
    setCrop({
      unit: 'px',
      width: cropWidth,
      height: cropHeight,
      x,
      y
    });
    setRotation(0);
    setOverlayPosition({ x: 0, y: 0 });
  };

  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const startX = e.clientX - rect.left - overlayPosition.x;
      const startY = e.clientY - rect.top - overlayPosition.y;

      const handleMouseMove = (e: MouseEvent) => {
        if (rect) {
          setOverlayPosition({
            x: e.clientX - rect.left - startX,
            y: e.clientY - rect.top - startY
          });
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Control Panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            {/* Transparency Control */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Transparenz: {transparency}%
              </label>
              <Slider
                value={[transparency]}
                onValueChange={(value) => setTransparency(value[0])}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            {/* Rotation Control */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Rotation: {rotation.toFixed(1)}°
              </label>
              <Slider
                value={[rotation]}
                onValueChange={(value) => setRotation(value[0])}
                min={-45}
                max={45}
                step={0.5}
                className="w-full"
              />
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              <Button
                size="sm"
                variant="outline"
                onClick={resetCrop}
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Zurücksetzen
              </Button>
            </div>
          </div>

          {/* Crop Interface */}
          <div className="relative" ref={containerRef}>
            {/* Background image for reference */}
            <div className="absolute inset-0 z-0">
              <img
                src={beforeImage}
                alt="Reference"
                className="w-full h-auto object-contain opacity-30"
              />
            </div>

            {/* Draggable overlay with crop interface */}
            <div
              className="relative z-10 cursor-move"
              style={{
                transform: `translate(${overlayPosition.x}px, ${overlayPosition.y}px)`,
                opacity: transparency / 100
              }}
              onMouseDown={handleOverlayMouseDown}
            >
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={3/4}
                minWidth={100}
                minHeight={133}
                className="max-w-full"
              >
                <img
                  ref={imgRef}
                  src={afterImage}
                  alt="Crop target"
                  onLoad={onImageLoad}
                  className="max-w-full h-auto object-contain"
                  style={{
                    transform: `rotate(${rotation}deg)`
                  }}
                />
              </ReactCrop>
            </div>

            {/* Drag indicator */}
            {!isDragging && (
              <div className="absolute top-4 left-4 z-20 bg-black/50 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                <Move className="h-3 w-3" />
                Bild verschieben
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="text-xs text-muted-foreground bg-muted/50 p-4 rounded-lg">
            <p className="font-medium mb-2">🎯 Anleitung für manuelles Cropping:</p>
            <ul className="space-y-1">
              <li>• Das transparente Overlay zeigt das KI-Bild über dem Original</li>
              <li>• Ziehe das gesamte Overlay um es zu positionieren</li>
              <li>• Nutze den Crop-Rahmen um den gewünschten Bereich auszuwählen</li>
              <li>• Justiere Transparenz und Rotation für perfekte Ausrichtung</li>
              <li>• Ziel-Auflösung: 384x512 Pixel (3:4 Format)</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={isProcessing || !completedCrop}>
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verarbeite...
              </>
            ) : (
              <>
                <CropIcon className="h-4 w-4 mr-2" />
                Bild speichern
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};