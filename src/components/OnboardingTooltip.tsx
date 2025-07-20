import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { OnboardingStep } from '@/hooks/useOnboarding';

interface OnboardingTooltipProps {
  targetElement: string;
  step: OnboardingStep;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
  isLastStep: boolean;
  isFirstStep: boolean;
}

interface TooltipPosition {
  top: number;
  left: number;
  position: 'top' | 'bottom' | 'left' | 'right';
  arrowPosition: { top?: number; left?: number; bottom?: number; right?: number };
}

export const OnboardingTooltip = ({
  targetElement,
  step,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onComplete,
  isLastStep,
  isFirstStep
}: OnboardingTooltipProps) => {
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);

  const calculatePosition = (): TooltipPosition | null => {
    const element = document.querySelector(targetElement) as HTMLElement;
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = 280;
    const tooltipHeight = 200; // Estimated height
    const arrowSize = 8;
    const padding = 16;

    let position: 'top' | 'bottom' | 'left' | 'right' = step.position || 'bottom';
    let top = 0;
    let left = 0;
    let arrowPosition = {};

    // Check if preferred position fits, otherwise adjust
    switch (position) {
      case 'top':
        if (rect.top - tooltipHeight - padding < 0) {
          position = 'bottom';
        }
        break;
      case 'bottom':
        if (rect.bottom + tooltipHeight + padding > viewportHeight) {
          position = 'top';
        }
        break;
      case 'left':
        if (rect.left - tooltipWidth - padding < 0) {
          position = 'right';
        }
        break;
      case 'right':
        if (rect.right + tooltipWidth + padding > viewportWidth) {
          position = 'left';
        }
        break;
    }

    // Calculate final position
    switch (position) {
      case 'top':
        top = rect.top - tooltipHeight - arrowSize - padding;
        left = Math.max(padding, Math.min(
          viewportWidth - tooltipWidth - padding,
          rect.left + rect.width / 2 - tooltipWidth / 2
        ));
        arrowPosition = {
          bottom: -arrowSize,
          left: Math.max(arrowSize, Math.min(
            tooltipWidth - arrowSize,
            rect.left + rect.width / 2 - left
          ))
        };
        break;
      case 'bottom':
        top = rect.bottom + arrowSize + padding;
        left = Math.max(padding, Math.min(
          viewportWidth - tooltipWidth - padding,
          rect.left + rect.width / 2 - tooltipWidth / 2
        ));
        arrowPosition = {
          top: -arrowSize,
          left: Math.max(arrowSize, Math.min(
            tooltipWidth - arrowSize,
            rect.left + rect.width / 2 - left
          ))
        };
        break;
      case 'left':
        top = Math.max(padding, Math.min(
          viewportHeight - tooltipHeight - padding,
          rect.top + rect.height / 2 - tooltipHeight / 2
        ));
        left = rect.left - tooltipWidth - arrowSize - padding;
        arrowPosition = {
          right: -arrowSize,
          top: Math.max(arrowSize, Math.min(
            tooltipHeight - arrowSize,
            rect.top + rect.height / 2 - top
          ))
        };
        break;
      case 'right':
        top = Math.max(padding, Math.min(
          viewportHeight - tooltipHeight - padding,
          rect.top + rect.height / 2 - tooltipHeight / 2
        ));
        left = rect.right + arrowSize + padding;
        arrowPosition = {
          left: -arrowSize,
          top: Math.max(arrowSize, Math.min(
            tooltipHeight - arrowSize,
            rect.top + rect.height / 2 - top
          ))
        };
        break;
    }

    return { top, left, position, arrowPosition };
  };

  useEffect(() => {
    const updatePosition = () => {
      const position = calculatePosition();
      setTooltipPosition(position);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [targetElement, step.position]);

  if (!tooltipPosition) return null;

  const handleNext = () => {
    if (step.action) {
      step.action();
    }
    onNext();
  };

  return (
    <div
      className="absolute z-[9999]"
      style={{
        top: tooltipPosition.top,
        left: tooltipPosition.left,
        width: 280
      }}
    >
      <Card className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-2 border-primary/20 shadow-2xl animate-scale-in">
        {/* Arrow */}
        <div
          className="absolute w-0 h-0 border-8"
          style={{
            ...tooltipPosition.arrowPosition,
            borderColor: tooltipPosition.position === 'top' ? 'transparent transparent hsl(var(--primary)/0.2) transparent' :
                         tooltipPosition.position === 'bottom' ? 'hsl(var(--primary)/0.2) transparent transparent transparent' :
                         tooltipPosition.position === 'left' ? 'transparent hsl(var(--primary)/0.2) transparent transparent' :
                         'transparent transparent transparent hsl(var(--primary)/0.2)'
          }}
        />
        
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 bg-gradient-to-r from-primary to-primary-glow rounded-full flex items-center justify-center">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {currentStep + 1} / {totalSteps}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mb-3">
            <div 
              className="bg-gradient-to-r from-primary to-primary-glow h-1 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>

          {/* Content */}
          <div className="space-y-2 mb-4">
            <h3 className="text-sm font-bold text-foreground">
              {step.title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div>
              {!isFirstStep && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPrev}
                  className="h-7 text-xs px-2"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Zurück
                </Button>
              )}
            </div>
            
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="h-7 text-xs px-2 text-muted-foreground"
              >
                Überspringen
              </Button>
              
              <Button
                size="sm"
                onClick={isLastStep ? onComplete : handleNext}
                className="h-7 text-xs px-2 bg-gradient-to-r from-primary to-primary-glow"
              >
                {isLastStep ? 'Fertig' : 'Weiter'}
                {!isLastStep && <ArrowRight className="h-3 w-3 ml-1" />}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};