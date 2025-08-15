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

  const fetchProfile = async (retryCount = 0) => {
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

    // PHASE 2: JWT Session Timing - Add delay for JWT settling
    if (retryCount === 0) {
      console.log('🔐 JWT Session settling delay (200ms)...');
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`🔄 ARES Profile Loading (attempt ${retryCount + 1})`, {
        userId: user.id,
        email: user.email,
        hasAccessToken: !!session.access_token,
        sessionUserId: session.user?.id,
        sessionMatch: user.id === session.user?.id
      });
      
      // PHASE 3: RLS-Ready Database Query with Debug
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ RLS Policy Error detected:', {
          error: error.message,
          code: error.code,
          hint: error.hint,
          authDebugInfo,
          retryCount
        });
        throw error;
      }
      
      // Check if this is first app start (no profile exists)
      if (!data) {
        setIsFirstAppStart(true);
        console.log('🚀 First app start detected - no profile exists for user:', user.email);
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
      }
      
      setProfileData(data as ProfilesData);
    } catch (err) {
      console.error('🚨 ARES Profile Loading Error:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        retryCount,
        authDebugInfo,
        isRLSError: err instanceof Error && err.message.includes('row-level security')
      });
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch profile';
      
      // PHASE 4: Production-Ready Retry with RLS Detection
      if (retryCount < 3) { // Increased retries
        const retryDelay = Math.pow(2, retryCount) * 500; // 500ms, 1s, 2s
        console.log(`🔄 ARES Retry ${retryCount + 1}/3 in ${retryDelay}ms...`);
        setTimeout(() => fetchProfile(retryCount + 1), retryDelay);
        return;
      }
      
      // PHASE 5: RLS Failure Detection & Fallback Strategy
      if (errorMessage.includes('row-level security') || errorMessage.includes('permission denied')) {
        console.error('🛡️ RLS Policy blocking access - auth.uid() might be null');
        setError('🚨 Profile blocked by RLS - Session timing issue detected');
      } else {
        setError(`❌ Profile loading failed: ${errorMessage}`);
      }
      setProfileData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // PHASE 6: Session-Synchronized Profile Loading
  useEffect(() => {
    if (user && session && isSessionReady) {
      console.log('🚀 ARES Profile Loading triggered by complete session');
      fetchProfile();
    } else {
      console.log('⏳ ARES waiting for complete auth session...', {
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
    // Deactivated automatic check-up triggers
    // Users can manually open the modal if needed
    return false;
    
    // OLD LOGIC (commented out):
    // // First app start always shows modal
    // if (isFirstAppStart) {
    //   console.log('🎯 ShowCheckUp: First app start');
    //   return true;
    // }
    // 
    // // No profile exists
    // if (!profileData) {
    //   console.log('🎯 ShowCheckUp: No profile data');
    //   return true;
    // }
    // 
    // // Missing required fields
    // if (missingRequired(profileData)) {
    //   console.log('🎯 ShowCheckUp: Missing required fields');
    //   return true;
    // }
    // 
    // // Profile is stale (over 30 days old)
    // if (isStale(profileData.updated_at)) {
    //   console.log('🎯 ShowCheckUp: Profile is stale');
    //   return true;
    // }
    // 
    // return false;
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