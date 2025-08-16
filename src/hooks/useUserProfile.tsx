import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ProfilesData {
  id?: string;
  user_id: string;
  display_name?: string | null;
  weight?: number | null;
  height?: number | null;
  age?: number | null;
  gender?: string | null;
  goal?: string | null;
  activity_level?: string | null;
  dietary_restrictions?: string[] | null;
  health_conditions?: string[] | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: any; // Allow additional fields from database
}

export interface UserProfile {
  userId: string;
  goal?: 'hypertrophy' | 'strength' | 'endurance' | 'general';
  experienceYears?: number;
  availableMinutes?: number;
  weeklySessions?: number;
  injuries?: string[];
  preferences?: Record<string, any>;
}

export const useUserProfile = () => {
  const { user, session, isSessionReady } = useAuth();
  const [profileData, setProfileData] = useState<ProfilesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFirstAppStart, setIsFirstAppStart] = useState(false);
  
  // Refresh counter to force re-fetch when needed
  const [refreshCounter, setRefreshCounter] = useState(0);

  // STABLE SESSION-READY CHECK
  useEffect(() => {
    if (isSessionReady && user?.id && session?.access_token) {
      console.log('🔄 Starting profile fetch for verified user session:', {
        userId: user.id,
        email: user.email,
        hasAccessToken: !!session.access_token
      });
      fetchProfile();
    } else {
      console.log('⏳ Waiting for stable auth session...', {
        hasUser: !!user,
        hasUserId: !!user?.id,
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        isSessionReady
      });
      
      // Clear profile data if we lose auth
      if (!user?.id && profileData) {
        console.log('🧹 Clearing profile data due to lost auth');
        setProfileData(null);
        setIsFirstAppStart(false);
      }
    }
  }, [user?.id, session?.access_token, isSessionReady, refreshCounter]);

  const fetchProfile = async () => {
    if (!user?.id || !session?.access_token) {
      console.log('❌ Cannot fetch profile: missing user or session');
      return;
    }

    console.log('🔍 Fetching profile for user:', user.id);
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ Profile fetch error:', error);
        setError(error.message);
        return;
      }

      console.log('✅ Profile fetch result:', { found: !!data, data });
      setProfileData(data as ProfilesData);
      
      // Auto-create profile for new users
      if (!data) {
        console.log('🆕 No profile found, creating default profile...');
        await createDefaultProfile();
      }
      
      setIsFirstAppStart(!data);
    } catch (err: any) {
      console.error('❌ Profile fetch exception:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultProfile = async () => {
    if (!user?.id) return;

    try {
      const defaultProfile = {
        user_id: user.id,
        display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        // Leave other fields null for now - user will fill them in onboarding
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert(defaultProfile)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating default profile:', error);
        return;
      }

      console.log('✅ Default profile created:', data);
      setProfileData(data as ProfilesData);
    } catch (err) {
      console.error('❌ Exception creating default profile:', err);
    }
  };

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
    
    // Only consider truly essential fields as "missing"
    // Let user gradually fill in their profile
    return !profilesData.user_id;
  };

  const isStale = (updatedAt?: string): boolean => {
    if (!updatedAt) return false;
    
    const lastUpdate = new Date(updatedAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return lastUpdate < thirtyDaysAgo;
  };

  const shouldShowCheckUp = (): boolean => {
    // For now, return false - user can update profile manually
    return false;
  };

  const refreshProfile = () => {
    console.log('🔄 Manual profile refresh triggered');
    setRefreshCounter(prev => prev + 1);
  };

  // Computed values
  const profile = convertToUserProfile(profileData);
  const hasMissingRequiredFields = missingRequired(profileData);
  const isProfileStale = isStale(profileData?.updated_at);
  const needsCheckUp = shouldShowCheckUp();

  return {
    // Raw profile data from database
    profileData,
    
    // Computed/processed profile
    profile,
    
    // Loading and error states
    isLoading,
    error,
    
    // Profile state flags
    isFirstAppStart,
    hasMissingRequiredFields,
    isProfileStale,
    needsCheckUp,
    
    // Actions
    refreshProfile
  };
};