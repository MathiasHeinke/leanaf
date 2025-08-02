import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/schemas/user-profile';

interface UserProfileData {
  user_id: string;
  profile: UserProfile;
  updated_at: string;
  created_at: string;
  id: string;
}

export const useUserProfile = () => {
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFirstAppStart, setIsFirstAppStart] = useState(false);
  const { user } = useAuth();

  const fetchProfile = async () => {
    if (!user) {
      setProfileData(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      // Check if this is first app start (no profile exists)
      if (!data) {
        setIsFirstAppStart(true);
        console.log('🚀 First app start detected - no profile exists');
      }
      
      setProfileData(data as UserProfileData);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      setProfileData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const missingRequired = (profile?: UserProfile | null): boolean => {
    if (!profile) return true;
    
    // Core required fields for training plan generation
    const hasExperience = profile.experienceYears !== undefined && profile.experienceYears !== null;
    const hasTime = profile.availableMinutes !== undefined && profile.availableMinutes !== null;
    const hasSessions = profile.weeklySessions !== undefined && profile.weeklySessions !== null;
    const hasGoal = profile.goal !== undefined && profile.goal !== null;
    
    const missing = !hasExperience || !hasTime || !hasSessions || !hasGoal;
    
    if (missing) {
      console.log('❌ Missing required profile fields:', {
        experienceYears: hasExperience ? '✅' : '❌',
        availableMinutes: hasTime ? '✅' : '❌', 
        weeklySessions: hasSessions ? '✅' : '❌',
        goal: hasGoal ? '✅' : '❌'
      });
    }
    
    return missing;
  };

  const isStale = (updatedAt?: string): boolean => {
    if (!updatedAt) return true;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const profileDate = new Date(updatedAt);
    const stale = profileDate < thirtyDaysAgo;
    
    if (stale) {
      console.log('⏰ Profile is stale:', {
        lastUpdate: profileDate.toLocaleDateString(),
        daysSince: Math.floor((Date.now() - profileDate.getTime()) / (1000 * 60 * 60 * 24))
      });
    }
    
    return stale;
  };

  const shouldShowCheckUp = (): boolean => {
    // First app start always shows modal
    if (isFirstAppStart) {
      console.log('🎯 ShowCheckUp: First app start');
      return true;
    }
    
    // No profile exists
    if (!profileData) {
      console.log('🎯 ShowCheckUp: No profile data');
      return true;
    }
    
    // Missing required fields
    if (missingRequired(profileData.profile)) {
      console.log('🎯 ShowCheckUp: Missing required fields');
      return true;
    }
    
    // Profile is stale (over 30 days old)
    if (isStale(profileData.updated_at)) {
      console.log('🎯 ShowCheckUp: Profile is stale');
      return true;
    }
    
    return false;
  };

  const refreshProfile = () => {
    console.log('🔄 Refreshing profile data...');
    fetchProfile();
  };

  return {
    profile: profileData?.profile,
    profileData,
    isLoading,
    error,
    isFirstAppStart,
    missingRequired: missingRequired(profileData?.profile),
    isStale: isStale(profileData?.updated_at),
    shouldShowCheckUp: shouldShowCheckUp(),
    refreshProfile,
  };
};