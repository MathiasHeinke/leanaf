import React, { useState } from 'react';
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
  const totalSlides = 4;

  const nextSlide = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleProfileComplete = () => {
    onComplete();
    onClose();
  };

  const renderSlide = () => {
    switch (currentSlide) {
      case 0:
        return <WelcomeSlide />;
      case 1:
        return <JourneySlide />;
      case 2:
        return <BenefitsSlide />;
      case 3:
        return <ProfileInputSlide onComplete={handleProfileComplete} />;
      default:
        return <WelcomeSlide />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 bg-black/90 backdrop-blur-lg border border-white/10 text-white overflow-hidden">
        {/* Progress Indicator */}
        <div className="flex gap-1 p-4 pb-0">
          {Array.from({ length: totalSlides }, (_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-300",
                i <= currentSlide ? "bg-primary" : "bg-white/20"
              )}
            />
          ))}
        </div>

        {/* Slide Content */}
        <div className="min-h-[500px] p-6">
          {renderSlide()}
        </div>

        {/* Navigation Controls */}
        {currentSlide < 3 && (
          <div className="flex justify-between items-center p-6 pt-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="text-white/60 hover:text-white hover:bg-white/10"
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
                className="bg-primary hover:bg-primary/90"
              >
                Weiter
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};