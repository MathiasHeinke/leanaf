import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = 'https://gzczjscctgyxjyodhnhk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDc5ODIsImV4cCI6MjA2ODMyMzk4Mn0.RIEpNuSbszttym0v9KulYOxXX_Klose6QRAfEMuub1I';

interface ProfilesData {
  id: string;
  user_id: string;
  updated_at: string;
  created_at: string;
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

interface LoadProfileResult {
  data: ProfilesData | null;
  error: string | null;
  isRLSBlocked: boolean;
  attemptsMade: number;
}

/**
 * ARES Profile Loading Service
 * Robust profile loading with session-context-fix, retry logic, and fallback strategies
 */
export class AresProfileLoader {
  private static async createAuthenticatedClient(accessToken: string) {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
  }

  private static async loadProfileDirect(userId: string, accessToken: string): Promise<{ data: any; error: any }> {
    console.log('🔐 ARES: Creating authenticated client with manual token injection');
    
    const authenticatedClient = await this.createAuthenticatedClient(accessToken);
    
    return await authenticatedClient
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
  }

  private static async loadProfileViaEdgeFunction(userId: string): Promise<{ data: any; error: any }> {
    console.log('🚀 ARES: Using Edge Function fallback');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { data: null, error: { message: 'No access token available for edge function' } };
      }

      const { data, error } = await supabase.functions.invoke('ares-profile-loader', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { userId }
      });
      
      if (error) {
        console.warn('ARES profile loader failed:', error);
        return { data: null, error };
      }
      
      return { data: data?.data || null, error: null };
    } catch (err) {
      return { 
        data: null, 
        error: { message: `Edge Function failed: ${err instanceof Error ? err.message : 'Unknown error'}` }
      };
    }
  }

  /**
   * Load user profile with comprehensive retry and fallback strategies
   */
  static async loadUserProfile(
    userId: string, 
    accessToken: string, 
    maxRetries: number = 3
  ): Promise<LoadProfileResult> {
    console.log('🎯 ARES Profile Loading Service initiated', {
      userId,
      hasAccessToken: !!accessToken,
      maxRetries
    });

    let lastError: any = null;
    let isRLSBlocked = false;

    // PHASE 1: Direct loading with manual token injection
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`🔄 ARES Attempt ${attempt + 1}/${maxRetries}: Direct loading with token injection`);
        
        // Add delay for JWT session settling (except first attempt)
        if (attempt > 0) {
          const delay = Math.pow(2, attempt) * 300; // 300ms, 600ms, 1200ms
          console.log(`⏱️ ARES: Waiting ${delay}ms for JWT session settling...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const { data, error } = await this.loadProfileDirect(userId, accessToken);
        
        if (!error && data) {
          console.log('✅ ARES: Profile loaded successfully via direct method', {
            profile_id: data.id,
            display_name: data.display_name,
            attempt: attempt + 1
          });
          
          return {
            data: data as ProfilesData,
            error: null,
            isRLSBlocked: false,
            attemptsMade: attempt + 1
          };
        }

        if (error) {
          console.warn(`⚠️ ARES Attempt ${attempt + 1} failed:`, {
            message: error.message,
            code: error.code,
            hint: error.hint
          });
          
          // Detect RLS blocking
          if (error.message?.includes('row-level security') || 
              error.message?.includes('permission denied') ||
              error.code === 'PGRST116') {
            isRLSBlocked = true;
            console.error('🛡️ ARES: RLS Policy blocking detected - auth.uid() likely NULL');
          }
          
          lastError = error;
        }

        // No data found (profile doesn't exist)
        if (!error && !data) {
          console.log('🆕 ARES: No profile found for user (first time user)');
          return {
            data: null,
            error: null,
            isRLSBlocked: false,
            attemptsMade: attempt + 1
          };
        }

      } catch (err) {
        lastError = err;
        console.error(`❌ ARES Attempt ${attempt + 1} exception:`, err);
      }
    }

    // PHASE 2: Edge Function fallback if direct loading failed
    if (isRLSBlocked || lastError) {
      console.log('🚀 ARES: Direct loading failed, attempting Edge Function fallback...');
      
      try {
        const { data, error } = await this.loadProfileViaEdgeFunction(userId);
        
        if (!error && data) {
          console.log('✅ ARES: Profile loaded successfully via Edge Function fallback', {
            profile_id: data.id,
            display_name: data.display_name
          });
          
          return {
            data: data as ProfilesData,
            error: null,
            isRLSBlocked: true, // Mark as RLS blocked but resolved via fallback
            attemptsMade: maxRetries + 1
          };
        }
        
        if (error) {
          console.error('❌ ARES: Edge Function fallback also failed:', error);
          lastError = error;
        }
        
      } catch (err) {
        console.error('❌ ARES: Edge Function fallback exception:', err);
        lastError = err;
      }
    }

    // PHASE 3: Complete failure
    const errorMessage = lastError?.message || 'Unknown error occurred';
    console.error('🚨 ARES: All loading strategies failed', {
      lastError: errorMessage,
      isRLSBlocked,
      attemptsMade: maxRetries
    });

    return {
      data: null,
      error: isRLSBlocked 
        ? '🛡️ Profile blocked by RLS - Session timing issue detected'
        : `❌ Profile loading failed: ${errorMessage}`,
      isRLSBlocked,
      attemptsMade: maxRetries
    };
  }

  /**
   * Quick session validation check
   */
  static validateSession(user: any, session: any): boolean {
    const isValid = !!(
      user && 
      session && 
      session.access_token && 
      user.id === session.user?.id
    );
    
    console.log('🔍 ARES Session validation:', {
      hasUser: !!user,
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      userIdMatch: user?.id === session?.user?.id,
      isValid
    });
    
    return isValid;
  }
}