import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { RotateCw, Move, ZoomIn, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface ManualCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalImage: string;
  aiImage: string;
  onSave: (croppedImageUrl: string) => void;
  targetWeight?: number;
}

export const ManualCropModal: React.FC<ManualCropModalProps> = ({
  isOpen,
  onClose,
  originalImage,
  aiImage,
  onSave,
  targetWeight
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [transparency, setTransparency] = useState([50]);
  const [scale, setScale] = useState([100]);
  const [rotation, setRotation] = useState([0]);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(false);

  // Load images and initialize canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size for 3:4 aspect ratio
    const containerWidth = 400;
    const containerHeight = (containerWidth * 4) / 3; // 3:4 ratio
    canvas.width = containerWidth;
    canvas.height = containerHeight;

    const originalImg = new Image();
    const aiImg = new Image();
    
    originalImg.crossOrigin = 'anonymous';
    aiImg.crossOrigin = 'anonymous';

    let loadedImages = 0;
    const drawCanvas = () => {
      if (loadedImages < 2) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw original image as background
      ctx.globalAlpha = 1;
      ctx.drawImage(originalImg, 0, 0, canvas.width, canvas.height);
      
      // Save context for AI image transformations
      ctx.save();
      
      // Apply transformations to AI image
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      ctx.translate(centerX + position.x, centerY + position.y);
      ctx.rotate((rotation[0] * Math.PI) / 180);
      ctx.scale(scale[0] / 100, scale[0] / 100);
      
      // Set transparency for AI image
      ctx.globalAlpha = transparency[0] / 100;
      
      // Draw AI image centered
      const aiWidth = (canvas.width * scale[0]) / 100;
      const aiHeight = (canvas.height * scale[0]) / 100;
      ctx.drawImage(aiImg, -aiWidth / 2, -aiHeight / 2, aiWidth, aiHeight);
      
      ctx.restore();
    };

    originalImg.onload = () => {
      loadedImages++;
      drawCanvas();
    };
    
    aiImg.onload = () => {
      loadedImages++;
      drawCanvas();
    };

    originalImg.src = originalImage;
    aiImg.src = aiImage;

    // Redraw when parameters change
    drawCanvas();
  }, [isOpen, originalImage, aiImage, transparency, scale, rotation, position]);

  // Handle mouse events for dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    const rect = canvasRef.current!.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left - position.x,
      y: e.clientY - rect.top - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left - dragStart.x,
      y: e.clientY - rect.top - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Save the cropped image
  const handleSave = async () => {
    if (!canvasRef.current) return;
    
    setIsLoading(true);
    try {
      // Create final canvas without transparency overlay
      const finalCanvas = document.createElement('canvas');
      const finalCtx = finalCanvas.getContext('2d');
      if (!finalCtx) throw new Error('Could not create canvas context');

      finalCanvas.width = canvasRef.current.width;
      finalCanvas.height = canvasRef.current.height;

      // Draw original image
      const originalImg = new Image();
      originalImg.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        originalImg.onload = resolve;
        originalImg.onerror = reject;
        originalImg.src = originalImage;
      });

      finalCtx.drawImage(originalImg, 0, 0, finalCanvas.width, finalCanvas.height);

      // Draw AI image with transformations but full opacity
      const aiImg = new Image();
      aiImg.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        aiImg.onload = resolve;
        aiImg.onerror = reject;
        aiImg.src = aiImage;
      });

      finalCtx.save();
      const centerX = finalCanvas.width / 2;
      const centerY = finalCanvas.height / 2;
      
      finalCtx.translate(centerX + position.x, centerY + position.y);
      finalCtx.rotate((rotation[0] * Math.PI) / 180);
      finalCtx.scale(scale[0] / 100, scale[0] / 100);
      finalCtx.globalAlpha = 1; // Full opacity for final image
      
      const aiWidth = (finalCanvas.width * scale[0]) / 100;
      const aiHeight = (finalCanvas.height * scale[0]) / 100;
      finalCtx.drawImage(aiImg, -aiWidth / 2, -aiHeight / 2, aiWidth, aiHeight);
      finalCtx.restore();

      // Convert to blob and call onSave
      finalCanvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          onSave(url);
          toast.success('Bildausrichtung gespeichert!');
        }
      }, 'image/jpeg', 0.9);

    } catch (error) {
      console.error('Error saving cropped image:', error);
      toast.error('Fehler beim Speichern der Bildausrichtung');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset all transformations
  const handleReset = () => {
    setTransparency([50]);
    setScale([100]);
    setRotation([0]);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Move className="h-5 w-5 text-primary" />
            KI-Bild manuell ausrichten
            {targetWeight && (
              <Badge variant="secondary" className="ml-2">
                {targetWeight}kg
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Canvas for image overlay */}
          <div className="flex justify-center">
            <div className="relative border-2 border-dashed border-border rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                className="cursor-move"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="text-xs">
                  3:4 Format
                </Badge>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Transparency */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                👁️ Transparenz: {transparency[0]}%
              </label>
              <Slider
                value={transparency}
                onValueChange={setTransparency}
                max={100}
                min={0}
                step={1}
                className="w-full"
              />
            </div>

            {/* Scale */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <ZoomIn className="h-4 w-4" />
                Größe: {scale[0]}%
              </label>
              <Slider
                value={scale}
                onValueChange={setScale}
                max={200}
                min={50}
                step={5}
                className="w-full"
              />
            </div>

            {/* Rotation */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <RotateCw className="h-4 w-4" />
                Drehung: {rotation[0]}°
              </label>
              <Slider
                value={rotation}
                onValueChange={setRotation}
                max={360}
                min={0}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          {/* Position info */}
          <div className="text-center text-sm text-muted-foreground">
            Position: X: {position.x.toFixed(0)}, Y: {position.y.toFixed(0)}
            <br />
            💡 Tipp: Klicken und ziehen Sie das Bild für präzise Positionierung
          </div>

          {/* Action buttons */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isLoading}
            >
              Zurücksetzen
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-2" />
                Abbrechen
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="bg-gradient-primary"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Speichern...' : 'Speichern'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};