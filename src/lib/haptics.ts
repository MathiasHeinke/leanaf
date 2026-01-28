/**
 * Haptic Feedback Utility
 * Provides tactile feedback for mobile devices
 */

export const haptics = {
  /** Light tap - 10ms - for minor interactions */
  light: () => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  },
  
  /** Medium tap - 50ms - for button clicks, completions */
  medium: () => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  },
  
  /** Heavy tap - 100ms - for important actions */
  heavy: () => {
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  },
  
  /** Success pattern - short-pause-short */
  success: () => {
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50]);
    }
  },
  
  /** Error pattern - long-pause-long */
  error: () => {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  },
  
  /** Warning pattern - short pulse */
  warning: () => {
    if (navigator.vibrate) {
      navigator.vibrate([30, 20, 30, 20, 30]);
    }
  },
};

export default haptics;
