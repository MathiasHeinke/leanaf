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
  const { user } = useAuth();

  const fetchProfile = async () => {
    if (!user) {
      setProfileData(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setProfileData(data as UserProfileData);
      setError(null);
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
    return !profile.experienceYears || !profile.availableMinutes || !profile.weeklySessions || !profile.goal;
  };

  const isStale = (updatedAt?: string): boolean => {
    if (!updatedAt) return true;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(updatedAt) < thirtyDaysAgo;
  };

  const shouldShowCheckUp = (): boolean => {
    if (!profileData) return true; // No profile exists
    if (missingRequired(profileData.profile)) return true; // Missing required fields
    if (isStale(profileData.updated_at)) return true; // Profile is stale
    return false;
  };

  const refreshProfile = () => {
    fetchProfile();
  };

  return {
    profile: profileData?.profile,
    profileData,
    isLoading,
    error,
    missingRequired: missingRequired(profileData?.profile),
    isStale: isStale(profileData?.updated_at),
    shouldShowCheckUp: shouldShowCheckUp(),
    refreshProfile,
  };
};