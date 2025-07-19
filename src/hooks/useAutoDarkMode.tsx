
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

interface AutoDarkModeSettings {
  enabled: boolean;
  startTime: string; // "19:00"
  endTime: string;   // "07:00"
}

export const useAutoDarkMode = () => {
  const { theme, setTheme, systemTheme } = useTheme();
  const [autoSettings, setAutoSettings] = useState<AutoDarkModeSettings>({
    enabled: true,
    startTime: '19:00',
    endTime: '07:00'
  });
  const [userOverride, setUserOverride] = useState<string | null>(null);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('autoDarkModeSettings');
    if (savedSettings) {
      setAutoSettings(JSON.parse(savedSettings));
    }
    
    const savedOverride = localStorage.getItem('darkModeUserOverride');
    if (savedOverride) {
      setUserOverride(savedOverride);
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = (settings: AutoDarkModeSettings) => {
    setAutoSettings(settings);
    localStorage.setItem('autoDarkModeSettings', JSON.stringify(settings));
  };

  // Check if current time is within dark mode hours
  const isWithinDarkModeHours = (): boolean => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = autoSettings.startTime.split(':').map(Number);
    const [endHour, endMinute] = autoSettings.endTime.split(':').map(Number);
    
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    // Handle overnight period (e.g., 19:00 to 07:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime < endTime;
    } else {
      return currentTime >= startTime && currentTime < endTime;
    }
  };

  // Auto-apply theme based on time
  useEffect(() => {
    if (!autoSettings.enabled || userOverride) return;

    const shouldBeDark = isWithinDarkModeHours();
    const targetTheme = shouldBeDark ? 'dark' : 'light';
    
    if (theme !== targetTheme) {
      setTheme(targetTheme);
    }

    // Set up interval to check every minute
    const interval = setInterval(() => {
      const shouldBeDarkNow = isWithinDarkModeHours();
      const targetThemeNow = shouldBeDarkNow ? 'dark' : 'light';
      
      if (theme !== targetThemeNow && !userOverride) {
        setTheme(targetThemeNow);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [autoSettings, theme, setTheme, userOverride]);

  // Handle manual theme toggle
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    
    // Set user override
    setUserOverride(newTheme);
    localStorage.setItem('darkModeUserOverride', newTheme);
    
    // Clear override after 24 hours
    setTimeout(() => {
      setUserOverride(null);
      localStorage.removeItem('darkModeUserOverride');
    }, 24 * 60 * 60 * 1000);
  };

  // Clear user override
  const clearUserOverride = () => {
    setUserOverride(null);
    localStorage.removeItem('darkModeUserOverride');
  };

  // Get current theme status
  const getThemeStatus = () => {
    if (userOverride) {
      return {
        current: theme,
        isAuto: false,
        reason: 'user_override',
        willAutoChange: true,
        nextChange: '24 hours'
      };
    }

    if (!autoSettings.enabled) {
      return {
        current: theme,
        isAuto: false,
        reason: 'auto_disabled',
        willAutoChange: false
      };
    }

    const isInDarkHours = isWithinDarkModeHours();
    return {
      current: theme,
      isAuto: true,
      reason: isInDarkHours ? 'auto_dark_hours' : 'auto_light_hours',
      willAutoChange: true,
      nextChange: isInDarkHours ? autoSettings.endTime : autoSettings.startTime
    };
  };

  return {
    autoSettings,
    userOverride,
    isWithinDarkModeHours: isWithinDarkModeHours(),
    saveSettings,
    toggleTheme,
    clearUserOverride,
    getThemeStatus
  };
};
