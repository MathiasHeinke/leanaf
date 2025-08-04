import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useOnboardingState } from '@/hooks/useOnboardingState';

export const AdminOnboardingAccess = () => {
  const { forceShowOnboarding, isAdmin } = useOnboardingState();

  // Keyboard shortcut: Ctrl+Shift+O
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'O') {
        event.preventDefault();
        if (isAdmin) {
          forceShowOnboarding();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [forceShowOnboarding, isAdmin]);

  if (!isAdmin) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        variant="outline"
        size="sm"
        onClick={forceShowOnboarding}
        className="bg-background/80 backdrop-blur-sm border-2 border-primary/20 hover:border-primary/40"
        title="Admin: Onboarding anzeigen (Ctrl+Shift+O)"
      >
        🎯 Onboarding
      </Button>
    </div>
  );
};