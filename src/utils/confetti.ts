import confetti from 'canvas-confetti';
import { isConfettiEnabled } from '@/hooks/useConfettiPreference';

/**
 * Spartan-style confetti - Gold & Silver theme
 * Fires from both sides for 3 seconds
 * Respects user preference - won't fire if disabled in profile
 */
export const triggerSpartanConfetti = () => {
  // Check user preference before firing
  if (!isConfettiEnabled()) {
    return;
  }

  const duration = 3000;
  const end = Date.now() + duration;

  // Gold & Silber - ARES Spartan Theme
  const colors = ['#fbbf24', '#f59e0b', '#94a3b8', '#ffffff'];

  (function frame() {
    // Von links
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: colors
    });
    // Von rechts
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: colors
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  }());
};
