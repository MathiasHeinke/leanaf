import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/schemas/user-profile';

interface ProfilesData {
  id: string;
  user_id: string;
  updated_at: string;
  created_at: string;
  // Core profile fields from profiles table
  display_name?: string;
  weight?: number;
  height?: number;
  age?: number;
  gender?: string;
  goal?: string;
  activity_level?: string;
  target_weight?: number;
  target_date?: string;
}

export const useUserProfile = () => {
  const [profileData, setProfileData] = useState<ProfilesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFirstAppStart, setIsFirstAppStart] = useState(false);
  const { user } = useAuth();

  const fetchProfile = async (retryCount = 0) => {
    if (!user) {
      setProfileData(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`🔄 Fetching profile for user ${user.id} (attempt ${retryCount + 1})`);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Profile fetch error:', error);
        throw error;
      }
      
      // Check if this is first app start (no profile exists)
      if (!data) {
        setIsFirstAppStart(true);
        console.log('🚀 First app start detected - no profile exists');
      } else {
        console.log('✅ Profile loaded successfully:', { 
          weight: data.weight, 
          height: data.height, 
          age: data.age, 
          gender: data.gender 
        });
      }
      
      setProfileData(data as ProfilesData);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch profile';
      
      // Retry once on failure
      if (retryCount < 1) {
        console.log('🔄 Retrying profile fetch...');
        setTimeout(() => fetchProfile(retryCount + 1), 1000);
        return;
      }
      
      setError(errorMessage);
      setProfileData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const convertToUserProfile = (profilesData?: ProfilesData): UserProfile | null => {
    if (!profilesData) return null;
    
    // Convert goal to valid enum value
    const validGoals = ['hypertrophy', 'strength', 'endurance', 'general'] as const;
    const goal = validGoals.includes(profilesData.goal as any) 
      ? (profilesData.goal as 'hypertrophy' | 'strength' | 'endurance' | 'general')
      : undefined;
    
    return {
      userId: profilesData.user_id,
      goal,
      experienceYears: undefined, // Not in profiles table, will need to be set via modal
      availableMinutes: undefined, // Not in profiles table, will need to be set via modal  
      weeklySessions: undefined, // Not in profiles table, will need to be set via modal
      injuries: undefined,
      preferences: undefined
    };
  };

  const missingRequired = (profilesData?: ProfilesData): boolean => {
    if (!profilesData) return true;
    
    // Core required fields from profiles table
    const hasBasicInfo = profilesData.weight && profilesData.height && profilesData.age && profilesData.gender;
    const hasGoal = profilesData.goal && profilesData.goal !== 'maintain';
    
    const missing = !hasBasicInfo || !hasGoal;
    
    if (missing) {
      console.log('❌ Missing required profile fields:', {
        weight: profilesData.weight ? '✅' : '❌',
        height: profilesData.height ? '✅' : '❌',
        age: profilesData.age ? '✅' : '❌',
        gender: profilesData.gender ? '✅' : '❌',
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
    if (missingRequired(profileData)) {
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
    profile: convertToUserProfile(profileData),
    profileData,
    isLoading,
    error,
    isFirstAppStart,
    missingRequired: missingRequired(profileData),
    isStale: isStale(profileData?.updated_at),
    shouldShowCheckUp: shouldShowCheckUp(),
    refreshProfile,
  };
};