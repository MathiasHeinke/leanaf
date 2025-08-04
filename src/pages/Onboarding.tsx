import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { WelcomeSlide } from '@/components/onboarding/WelcomeSlide';
import { BenefitsSlide } from '@/components/onboarding/BenefitsSlide';
import { PremiumSlide } from '@/components/onboarding/PremiumSlide';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingState } from '@/hooks/useOnboardingState';

export default function OnboardingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { completeInteractiveOnboarding, isAdmin } = useOnboardingState();
  
  const isAdminAccess = searchParams.get('admin') === 'true' && isAdmin;

  const slides = [
    { component: WelcomeSlide },
    { component: BenefitsSlide },
    { component: PremiumSlide }
  ];

  // Touch/swipe handling
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentSlide < slides.length - 1) {
      nextSlide();
    }
    if (isRightSwipe && currentSlide > 0) {
      prevSlide();
    }
  };

  const nextSlide = () => {
    if (currentSlide < slides.length - 1 && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentSlide(prev => prev + 1);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0 && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentSlide(prev => prev - 1);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  const goToSlide = (index: number) => {
    if (index !== currentSlide && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentSlide(index);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  const handleComplete = () => {
    completeInteractiveOnboarding();
    navigate('/profile');
  };

  const handleSkip = () => {
    completeInteractiveOnboarding();
    navigate('/profile');
  };

  // Redirect if user not found
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    // Log admin access for debugging
    if (isAdminAccess) {
      console.log('Admin accessing onboarding with override');
    }
  }, [user, navigate, isAdminAccess]);

  if (!user) {
    return null;
  }

  const CurrentSlideComponent = slides[currentSlide].component;

  return (
    <div className="h-screen bg-gradient-to-br from-background via-background to-muted flex flex-col overflow-hidden">
      {/* Progress Indicators */}
      <div className="flex justify-center gap-2 pt-8 pb-4 px-4">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentSlide 
                ? 'w-8 bg-primary' 
                : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
            }`}
          />
        ))}
      </div>

      {/* Slides Container */}
      <div 
        className="flex-1 flex overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div 
          className={`flex w-full h-full transition-transform duration-300 ease-out ${
            isTransitioning ? 'pointer-events-none' : ''
          }`}
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <div
              key={index}
              className="w-full h-full flex-shrink-0 flex items-center justify-center p-6"
            >
              <div className="w-full max-w-lg mx-auto">
                <slide.component onComplete={handleComplete} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex justify-between items-center p-6 bg-background/80 backdrop-blur-sm">
        {/* Back Button */}
        {currentSlide > 0 ? (
          <button
            onClick={prevSlide}
            className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            Zurück
          </button>
        ) : (
          <div />
        )}

        {/* Skip/Next Button */}
        {currentSlide < slides.length - 1 ? (
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              Überspringen
            </button>
            <button
              onClick={nextSlide}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Weiter
            </button>
          </div>
        ) : (
          <button
            onClick={handleComplete}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Profil vervollständigen
          </button>
        )}
      </div>

      {/* Swipe Hint for Mobile */}
      <div className="block sm:hidden text-center pb-2">
        <p className="text-xs text-muted-foreground">
          ← Wischen für Navigation →
        </p>
      </div>
    </div>
  );
}