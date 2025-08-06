
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
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

  const cleanupAuthState = () => {
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
  };

  const checkIfNewUserAndRedirect = async (user: User) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('weight, height, age, gender')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        secureLogger.error('Error checking profile', error);
        return;
      }

      // Check if profile is incomplete (new user)
      const isIncomplete = !profile || 
        !profile.weight || 
        !profile.height || 
        !profile.age || 
        !profile.gender;

      if (isIncomplete) {
        // New user - start premium trial and redirect to profile
        await startPremiumTrialForNewUser(user.id);
        setTimeout(() => {
          window.location.href = '/profile';
        }, 100);
      } else {
        // Existing user - redirect to home
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      // Fallback to home
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
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
      window.location.replace('/auth');
    } catch (error) {
      // Force cleanup even if signOut fails
      cleanupAuthState();
      setSession(null);
      setUser(null);
      console.error('Sign out error occurred');
      window.location.replace('/auth');
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let hasTriggeredSignInRedirect = false;
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 Auth state change:', event, 'Current path:', window.location.pathname);
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Only handle redirects for actual sign-in events from the auth page
        if (event === 'SIGNED_IN' && 
            session?.user && 
            window.location.pathname === '/auth' && 
            !hasTriggeredSignInRedirect) {
          
          console.log('🚀 Processing sign-in redirect for new login');
          hasTriggeredSignInRedirect = true;
          
          timeoutId = setTimeout(() => {
            checkIfNewUserAndRedirect(session.user);
          }, 100);
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out');
          cleanupAuthState();
          setSession(null);
          setUser(null);
          hasTriggeredSignInRedirect = false;
          if (window.location.pathname !== '/auth') {
            window.location.href = '/auth';
          }
        }

        if (event === 'TOKEN_REFRESHED') {
          setSession(session);
          setUser(session?.user ?? null);
        }
      }
    );

    // Check for existing session only once
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Session fetch error:', error.message);
        cleanupAuthState();
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      console.log('📋 Initial session check:', { 
        hasSession: !!session, 
        currentPath: window.location.pathname 
      });
    }).catch(() => {
      cleanupAuthState();
      setSession(null);
      setUser(null);
      setLoading(false);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

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
