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

  // Floating onboarding badge removed; keep admin keyboard shortcut (Ctrl+Shift+O)
  return null;
};