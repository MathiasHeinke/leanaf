import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { secureLogger } from '@/utils/secureLogger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Detect if running in Lovable Preview mode
  const isPreviewMode = window.location.hostname.includes('lovable.app');

  const cleanupAuthState = () => {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      Object.keys(sessionStorage || {}).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
        }
      });
      console.log('Auth state cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up auth state:', error);
    }
  };

  const checkIfNewUserAndRedirect = async (user: User) => {
    try {
      console.log('Checking user profile for redirect...', user.id);
      console.log('Preview mode:', isPreviewMode);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('weight, height, age, gender')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        secureLogger.error('Error checking profile', error);
        return;
      }

      console.log('Profile data:', profile);

      // Check if profile is incomplete (new user)
      const isIncomplete = !profile || 
        !profile.weight || 
        !profile.height || 
        !profile.age || 
        !profile.gender;

      console.log('Profile incomplete:', isIncomplete);

      if (isIncomplete) {
        // New user - start premium trial and redirect to profile
        await startPremiumTrialForNewUser(user.id);
        console.log('Redirecting new user to profile...');
        navigate('/profile', { replace: true });
      } else {
        // Existing user - redirect to home
        console.log('Redirecting existing user to home...');
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      // Fallback to home
      console.log('Fallback redirect to home...');
      navigate('/', { replace: true });
    }
  };

  const startPremiumTrialForNewUser = async (userId: string) => {
    try {
      // Check if user already has a trial
      const { data: existingTrial } = await supabase
        .from('user_trials')
        .select('id')
        .eq('user_id', userId)
        .eq('trial_type', 'premium')
        .maybeSingle();

      if (existingTrial) return; // Trial already exists

      // Create new 3-day premium trial
      const { error } = await supabase
        .from('user_trials')
        .insert({
          user_id: userId,
          trial_type: 'premium',
          is_active: true,
          expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days
        });

      if (error) {
        console.error('Error creating premium trial:', error);
      }
    } catch (error) {
      console.error('Error starting premium trial:', error);
    }
  };

  const signOut = async () => {
    try {
      cleanupAuthState();
      setSession(null);
      setUser(null);
      await supabase.auth.signOut({ scope: 'global' });
      navigate('/auth', { replace: true });
    } catch (error) {
      // Force cleanup even if signOut fails
      cleanupAuthState();
      setSession(null);
      setUser(null);
      console.error('Sign out error occurred');
      navigate('/auth', { replace: true });
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 Auth state change:', event, session?.user?.id);
        
        // Update state synchronously
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Handle different auth events
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ User signed in successfully');
          // Only redirect if we're on auth page or initial load
          const currentPath = window.location.pathname;
          if (currentPath === '/auth') {
            // Defer redirect to prevent deadlocks and data loading issues
            timeoutId = setTimeout(() => {
              checkIfNewUserAndRedirect(session.user);
            }, 100);
          }
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('🚪 User signed out');
          cleanupAuthState();
          setSession(null);
          setUser(null);
          if (!isPreviewMode && window.location.pathname !== '/auth') {
            navigate('/auth', { replace: true });
          }
        }

        if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token refreshed');
          setSession(session);
          setUser(session?.user ?? null);
        }
      }
    );

    // Check for existing session AFTER setting up listener
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session fetch error:', error.message);
          cleanupAuthState();
          setSession(null);
          setUser(null);
        } else {
          console.log('🔍 Initial session check:', session?.user?.id || 'No session');
          setSession(session);
          setUser(session?.user ?? null);
          
          // Handle redirect for existing session - only if on auth page
          if (session?.user && window.location.pathname === '/auth') {
            console.log('🔄 User already logged in, redirecting...');
            setTimeout(() => {
              checkIfNewUserAndRedirect(session.user);
            }, 100);
          }
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        cleanupAuthState();
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [navigate, isPreviewMode]);

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};