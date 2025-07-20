import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface OnboardingSpotlightProps {
  targetElement: string;
  isActive: boolean;
  children: React.ReactNode;
}

export const OnboardingSpotlight = ({ targetElement, isActive, children }: OnboardingSpotlightProps) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!isActive || !targetElement) return;

    const updateTargetRect = () => {
      const element = document.querySelector(targetElement) as HTMLElement;
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        
        // Add highlight class
        element.classList.add('onboarding-highlight', 'onboarding-highlight-action');
        
        // Scroll to element if not visible
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }
    };

    updateTargetRect();
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect);

    return () => {
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect);
      
      // Remove highlight classes
      const element = document.querySelector(targetElement) as HTMLElement;
      if (element) {
        element.classList.remove('onboarding-highlight', 'onboarding-highlight-action');
      }
    };
  }, [targetElement, isActive]);

  if (!isActive || !targetRect) return null;

  const spotlightRadius = 8; // Border radius for the spotlight
  const padding = 8; // Extra space around the element

  return createPortal(
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      {/* Dark overlay with spotlight cutout */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{
          clipPath: `polygon(
            0% 0%, 
            0% 100%, 
            ${targetRect.left - padding}px 100%, 
            ${targetRect.left - padding}px ${targetRect.top - padding}px, 
            ${targetRect.right + padding}px ${targetRect.top - padding}px, 
            ${targetRect.right + padding}px ${targetRect.bottom + padding}px, 
            ${targetRect.left - padding}px ${targetRect.bottom + padding}px, 
            ${targetRect.left - padding}px 100%, 
            100% 100%, 
            100% 0%
          )`
        }}
      />
      
      {/* Tooltip container */}
      <div className="absolute inset-0 pointer-events-auto">
        {children}
      </div>
    </div>,
    document.body
  );
};