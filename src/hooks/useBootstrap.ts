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
  console.log('🔍 useBootstrap mounted');
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

  // Single effect that triggers all data loading in parallel
  useEffect(() => {
    console.log('🔍 Bootstrap Check:', { 
      isSessionReady, 
      hasUser: !!user, 
      userId: user?.id,
      email: user?.email,
      isBootstrapping: bootstrapState.isBootstrapping,
      bootstrapComplete: bootstrapState.bootstrapComplete,
      hasBootstrapped: hasBootstrappedRef.current
    });
    
    if (!isSessionReady || !user?.id) {
      console.log('⏳ Bootstrap waiting for session...', { isSessionReady, hasUser: !!user });
      return;
    }

    // PREVENT MULTIPLE BOOTSTRAP RUNS
    if (hasBootstrappedRef.current) {
      console.log('🔒 Bootstrap already completed, skipping...');
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

      console.log('🚀 Bootstrap starting for user:', user.id);

      try {
        // Load all initial data in parallel with Promise.allSettled
        const results = await Promise.allSettled([
          // 1. Load profile data directly (bypass useUserProfile to avoid dependency loops)
          supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle()
            .then(({ data, error }) => {
              if (error) throw error;
              console.log('✅ Profile loaded:', data ? 'Found' : 'Not found');
              return data;
            }),

          // 2. Load daily goals
          supabase
            .from('daily_goals')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle()
            .then(({ data, error }) => {
              if (error) throw error;
              console.log('✅ Daily goals loaded:', data ? 'Found' : 'Using defaults');
              return data;
            }),

          // 3. Load today's meals (simplified - meal_foods relation doesn't exist)
          supabase
            .from('meals')
            .select('*')
            .eq('user_id', user.id)
            .eq('date', new Date().toISOString().split('T')[0])
            .order('ts', { ascending: false })
            .then(({ data, error }) => {
              if (error) throw error;
              console.log('✅ Today\'s meals loaded:', data?.length || 0);
              return data || [];
            }),

          // 4. Load today's fluids
          supabase
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
            .order('consumed_at', { ascending: false })
            .then(({ data, error }) => {
              if (error) throw error;
              console.log('✅ Today\'s fluids loaded:', data?.length || 0);
              return data || [];
            }),

          // 5. Load user points
          supabase
            .from('user_points')
            .select('total_points, points_to_next_level, current_level, level_name')
            .eq('user_id', user.id)
            .maybeSingle()
            .then(({ data, error }) => {
              if (error) throw error;
              console.log('✅ User points loaded:', data?.total_points || 0);
              return data;
            })
        ]);

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Count successful vs failed operations
        const successful = results.filter(result => result.status === 'fulfilled').length;
        const failed = results.filter(result => result.status === 'rejected').length;

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
        
        console.error('❌ Bootstrap failed:', errorMessage);
        
        setBootstrapState({
          isBootstrapping: false,
          bootstrapComplete: false,
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