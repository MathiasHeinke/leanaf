/**
 * useAresGreeting - Time-based greeting hook
 * Returns personalized greeting with user name and streak
 */

import { useMemo } from 'react';
import { useUserProfile } from './useUserProfile';
import { usePointsSystem } from './usePointsSystem';

interface UseAresGreetingReturn {
  greeting: string;
  userName: string;
  dayOfWeek: string;
  dateFormatted: string;
  streak: number | null;
  loading: boolean;
}

export function useAresGreeting(): UseAresGreetingReturn {
  const { profileData, isLoading: profileLoading } = useUserProfile();
  const { streaks } = usePointsSystem();

  // Smart loading: only "loading" if no cached data available
  const isActuallyLoading = profileLoading && !profileData;

  const result = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    
    // Time-based greeting
    let greeting = 'Guten Tag';
    if (hour < 5) greeting = 'Gute Nacht';
    else if (hour < 12) greeting = 'Guten Morgen';
    else if (hour < 17) greeting = 'Guten Tag';
    else if (hour < 21) greeting = 'Guten Abend';
    else greeting = 'Gute Nacht';

    // Day and date formatting
    const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    
    const dayOfWeek = dayNames[now.getDay()];
    const dateFormatted = `${now.getDate()}. ${monthNames[now.getMonth()]}`;

    // User name (prefer preferred_name, then display_name, then fallback)
    const userName = profileData?.preferred_name || 
                    profileData?.display_name || 
                    'Warrior';

    // Get longest active streak
    const activeStreak = streaks?.find(s => s.streak_type === 'daily_login');
    const streak = activeStreak?.current_streak || null;

    return {
      greeting,
      userName,
      dayOfWeek,
      dateFormatted,
      streak,
      loading: isActuallyLoading,
    };
  }, [profileData, streaks, isActuallyLoading]);

  return result;
}
