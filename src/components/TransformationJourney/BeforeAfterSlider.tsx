import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Brain } from 'lucide-react';
import { SmartCropModal } from '@/components/AvatarSelector/SmartCropModal';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
  showAlignButton?: boolean;
  onImagesAligned?: (alignedImages: string[]) => void;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeImage,
  afterImage,
  beforeLabel = "Vorher",
  afterLabel = "Nachher",
  className = "",
  showAlignButton = false,
  onImagesAligned
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [showSmartCrop, setShowSmartCrop] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updateSliderPosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    updateSliderPosition(e.clientX);
  }, [updateSliderPosition]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    updateSliderPosition(e.clientX);
  }, [updateSliderPosition]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isDragging.current = true;
    updateSliderPosition(e.touches[0].clientX);
  }, [updateSliderPosition]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    updateSliderPosition(e.touches[0].clientX);
  }, [updateSliderPosition]);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const handleAlignImages = () => {
    setShowSmartCrop(true);
  };

  const handleAlignmentComplete = (alignedImages: string[]) => {
    setShowSmartCrop(false);
    if (onImagesAligned && alignedImages.length >= 2) {
      onImagesAligned(alignedImages);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Align Button */}
        {showAlignButton && (
          <div className="flex justify-center">
            <Button
              onClick={handleAlignImages}
              variant="outline"
              size="sm"
              className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-300/50 hover:border-purple-400"
            >
              <Brain className="h-4 w-4 mr-2 text-purple-600" />
              KI-Ausrichtung
            </Button>
          </div>
        )}

        {/* Before/After Slider */}
        <div 
          ref={containerRef}
          className={`relative w-full h-96 overflow-hidden rounded-lg cursor-ew-resize ${className}`}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* After Image (Background) */}
          <img
            src={afterImage}
            alt={afterLabel}
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
          
          {/* Before Image (Overlay with clip-path) */}
          <div 
            className="absolute inset-0"
            style={{ 
              clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` 
            }}
          >
            <img
              src={beforeImage}
              alt={beforeLabel}
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
          </div>

          {/* Slider Line */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-10"
            style={{ left: `calc(${sliderPosition}% - 2px)` }}
          >
            {/* Slider Handle */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg border-2 border-primary flex items-center justify-center cursor-ew-resize">
              <div className="flex gap-0.5">
                <div className="w-0.5 h-4 bg-primary rounded-full"></div>
                <div className="w-0.5 h-4 bg-primary rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Labels */}
          <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
            {beforeLabel}
          </div>
          <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
            {afterLabel}
          </div>

          {/* Percentage Display */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
            {Math.round(sliderPosition)}% | {Math.round(100 - sliderPosition)}%
          </div>
        </div>
      </div>

      {/* Smart Crop Modal */}
      <SmartCropModal
        images={[beforeImage, afterImage]}
        isOpen={showSmartCrop}
        onClose={() => setShowSmartCrop(false)}
        onCropComplete={handleAlignmentComplete}
        mode="align"
        title="Bilder für perfekten Vergleich ausrichten"
      />
    </>
  );
};