import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { toast } from 'sonner';
import { Brain, RotateCcw, Crop as CropIcon, Loader2 } from 'lucide-react';
import 'react-image-crop/dist/ReactCrop.css';

interface SmartCropModalProps {
  images: File[] | string[]; // Can handle Files for upload or URLs for existing images
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedImages: string[]) => void;
  mode?: 'upload' | 'align'; // Upload mode for new images, align mode for existing images
  title?: string;
}

export const SmartCropModal: React.FC<SmartCropModalProps> = ({
  images,
  isOpen,
  onClose,
  onCropComplete,
  mode = 'upload',
  title = 'Smart Crop'
}) => {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [completedCrops, setCompletedCrops] = useState<PixelCrop[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [useAiAlignment, setUseAiAlignment] = useState(true);
  const [rotations, setRotations] = useState<number[]>([]);
  const [alignmentDetected, setAlignmentDetected] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const { detectPose, alignTwoImages, isDetecting } = usePoseDetection();
  const { uploadFiles } = useMediaUpload();

  // Initialize image URLs and default crops
  useEffect(() => {
    if (images.length === 0) return;

    const urls = images.map(img => 
      typeof img === 'string' ? img : URL.createObjectURL(img)
    );
    
    setImageUrls(urls);
    setCrops(images.map(() => ({
      unit: '%' as const,
      width: 90,
      height: 90,
      x: 5,
      y: 5
    })));
    setCompletedCrops([]);
    setRotations(images.map(() => 0));
    setAlignmentDetected(false);

    // Cleanup object URLs on unmount
    return () => {
      urls.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [images]);

  const onImageLoad = (index: number) => (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
    
    // Set initial crop to be square and centered
    const size = Math.min(width, height);
    const x = (width - size) / 2;
    const y = (height - size) / 2;
    
    const newCrops = [...crops];
    newCrops[index] = {
      unit: 'px',
      width: size,
      height: size,
      x,
      y
    };
    setCrops(newCrops);
  };

  const handleAutoAlign = async () => {
    if (imageUrls.length < 2 || !useAiAlignment) return;

    setIsProcessing(true);
    toast.info('KI-Analyse wird gestartet...');

    try {
      const img1 = imgRefs.current[0];
      const img2 = imgRefs.current[1];
      
      if (!img1 || !img2) {
        throw new Error('Bilder sind noch nicht geladen');
      }

      if (imageUrls.length === 2) {
        // Two image alignment
        const alignmentResult = await alignTwoImages(img1, img2);
        
        if (alignmentResult) {
          const newCrops = [...crops];
          const newRotations = [...rotations];

          // Apply alignment to crops
          newCrops[0] = {
            unit: 'px',
            x: alignmentResult.alignment1.cropBox.x,
            y: alignmentResult.alignment1.cropBox.y,
            width: alignmentResult.alignment1.cropBox.width,
            height: alignmentResult.alignment1.cropBox.height
          };

          newCrops[1] = {
            unit: 'px',
            x: alignmentResult.alignment2.cropBox.x,
            y: alignmentResult.alignment2.cropBox.y,
            width: alignmentResult.alignment2.cropBox.width,
            height: alignmentResult.alignment2.cropBox.height
          };

          newRotations[0] = alignmentResult.alignment1.rotation;
          newRotations[1] = alignmentResult.alignment2.rotation;

          setCrops(newCrops);
          setRotations(newRotations);
          setAlignmentDetected(true);
          
          toast.success('KI-Ausrichtung erfolgreich angewendet!');
        }
      } else {
        // Multiple image alignment - align all to first image
        const firstAlignment = await detectPose(img1);
        if (!firstAlignment) throw new Error('Pose im ersten Bild nicht erkannt');

        const newCrops = [...crops];
        const newRotations = [...rotations];

        // Set first image alignment
        newCrops[0] = {
          unit: 'px',
          x: firstAlignment.cropBox.x,
          y: firstAlignment.cropBox.y,
          width: firstAlignment.cropBox.width,
          height: firstAlignment.cropBox.height
        };
        newRotations[0] = firstAlignment.rotation;

        // Align remaining images to first
        for (let i = 1; i < imgRefs.current.length; i++) {
          const img = imgRefs.current[i];
          if (img) {
            try {
              const alignment = await detectPose(img);
              if (alignment) {
                // Match to first image's pose
                newCrops[i] = {
                  unit: 'px',
                  x: alignment.cropBox.x,
                  y: alignment.cropBox.y,
                  width: firstAlignment.cropBox.width, // Use same size as reference
                  height: firstAlignment.cropBox.height
                };
                newRotations[i] = firstAlignment.rotation; // Use same rotation as reference
              }
            } catch (error) {
              console.warn(`Failed to align image ${i + 1}:`, error);
            }
          }
        }

        setCrops(newCrops);
        setRotations(newRotations);
        setAlignmentDetected(true);
        
        toast.success(`${imageUrls.length} Bilder automatisch ausgerichtet!`);
      }
    } catch (error) {
      console.error('Auto-alignment failed:', error);
      toast.error('KI-Ausrichtung fehlgeschlagen: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getCroppedImages = async (): Promise<File[]> => {
    const croppedFiles: File[] = [];

    for (let i = 0; i < imageUrls.length; i++) {
      const image = imgRefs.current[i];
      const completedCrop = completedCrops[i];
      const rotation = rotations[i];

      if (!completedCrop || !image) continue;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      // Set target size
      const targetSize = 512;
      canvas.width = targetSize;
      canvas.height = targetSize;

      // Apply rotation if needed
      if (rotation !== 0) {
        ctx.translate(targetSize / 2, targetSize / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-targetSize / 2, -targetSize / 2);
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
        targetSize,
        targetSize
      );

      // Convert to blob and then to file
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png', 0.9);
      });

      if (blob) {
        const fileName = `aligned-image-${i + 1}-${Date.now()}.png`;
        croppedFiles.push(new File([blob], fileName, { type: 'image/png' }));
      }
    }

    return croppedFiles;
  };

  const handleSave = async () => {
    if (completedCrops.length === 0) {
      toast.error('Bitte wähle einen Bildbereich aus');
      return;
    }

    setIsProcessing(true);
    try {
      const croppedFiles = await getCroppedImages();
      
      if (croppedFiles.length === 0) {
        throw new Error('Fehler beim Zuschneiden der Bilder');
      }

      if (mode === 'upload') {
        // Upload the cropped images
        const uploadedUrls = await uploadFiles(croppedFiles);
        onCropComplete(uploadedUrls);
      } else {
        // For align mode, create object URLs for preview
        const urls = croppedFiles.map(file => URL.createObjectURL(file));
        onCropComplete(urls);
      }
      
      toast.success(`${croppedFiles.length} Bilder erfolgreich verarbeitet`);
    } catch (error) {
      console.error('Error processing images:', error);
      toast.error('Fehler beim Verarbeiten der Bilder');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRotationChange = (index: number, value: number) => {
    const newRotations = [...rotations];
    newRotations[index] = value;
    setRotations(newRotations);
  };

  const resetCrop = (index: number) => {
    const img = imgRefs.current[index];
    if (!img) return;

    const { naturalWidth: width, naturalHeight: height } = img;
    const size = Math.min(width, height);
    const x = (width - size) / 2;
    const y = (height - size) / 2;
    
    const newCrops = [...crops];
    newCrops[index] = {
      unit: 'px',
      width: size,
      height: size,
      x,
      y
    };
    setCrops(newCrops);

    const newRotations = [...rotations];
    newRotations[index] = 0;
    setRotations(newRotations);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* AI Controls */}
          {imageUrls.length > 1 && (
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Switch 
                  checked={useAiAlignment} 
                  onCheckedChange={setUseAiAlignment}
                  id="ai-alignment"
                />
                <label htmlFor="ai-alignment" className="text-sm font-medium">
                  KI-gestützte Ausrichtung verwenden
                </label>
              </div>
              
              {useAiAlignment && (
                <Button
                  onClick={handleAutoAlign}
                  disabled={isProcessing || isDetecting}
                  size="sm"
                  variant="outline"
                >
                  {isProcessing || isDetecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analysiere...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Auto-Ausrichtung
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {alignmentDetected && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                ✅ KI-Ausrichtung erfolgreich angewendet! Die Bilder sind jetzt optimal ausgerichtet.
              </p>
            </div>
          )}

          {/* Image Navigation for multiple images */}
          {imageUrls.length > 1 && (
            <div className="flex gap-2 justify-center">
              {imageUrls.map((_, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant={currentImageIndex === index ? 'default' : 'outline'}
                  onClick={() => setCurrentImageIndex(index)}
                >
                  Bild {index + 1}
                </Button>
              ))}
            </div>
          )}

          {/* Current Image Crop */}
          {imageUrls[currentImageIndex] && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  Bild {currentImageIndex + 1} von {imageUrls.length}
                </h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resetCrop(currentImageIndex)}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Zurücksetzen
                  </Button>
                </div>
              </div>

              {/* Rotation Control */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Rotation: {rotations[currentImageIndex]?.toFixed(1) || 0}°
                </label>
                <Slider
                  value={[rotations[currentImageIndex] || 0]}
                  onValueChange={(value) => handleRotationChange(currentImageIndex, value[0])}
                  min={-45}
                  max={45}
                  step={0.5}
                  className="w-full"
                />
              </div>

              <div className="flex justify-center">
                <ReactCrop
                  crop={crops[currentImageIndex]}
                  onChange={(_, percentCrop) => {
                    const newCrops = [...crops];
                    newCrops[currentImageIndex] = percentCrop;
                    setCrops(newCrops);
                  }}
                  onComplete={(c) => {
                    const newCompletedCrops = [...completedCrops];
                    newCompletedCrops[currentImageIndex] = c;
                    setCompletedCrops(newCompletedCrops);
                  }}
                  aspect={1}
                  minWidth={50}
                  minHeight={50}
                  className="max-w-full max-h-[50vh]"
                >
                  <img
                    ref={(el) => imgRefs.current[currentImageIndex] = el}
                    src={imageUrls[currentImageIndex]}
                    alt={`Crop preview ${currentImageIndex + 1}`}
                    onLoad={onImageLoad(currentImageIndex)}
                    className="max-w-full max-h-[50vh] object-contain"
                    style={{
                      transform: `rotate(${rotations[currentImageIndex] || 0}deg)`
                    }}
                  />
                </ReactCrop>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p className="font-medium mb-1">💡 Smart Crop Tipps:</p>
            <ul className="space-y-1">
              <li>• KI-Ausrichtung erkennt automatisch Körper-Landmarks für perfekte Ausrichtung</li>
              <li>• Ziehe die Ecken um den Bereich manuell anzupassen</li>
              <li>• Nutze die Rotation für perfekte Körperausrichtung</li>
              <li>• Alle Bilder werden auf 512x512 Pixel skaliert</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={isProcessing || completedCrops.length === 0}>
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verarbeite...
              </>
            ) : (
              <>
                <CropIcon className="h-4 w-4 mr-2" />
                {imageUrls.length} Bilder speichern
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};