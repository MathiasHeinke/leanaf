import { useState, useCallback } from 'react';

export const useVoiceOverlay = () => {
  const [isVoiceOverlayOpen, setIsVoiceOverlayOpen] = useState(false);

  const openVoiceOverlay = useCallback(() => {
    setIsVoiceOverlayOpen(true);
  }, []);

  const closeVoiceOverlay = useCallback(() => {
    setIsVoiceOverlayOpen(false);
  }, []);

  return {
    isVoiceOverlayOpen,
    openVoiceOverlay,
    closeVoiceOverlay,
  };
};