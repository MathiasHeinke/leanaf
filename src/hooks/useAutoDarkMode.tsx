
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

interface AutoDarkModeSettings {
  enabled: boolean;
  startTime: string; // "19:00"
  endTime: string;   // "07:00"
}

interface UserOverrideData {
  theme: string;
  timestamp: number;
  expiresAt: number;
}

export const useAutoDarkMode = () => {
  const { theme, setTheme, systemTheme, resolvedTheme } = useTheme();
  const [autoSettings, setAutoSettings] = useState<AutoDarkModeSettings>({
    enabled: true,
    startTime: '19:00',
    endTime: '07:00'
  });
  const [userOverride, setUserOverride] = useState<UserOverrideData | null>(null);
  const [debugMode] = useState(true); // Enable debugging
  const [isToggling, setIsToggling] = useState(false); // Prevent race conditions

  // Debug logging helper - only log on actual changes
  const debugLog = (message: string, data?: any, forceLog = false) => {
    if (debugMode && (forceLog || message.includes('change') || message.includes('toggle'))) {
      console.log(`[DarkMode Debug] ${message}`, data || '', {
        theme,
        resolvedTheme,
        systemTheme,
        htmlClass: document.documentElement.className,
        isToggling
      });
    }
  };

  // Load settings from localStorage
  useEffect(() => {
    debugLog('Loading settings from localStorage');
    
    const savedSettings = localStorage.getItem('autoDarkModeSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setAutoSettings(parsed);
      debugLog('Loaded auto settings:', parsed);
    }
    
    // Check for valid userOverride with timestamp
    const savedOverride = localStorage.getItem('darkModeUserOverride');
    if (savedOverride) {
      try {
        const overrideData: UserOverrideData = JSON.parse(savedOverride);
        const now = Date.now();
        
        if (now < overrideData.expiresAt) {
          setUserOverride(overrideData);
          debugLog('Loaded valid user override:', {
            theme: overrideData.theme,
            remainingHours: Math.round((overrideData.expiresAt - now) / (1000 * 60 * 60))
          });
        } else {
          localStorage.removeItem('darkModeUserOverride');
          debugLog('User override expired, removed from storage');
        }
      } catch (error) {
        debugLog('Invalid user override data, removing:', error);
        localStorage.removeItem('darkModeUserOverride');
      }
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = (settings: AutoDarkModeSettings) => {
    setAutoSettings(settings);
    localStorage.setItem('autoDarkModeSettings', JSON.stringify(settings));
    debugLog('Saved auto settings:', settings);
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

    let withinHours: boolean;
    // Handle overnight period (e.g., 19:00 to 07:00)
    if (startTime > endTime) {
      withinHours = currentTime >= startTime || currentTime < endTime;
    } else {
      withinHours = currentTime >= startTime && currentTime < endTime;
    }

    // Only log time checks when debug is forced, not every call
    debugLog('Time check:', {
      currentTime: `${currentHour}:${currentMinute.toString().padStart(2, '0')}`,
      startTime: autoSettings.startTime,
      endTime: autoSettings.endTime,
      withinHours
    }, false);

    return withinHours;
  };

  // Auto-apply theme based on time with race condition prevention
  useEffect(() => {
    // Skip auto-theme during manual toggling
    if (isToggling) {
      debugLog('Skipping auto-theme during manual toggle');
      return;
    }

    if (!autoSettings.enabled || userOverride) {
      debugLog('Auto-theme disabled:', { 
        autoEnabled: autoSettings.enabled, 
        hasUserOverride: !!userOverride,
        isToggling 
      });
      return;
    }

    const applyAutoTheme = () => {
      const shouldBeDark = isWithinDarkModeHours();
      const targetTheme = shouldBeDark ? 'dark' : 'light';
      
      if (theme !== targetTheme) {
        debugLog('Applying auto theme change:', {
          from: theme,
          to: targetTheme,
          reason: shouldBeDark ? 'within dark hours' : 'outside dark hours',
          isToggling
        });
        setTheme(targetTheme);
      }
    };

    // Apply immediately with debouncing
    const timeoutId = setTimeout(() => {
      if (!isToggling && !userOverride && autoSettings.enabled) {
        applyAutoTheme();
      }
    }, 100); // Small delay to allow state updates

    // Set up interval to check every hour (reduced from 1 minute for performance)
    const interval = setInterval(() => {
      if (!isToggling && !userOverride && autoSettings.enabled) {
        applyAutoTheme();
      }
    }, 3600000); // 1 hour instead of 1 minute

    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [autoSettings.enabled, setTheme, userOverride, isToggling]); // Removed theme dependency to prevent race condition

  // Debug effect to track theme changes
  useEffect(() => {
    debugLog('Theme state changed:', {
      theme,
      resolvedTheme,
      userOverride: !!userOverride,
      autoEnabled: autoSettings.enabled,
      isToggling
    });
  }, [theme, resolvedTheme, userOverride, autoSettings.enabled, isToggling]);

  // Handle manual theme toggle with race condition prevention
  const toggleTheme = async () => {
    const currentTheme = resolvedTheme || theme || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    debugLog('Manual theme toggle START:', {
      theme,
      resolvedTheme,
      currentTheme,
      targetTheme: newTheme,
      previousOverride: userOverride
    });
    
    // Set toggle flag to prevent race conditions
    setIsToggling(true);
    
    try {
      // Create user override FIRST with immediate state update
      const now = Date.now();
      const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours
      const overrideData: UserOverrideData = {
        theme: newTheme,
        timestamp: now,
        expiresAt
      };
      
      // Set user override immediately in both state and localStorage
      setUserOverride(overrideData);
      localStorage.setItem('darkModeUserOverride', JSON.stringify(overrideData));
      
      debugLog('User override set, applying theme:', {
        overrideData,
        aboutToSetTheme: newTheme
      });
      
      // Small delay to ensure state is synchronized
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Then set the theme
      setTheme(newTheme);
      
      debugLog('Manual theme toggle COMPLETE:', {
        setTheme: newTheme,
        overrideSet: true,
        expiresIn: '24 hours'
      });
      
    } finally {
      // Reset toggle flag after a short delay to ensure theme is applied
      setTimeout(() => {
        setIsToggling(false);
        debugLog('Toggle flag reset, auto-theme can resume');
      }, 500);
    }
  };

  // Clear user override
  const clearUserOverride = () => {
    debugLog('Clearing user override');
    setUserOverride(null);
    localStorage.removeItem('darkModeUserOverride');
  };

  // Get current theme status with detailed info
  const getThemeStatus = () => {
    if (userOverride) {
      const remainingHours = Math.round((userOverride.expiresAt - Date.now()) / (1000 * 60 * 60));
      return {
        current: theme,
        isAuto: false,
        reason: 'user_override',
        willAutoChange: true,
        nextChange: `${remainingHours}h`,
        override: userOverride
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

  // Get theme icon based on current state
  const getThemeIcon = () => {
    const status = getThemeStatus();
    
    if (status.isAuto && isWithinDarkModeHours()) {
      return 'clock'; // Auto mode during dark hours
    }
    
    if (userOverride) {
      return theme === 'dark' ? 'sun-override' : 'moon-override';
    }
    
    return theme === 'dark' ? 'sun' : 'moon';
  };

  return {
    autoSettings,
    userOverride,
    isWithinDarkModeHours: isWithinDarkModeHours(),
    saveSettings,
    toggleTheme,
    clearUserOverride,
    getThemeStatus,
    getThemeIcon,
    debugLog, // Export for external debugging
    isToggling // Export for debugging
  };
};
