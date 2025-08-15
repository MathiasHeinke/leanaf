import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { secureLogger } from '@/utils/secureLogger';
import { authLogger } from '@/lib/authLogger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isSessionReady: boolean;
  authDebugInfo: {
    hasUser: boolean;
    hasSession: boolean;
    hasAccessToken: boolean;
    sessionUserId?: string;
  };
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
  const [isSessionReady, setIsSessionReady] = useState(false);
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

  const redirectToHome = async (user: User) => {
    try {
      console.log('Auth redirectToHome called for user:', user.id);
      console.log('Preview mode:', isPreviewMode);
      
      // Only redirect if not already on home page to prevent loops
      if (window.location.pathname !== '/') {
        console.log('Redirecting to home from useAuth...');
        navigate('/', { replace: true });
      } else {
        console.log('Already on home page, skipping redirect');
      }
    } catch (error) {
      console.error('Error during redirect:', error);
      // Fallback to home only if not already there
      if (window.location.pathname !== '/') {
        console.log('Fallback redirect to home...');
        navigate('/', { replace: true });
      }
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
      setSession(null);
      setUser(null);
      await supabase.auth.signOut({ scope: 'global' });
      cleanupAuthState();
      navigate('/auth', { replace: true });
    } catch (error) {
      // Force cleanup even if signOut fails
      setSession(null);
      setUser(null);
      cleanupAuthState();
      console.error('Sign out error occurred');
      navigate('/auth', { replace: true });
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state change:', event, session?.user?.id);
        
        // Update state synchronously
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Mark session as ready when we have user - don't wait for JWT validation
        const sessionIsReady = !!(session?.user);
        setIsSessionReady(sessionIsReady);
        
        // Log auth state changes
        await authLogger.log({ 
          event: 'AUTH_STATE_CHANGE', 
          stage: 'onAuthStateChange',
          auth_event: event,
          session_user_id: session?.user?.id,
          details: { event, hasSession: !!session }
        });
        
        if (sessionIsReady) {
          console.log('🔐 Session fully ready - JWT available:', {
            userId: session.user.id,
            email: session.user.email,
            hasAccessToken: !!session.access_token,
            tokenLength: session.access_token?.length || 0
          });
        }
        
        // Handle different auth events
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ User signed in successfully:', session.user.email);
          await authLogger.log({ 
            event: 'SIGNED_IN', 
            stage: 'onAuthStateChange',
            from_path: window.location.pathname,
            details: { willRedirect: window.location.pathname === '/auth' }
          });
          
          // Defer navigation to prevent deadlocks and allow Auth.tsx to handle first
          timeoutId = setTimeout(() => {
            // Only redirect if user isn't already being redirected by Auth.tsx
            if (window.location.pathname === '/auth') {
              console.log('useAuth: Redirecting from /auth to home after sign in');
              authLogger.log({ 
                event: 'REDIRECT_DECISION', 
                stage: 'postSignIn',
                from_path: '/auth',
                to_path: '/',
                details: { reason: 'signed_in_redirect_useauth' }
              });
              redirectToHome(session.user);
            } else {
              console.log('useAuth: Already navigated away from /auth, skipping redirect');
            }
          }, 100); // Reduced timeout - Auth.tsx should handle immediate redirect
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('🚪 User signed out');
          setSession(null);
          setUser(null);
          await authLogger.log({ 
            event: 'SIGNED_OUT', 
            stage: 'onAuthStateChange',
            details: { sessionCleared: true }
          });
          if (!isPreviewMode && window.location.pathname !== '/auth') {
            navigate('/auth', { replace: true });
          }
        }

        if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token refreshed');
          setSession(session);
          setUser(session?.user ?? null);
          await authLogger.log({ 
            event: 'TOKEN_REFRESHED', 
            stage: 'onAuthStateChange',
            session_user_id: session?.user?.id
          });
        }
      }
    );

    // Check for existing session AFTER setting up listener
    const initAuth = async () => {
      try {
        await authLogger.log({ 
          event: 'INIT', 
          stage: 'initAuth', 
          details: { pathname: window.location.pathname } 
        });
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session fetch error:', error.message);
          await authLogger.log({ 
            event: 'ERROR', 
            stage: 'initAuth',
            details: { error: error.message }
          });
          setSession(null);
          setUser(null);
          cleanupAuthState();
        } else {
          console.log('🔍 Initial session check:', session?.user?.id || 'No session');
          setSession(session);
          setUser(session?.user ?? null);
          
          await authLogger.log({ 
            event: 'SESSION_CHECK', 
            stage: 'initAuth',
            session_user_id: session?.user?.id,
            details: { hasSession: !!session, sessionChecked: true }
          });
          
          // Handle redirect for existing session - only if on auth page
          if (session?.user && window.location.pathname === '/auth') {
            console.log('🔄 User already logged in, redirecting...', session.user.email);
            await authLogger.log({ 
              event: 'REDIRECT_DECISION', 
              stage: 'initAuth',
              from_path: '/auth',
              to_path: '/',
              details: { reason: 'existing_session_redirect' }
            });
            setTimeout(() => {
              redirectToHome(session.user);
            }, 50); // Quick redirect for existing sessions
          }
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        await authLogger.log({ 
          event: 'ERROR', 
          stage: 'initAuth',
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        });
        setSession(null);
        setUser(null);
        cleanupAuthState();
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

  const authDebugInfo = {
    hasUser: !!user,
    hasSession: !!session,
    hasAccessToken: !!session?.access_token,
    sessionUserId: session?.user?.id,
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    isSessionReady,
    authDebugInfo,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};