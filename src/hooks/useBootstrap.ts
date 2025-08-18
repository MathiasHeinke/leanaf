import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { useDebug } from '@/contexts/DebugContext';

interface BootstrapState {
  isBootstrapping: boolean;
  bootstrapComplete: boolean;
  bootstrapStartTime: number | null;
  bootstrapDuration: number | null;
  error: string | null;
}

export const useBootstrap = () => {
  if (import.meta.env.DEV) {
    console.log('🔍 useBootstrap mounted');
  }
  const { isSessionReady, user } = useAuth();
  const { addDebugEvent } = useDebug();
  const hasBootstrappedRef = useRef(false);
  const [bootstrapState, setBootstrapState] = useState<BootstrapState>({
    isBootstrapping: false,
    bootstrapComplete: false,
    bootstrapStartTime: null,
    bootstrapDuration: null,
    error: null
  });

  // Helper: Wait for auth token to be available
  const waitForAuthToken = async (maxMs = 1200) => {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) return session.access_token;
      await new Promise(r => setTimeout(r, 120));
    }
    return null;
  };

  // Helper: Retry requests that fail with common Safari auth errors
  const withAuthRetry = async <T>(fn: () => Promise<T>, label: string): Promise<T> => {
    let lastErr: any;
    const delays = [0, 150, 350];
    for (let i = 0; i < delays.length; i++) {
      try {
        return await fn();
      } catch (e: any) {
        lastErr = e;
        const msg = String(e?.message || e);
        if (!/load failed|access control|fetch api cannot load/i.test(msg)) break;
        if (i < delays.length - 1) {
          if (import.meta.env.DEV) {
            console.warn(`🔄 Retry ${i + 1} for ${label} after ${delays[i + 1]}ms`, e);
          }
          await new Promise(r => setTimeout(r, delays[i + 1]));
        }
      }
    }
    throw lastErr;
  };

  // Single effect that triggers all data loading in parallel
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🔍 Bootstrap Check:', { 
        isSessionReady, 
        hasUser: !!user, 
        userId: user?.id,
        email: user?.email,
        isBootstrapping: bootstrapState.isBootstrapping,
        bootstrapComplete: bootstrapState.bootstrapComplete,
        hasBootstrapped: hasBootstrappedRef.current
      });
    }
    
    if (!isSessionReady || !user?.id) {
      if (import.meta.env.DEV) {
        console.log('⏳ Bootstrap waiting for session...', { isSessionReady, hasUser: !!user });
      }
      return;
    }

    // PREVENT MULTIPLE BOOTSTRAP RUNS
    if (hasBootstrappedRef.current) {
      if (import.meta.env.DEV) {
        console.log('🔒 Bootstrap already completed, skipping...');
      }
      return;
    }

    const performBootstrap = async () => {
      hasBootstrappedRef.current = true; // Mark as started
      const startTime = performance.now();
      
      setBootstrapState({
        isBootstrapping: true,
        bootstrapComplete: false,
        bootstrapStartTime: startTime,
        bootstrapDuration: null,
        error: null
      });

      addDebugEvent('info', 'BOOTSTRAP_START', { 
        userId: user.id,
        timestamp: new Date().toISOString()
      });

      if (import.meta.env.DEV) {
        console.log('🚀 Bootstrap starting for user:', user.id);
      }
      
      // Wait for auth token to prevent early fetch failures
      if (import.meta.env.DEV) {
        console.log('🔑 Ensuring token...');
      }
      await waitForAuthToken();
      if (import.meta.env.DEV) {
        console.log('✅ Token ready');
      }

      try {
        // Load all initial data in parallel with auth retry protection
        const results = await Promise.allSettled([
          // 1. Load profile data with retry
          withAuthRetry(async () => {
            const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', user.id)
              .maybeSingle();
            if (error) throw error;
            if (import.meta.env.DEV) {
              console.log('✅ Profile loaded:', data ? 'Found' : 'Not found');
            }
            return data;
          }, 'profiles'),

          // 2. Load daily goals with retry
          withAuthRetry(async () => {
            const { data, error } = await supabase
              .from('daily_goals')
              .select('*')
              .eq('user_id', user.id)
              .maybeSingle();
            if (error) throw error;
            return data;
          }, 'daily_goals'),

          // 3. Load today's meals with retry
          withAuthRetry(async () => {
            const { data, error } = await supabase
              .from('meals')
              .select('*')
              .eq('user_id', user.id)
              .eq('date', new Date().toISOString().split('T')[0])
              .order('ts', { ascending: false });
            if (error) throw error;
            return data || [];
          }, 'meals'),

          // 4. Load today's fluids with retry
          withAuthRetry(async () => {
            const { data, error } = await supabase
              .from('user_fluids')
              .select(`
                *,
                fluid_database:fluid_id (
                  name,
                  calories_per_100ml,
                  protein_per_100ml,
                  carbs_per_100ml,
                  fats_per_100ml,
                  has_alcohol,
                  category
                )
              `)
              .eq('user_id', user.id)
              .eq('date', new Date().toISOString().split('T')[0])
              .order('consumed_at', { ascending: false });
            if (error) throw error;
            return data || [];
          }, 'fluids'),

          // 5. Load user points with retry
          withAuthRetry(async () => {
            const { data, error } = await supabase
              .from('user_points')
              .select('total_points, points_to_next_level, current_level, level_name')
              .eq('user_id', user.id)
              .maybeSingle();
            if (error) throw error;
            return data;
          }, 'user_points')
        ]);

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Count successful vs failed operations
        const successful = results.filter(result => result.status === 'fulfilled').length;
        const failed = results.filter(result => result.status === 'rejected').length;

        if (import.meta.env.DEV) {
          console.log('🏁 Bootstrap complete:', {
            duration: `${duration.toFixed(1)}ms`,
            successful,
            failed,
            total: results.length
          });

          // Log any failed operations
          results.forEach((result, index) => {
            if (result.status === 'rejected') {
              const operations = ['profile', 'goals', 'meals', 'fluids', 'points'];
              console.error(`❌ Failed to load ${operations[index]}:`, result.reason);
            }
          });
        }

        setBootstrapState({
          isBootstrapping: false,
          bootstrapComplete: true,
          bootstrapStartTime: startTime,
          bootstrapDuration: duration,
          error: failed > 0 ? `${failed} operations failed` : null
        });

        addDebugEvent('info', 'BOOTSTRAP_COMPLETE', {
          duration: `${duration.toFixed(1)}ms`,
          successful,
          failed,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown bootstrap error';
        
        if (import.meta.env.DEV) {
          console.error('❌ Bootstrap failed:', errorMessage);
        }
        
        // FAIL-SAFE: Always set bootstrapComplete=true, even on errors
        setBootstrapState({
          isBootstrapping: false,
          bootstrapComplete: true, // <- CHANGED: never block UI
          bootstrapStartTime: startTime,
          bootstrapDuration: duration,
          error: errorMessage
        });

        addDebugEvent('error', 'BOOTSTRAP_ERROR', {
          error: errorMessage,
          duration: `${duration.toFixed(1)}ms`,
          timestamp: new Date().toISOString()
        });
      }
    };

    // Add small delay to prevent race conditions with auth state
    const timeoutId = setTimeout(performBootstrap, 10);
    
    return () => clearTimeout(timeoutId);
  }, [isSessionReady, user?.id, addDebugEvent]);

  return bootstrapState;
};