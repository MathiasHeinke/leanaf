import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WelcomeSlide } from './WelcomeSlide';
import { JourneySlide } from './JourneySlide';
import { BenefitsSlide } from './BenefitsSlide';
import { ProfileInputSlide } from './ProfileInputSlide';
import { cn } from '@/lib/utils';

interface InteractiveOnboardingSliderProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const InteractiveOnboardingSlider = ({
  isOpen,
  onClose,
  onComplete
}: InteractiveOnboardingSliderProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const totalSlides = 4;
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number>(0);
  const currentX = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  const nextSlide = () => {
    if (currentSlide < totalSlides - 1 && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentSlide(currentSlide + 1);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0 && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentSlide(currentSlide - 1);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  const goToSlide = (slideIndex: number) => {
    if (slideIndex >= 0 && slideIndex < totalSlides && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentSlide(slideIndex);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (currentSlide === 3) return; // Disable swipe on profile input slide
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || currentSlide === 3) return;
    currentX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!isDragging.current || currentSlide === 3) return;
    
    const diffX = startX.current - currentX.current;
    const threshold = 50; // Minimum swipe distance

    if (Math.abs(diffX) > threshold) {
      if (diffX > 0 && currentSlide < totalSlides - 1) {
        // Swipe left - next slide
        nextSlide();
      } else if (diffX < 0 && currentSlide > 0) {
        // Swipe right - previous slide
        prevSlide();
      }
    }

    isDragging.current = false;
    startX.current = 0;
    currentX.current = 0;
  };

  // Mouse event handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (currentSlide === 3) return;
    startX.current = e.clientX;
    isDragging.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || currentSlide === 3) return;
    currentX.current = e.clientX;
  };

  const handleMouseUp = () => {
    if (!isDragging.current || currentSlide === 3) return;
    
    const diffX = startX.current - currentX.current;
    const threshold = 50;

    if (Math.abs(diffX) > threshold) {
      if (diffX > 0 && currentSlide < totalSlides - 1) {
        nextSlide();
      } else if (diffX < 0 && currentSlide > 0) {
        prevSlide();
      }
    }

    isDragging.current = false;
    startX.current = 0;
    currentX.current = 0;
  };

  const handleProfileComplete = () => {
    onComplete();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 bg-black/90 backdrop-blur-lg border border-white/10 text-white overflow-hidden">
        {/* Progress Indicator */}
        <div className="flex gap-1 p-4 pb-0">
          {Array.from({ length: totalSlides }, (_, i) => (
            <div
              key={i}
              onClick={() => goToSlide(i)}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-300 cursor-pointer",
                i <= currentSlide ? "bg-primary" : "bg-white/20",
                "hover:bg-primary/70"
              )}
            />
          ))}
        </div>

        {/* Slide Container */}
        <div 
          ref={containerRef}
          className="relative overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div 
            className="flex transition-transform duration-300 ease-out"
            style={{ 
              transform: `translateX(-${currentSlide * 100}%)`,
              width: `${totalSlides * 100}%`
            }}
          >
            {/* Slide 1: Welcome */}
            <div className="w-full flex-shrink-0 min-h-[500px] p-6">
              <WelcomeSlide />
            </div>

            {/* Slide 2: Journey */}
            <div className="w-full flex-shrink-0 min-h-[500px] p-6">
              <JourneySlide />
            </div>

            {/* Slide 3: Benefits */}
            <div className="w-full flex-shrink-0 min-h-[500px] p-6">
              <BenefitsSlide />
            </div>

            {/* Slide 4: Profile Input */}
            <div className="w-full flex-shrink-0 min-h-[500px] p-6">
              <ProfileInputSlide onComplete={handleProfileComplete} />
            </div>
          </div>
        </div>

        {/* Navigation Controls */}
        {currentSlide < 3 && (
          <div className="flex justify-between items-center p-6 pt-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevSlide}
              disabled={currentSlide === 0 || isTransitioning}
              className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Zurück
            </Button>

            <div className="flex gap-2">
              {currentSlide < totalSlides - 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  Später
                </Button>
              )}
              
              <Button
                onClick={nextSlide}
                disabled={isTransitioning}
                className="bg-primary hover:bg-primary/90 disabled:opacity-70"
              >
                Weiter
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Swipe Hint for Mobile */}
        {currentSlide < 3 && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-white/40 text-xs md:hidden">
            👈 Wischen zum Navigieren 👉
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};