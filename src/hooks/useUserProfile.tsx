/**
 * useUserProfile - Instant Profile Cache with React Query + localStorage
 * 
 * Provides 0ms data access via localStorage placeholderData,
 * with background sync to Supabase and React Query caching for cross-route persistence.
 */

import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { AresProfileLoader } from '@/utils/aresProfileLoader';
import { QUERY_KEYS } from '@/constants/queryKeys';

// ============= Types =============

export interface ProfilesData {
  id?: string;
  user_id: string;
  display_name?: string | null;
  preferred_name?: string | null;
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
  [key: string]: any;
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

// ============= localStorage Helpers =============

const LOCAL_STORAGE_KEY = 'ares_user_profile';

const getStoredProfile = (): ProfilesData | null => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.user_id) return parsed;
    }
  } catch { /* ignore corrupt data */ }
  return null;
};

const storeProfile = (data: ProfilesData) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded etc */ }
};

const clearStoredProfile = () => {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch { /* ignore */ }
};

// ============= Helper Functions =============

const convertToUserProfile = (profilesData?: ProfilesData | null): UserProfile | null => {
  if (!profilesData) return null;
  
  const validGoals = ['hypertrophy', 'strength', 'endurance', 'general'] as const;
  const goal = validGoals.includes(profilesData.goal as any) 
    ? (profilesData.goal as 'hypertrophy' | 'strength' | 'endurance' | 'general')
    : undefined;
  
  return {
    userId: profilesData.user_id,
    goal,
    experienceYears: undefined,
    availableMinutes: undefined,
    weeklySessions: undefined,
    injuries: undefined,
    preferences: undefined
  };
};

const missingRequired = (profilesData?: ProfilesData | null): boolean => {
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

// ============= Main Hook =============

export const useUserProfile = () => {
  const { user, session, isSessionReady } = useAuth();
  const queryClient = useQueryClient();

  // Ensure default profile exists (upsert)
  const ensureDefaultProfile = useCallback(async (uid: string, email?: string | null): Promise<ProfilesData | null> => {
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
    return data as ProfilesData;
  }, []);

  // Fetch profile from Supabase with fallbacks
  const fetchProfileFromSupabase = useCallback(async (): Promise<ProfilesData | null> => {
    if (!user?.id || !session?.access_token) {
      console.log('❌ Cannot fetch profile: missing user or session');
      return null;
    }

    console.log('🔍 Fetching profile for user:', user.id);

    try {
      // Primary path: direct table access
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ Profile fetch error (direct):', error);

        // Fallback: ARES Edge Function
        if (session?.access_token) {
          console.log('🚀 Trying ARES fallback...');
          const result = await AresProfileLoader.loadUserProfile(user.id, session.access_token, 1);
          if (result.data) {
            console.log('✅ ARES fallback succeeded');
            return result.data as ProfilesData;
          }
        }
        throw error;
      }

      if (data) {
        console.log('✅ Profile fetched:', { id: data.id, display_name: data.display_name });
        return data as ProfilesData;
      }

      // No profile found - try ARES fallback before creating
      if (session?.access_token) {
        console.log('ℹ️ No direct profile, trying ARES fallback...');
        const result = await AresProfileLoader.loadUserProfile(user.id, session.access_token, 1);
        if (result.data) {
          return result.data as ProfilesData;
        }
      }

      // Create default profile
      console.log('🆕 Creating default profile...');
      return await ensureDefaultProfile(user.id, user.email);

    } catch (err: any) {
      console.error('❌ Profile fetch exception:', err);
      // Fail-safe: create default profile
      return await ensureDefaultProfile(user.id, user.email);
    }
  }, [user?.id, user?.email, session?.access_token, ensureDefaultProfile]);

  // React Query with localStorage placeholder
  const { 
    data: profileData, 
    isLoading, 
    error, 
    refetch,
    isPlaceholderData 
  } = useQuery({
    queryKey: QUERY_KEYS.USER_PROFILE,
    queryFn: async () => {
      const data = await fetchProfileFromSupabase();
      if (data) {
        storeProfile(data); // Sync to localStorage on success
      }
      return data;
    },
    enabled: !!user?.id && !!session?.access_token && isSessionReady,
    staleTime: 1000 * 60 * 10,  // 10 minutes fresh
    gcTime: 1000 * 60 * 60,     // 60 minutes in memory
    placeholderData: () => {
      // CRITICAL: Show localStorage data instantly
      const stored = getStoredProfile();
      // Only use if user_id matches (session switch protection)
      if (stored && stored.user_id === user?.id) {
        console.log('📦 Using cached profile from localStorage');
        return stored;
      }
      return undefined;
    },
    retry: 2,
  });

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
            const newData = payload.new as ProfilesData;
            // Update React Query cache + localStorage simultaneously
            queryClient.setQueryData(QUERY_KEYS.USER_PROFILE, newData);
            storeProfile(newData);
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Logout handling: clear cache + localStorage
  useEffect(() => {
    if (!user?.id) {
      queryClient.removeQueries({ queryKey: QUERY_KEYS.USER_PROFILE });
      clearStoredProfile();
    }
  }, [user?.id, queryClient]);

  // Determine if this is first app start (no cache, no data yet)
  const isFirstAppStart = !profileData && !getStoredProfile() && !isLoading;

  return {
    // Raw profile data from database (or placeholder)
    profileData: profileData ?? null,
    
    // Computed/processed profile
    profile: convertToUserProfile(profileData),
    
    // Loading and error states
    isLoading,
    error: error?.message ?? null,
    
    // Profile state flags
    isFirstAppStart,
    hasMissingRequiredFields: missingRequired(profileData),
    isProfileStale: isStale(profileData?.updated_at),
    needsCheckUp: false,
    isPlaceholderData,
    
    // Actions
    refreshProfile: () => refetch(),
  };
};
