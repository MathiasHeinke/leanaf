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
  const { user, session, isSessionReady, authDebugInfo } = useAuth();

  const fetchProfile = async () => {
    // PHASE 1: Session Validation - Wait for complete auth session
    if (!user || !session || !isSessionReady) {
      console.log('⏳ Waiting for complete auth session...', {
        hasUser: !!user,
        hasSession: !!session,
        isSessionReady,
        authDebugInfo
      });
      setProfileData(null);
      setIsLoading(false);
      return;
    }

    // Session context OK - direct profile loading

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🎯 Profile loading starting...', {
        userId: user.id,
        email: user.email
      });
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('❌ Profile load failed:', error);
        setError(error.message);
        setProfileData(null);
        return;
      }
      
      if (!data) {
        setIsFirstAppStart(true);
        console.log('🚀 First app start detected - no profile exists for user:', user.email);
        setProfileData(null);
      } else {
        setIsFirstAppStart(false);
        console.log('✅ Profile loaded successfully for user:', user.email, { 
          profile_id: data.id,
          display_name: data.display_name,
          weight: data.weight, 
          height: data.height, 
          age: data.age, 
          gender: data.gender,
          goal: data.goal
        });
        setProfileData(data as ProfilesData);
      }
    } catch (err) {
      console.error('🚨 Unexpected Profile Loading Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unexpected error occurred';
      setError(`❌ Unexpected error: ${errorMessage}`);
      setProfileData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // PHASE 6: Session-Synchronized Profile Loading
  useEffect(() => {
    if (user && session && isSessionReady) {
      console.log('🚀 Profile loading triggered by complete session');
      fetchProfile();
    } else {
      console.log('⏳ Waiting for complete auth session...', {
        hasUser: !!user,
        hasSession: !!session,
        isSessionReady
      });
    }
  }, [user?.id, session?.access_token, isSessionReady]);

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
    // KOMPLETT DEAKTIVIERT - Kein automatisches Onboarding
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