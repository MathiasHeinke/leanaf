
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { AresProfileLoader } from '@/utils/aresProfileLoader';

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
  preferences?: Record<string, unknown>;
}

export const useUserProfile = () => {
  const { user, session, isSessionReady } = useAuth();
  const [profileData, setProfileData] = useState<ProfilesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFirstAppStart, setIsFirstAppStart] = useState(false);
  
  // Refresh counter to force re-fetch when needed
  const [refreshCounter, setRefreshCounter] = useState(0);
  
  // AbortController for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  const ensureDefaultProfile = useCallback(async (uid: string, email?: string | null) => {
    const display = email?.split("@")[0] ?? "";
    const { data, error } = await supabase
      .from("profiles")
      .upsert({ user_id: uid, display_name: display }, { onConflict: "user_id" })
      .select()
      .single();
    
    if (error) {
      console.warn("ensureDefaultProfile error", error);
      return null;
    }
    
    console.log('✅ Profile ensured (upsert):', data);
    return data;
  }, []);

  const createDefaultProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      const profile = await ensureDefaultProfile(user.id, user.email);
      if (profile) {
        setProfileData(profile as ProfilesData);
      }
    } catch (err) {
      console.error('❌ Exception creating default profile:', err);
    }
  }, [user?.id, user?.email, ensureDefaultProfile]);

  const fetchProfile = useCallback(async () => {
    if (!user?.id || !session?.access_token) {
      console.log('❌ Cannot fetch profile: missing user or session');
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    console.log('🔍 Fetching profile for user:', user.id);
    setIsLoading(true);
    setError(null);

    // 1) DB-side identity sanity check via RPC (helps diagnose RLS/auth context)
    try {
      const { data: myUid, error: rpcError } = await supabase.rpc('get_my_uid');
      console.log('🧪 DB auth.uid() via RPC:', { myUid, matchesClientUser: myUid === user.id, rpcError });
    } catch (e) {
      console.warn('⚠️ RPC get_my_uid failed (non-critical):', e);
    }

    try {
      // Check if request was aborted
      if (abortController.signal.aborted) return;

      // 2) Primary path: direct table access under user token
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ Profile fetch error (direct):', error);

        // 2a) Fallback: ARES Edge Function bypass if RLS/timing issues suspected
        if (session?.access_token && !abortController.signal.aborted) {
          console.log('🚀 Trying ARES fallback after direct error...');
          const result = await AresProfileLoader.loadUserProfile(user.id, session.access_token, 1);
          if (result.data) {
            console.log('✅ ARES fallback succeeded (profile found):', {
              profile_id: result.data.id,
              display_name: result.data.display_name
            });
            if (!abortController.signal.aborted) {
              setProfileData(result.data as ProfilesData);
              setIsFirstAppStart(false);
              setIsLoading(false);
            }
            return;
          }
          if (result.error) {
            console.error('❌ ARES fallback failed:', result.error);
          }
        }

        if (!abortController.signal.aborted) {
          setError(error.message);
        }
        return;
      }

      console.log('✅ Profile fetch result (direct):', { found: !!data, data });
      if (data) {
        if (!abortController.signal.aborted) {
          setProfileData(data as ProfilesData);
          setIsFirstAppStart(false);
        }
      } else {
        // 2b) If no data (could be first-time user or eventual consistency), try ARES fallback before creating
        if (session?.access_token && !abortController.signal.aborted) {
          console.log('ℹ️ No direct profile found. Trying ARES fallback before creating default profile...');
          const result = await AresProfileLoader.loadUserProfile(user.id, session.access_token, 1);
          if (result.data) {
            console.log('✅ ARES fallback found existing profile:', {
              profile_id: result.data.id,
              display_name: result.data.display_name
            });
            if (!abortController.signal.aborted) {
              setProfileData(result.data as ProfilesData);
              setIsFirstAppStart(false);
            }
            return;
          }
        }

        if (!abortController.signal.aborted) {
          console.log('🆕 No profile found anywhere, ensuring default profile...');
          const profile = await ensureDefaultProfile(user.id, user.email);
          if (profile) {
            setProfileData(profile as ProfilesData);
          }
          setIsFirstAppStart(true);
        }
      }
    } catch (err: any) {
      if (!abortController.signal.aborted) {
        console.error('❌ Profile fetch exception:', err);
        // FAIL-SAFE: Create a fallback profile even on error
        const fallbackProfile = await ensureDefaultProfile(user.id, user.email);
        if (fallbackProfile) {
          setProfileData(fallbackProfile as ProfilesData);
        }
        setError(err.message || 'Failed to load profile');
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [user?.id, session?.access_token, createDefaultProfile]);

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
    
    // Cleanup abort controller on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchProfile, isSessionReady, refreshCounter]);

  // Realtime subscription for profile changes
  useEffect(() => {
    if (!user?.id) return;
    
    const channel = supabase
      .channel('profiles-self')
      .on('postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'profiles', 
          filter: `user_id=eq.${user.id}` 
        },
        (payload) => {
          console.log('🔄 Profile realtime update:', payload);
          if (payload.new && typeof payload.new === 'object') {
            setProfileData(payload.new as ProfilesData);
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

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
