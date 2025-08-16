import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { secureLogger } from '@/utils/secureLogger';
import { authLogger } from '@/lib/authLogger';
import { dataLogger } from '@/utils/dataLogger';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isSessionReady: boolean;
}

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
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
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    isSessionReady: false,
  });
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

  const startPremiumTrialForNewUser = (user: User) => {
    // Defer trial creation to not block auth flow and prevent deadlocks
    setTimeout(async () => {
      try {
        const { data: existingTrial } = await supabase
          .from('user_trials')
          .select('id')
          .eq('user_id', user.id)
          .eq('trial_type', 'premium')
          .maybeSingle();

        if (existingTrial) return;

        await supabase
          .from('user_trials')
          .insert({
            user_id: user.id,
            trial_type: 'premium',
            is_active: true,
            expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
          });
      } catch (error) {
        console.error('Error starting premium trial:', error);
      }
    }, 1000);
  };

  const cleanupLocalAuth = () => {
    try {
      // Only cleanup Supabase auth related items
      const authKeys = ['sb-gzczjscctgyxjyodhnhk-auth-token'];
      authKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    } catch (error) {
      console.error('Error cleaning up local auth:', error);
    }
  };

  const signOut = async () => {
    try {
      setAuthState(prev => ({ ...prev, session: null, user: null }));
      await supabase.auth.signOut({ scope: 'global' });
      cleanupAuthState();
      navigate('/auth', { replace: true });
    } catch (error) {
      // Force cleanup even if signOut fails
      setAuthState(prev => ({ ...prev, session: null, user: null }));
      cleanupAuthState();
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
        
        // Validate session before using it
        const isValidSession = session && 
          session.access_token && 
          session.expires_at && 
          (session.expires_at * 1000) > Date.now();

        authLogger.log({ 
          event: 'AUTH_STATE_CHANGE', 
          stage: 'onAuthStateChange',
          auth_event: event,
          session_user_id: session?.user?.id,
          details: { 
            event, 
            hasSession: !!session,
            isValid: isValidSession,
            expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
          }
        });
        
        // BATCHED STATE UPDATE - Prevent auth flickering
        const sessionIsReady = isValidSession && !!session?.user;
        setAuthState({
          session: isValidSession ? session : null,
          user: isValidSession && session?.user ? session.user : null,
          loading: false,
          isSessionReady: sessionIsReady,
        });
        
        if (sessionIsReady) {
          console.log('✅ Valid session ready - RLS queries should work:', {
            userId: session.user.id,
            email: session.user.email,
            hasAccessToken: !!session.access_token,
            expiresIn: Math.floor(((session.expires_at * 1000) - Date.now()) / 1000)
          });
        } else if (dataLogger.isDebugEnabled()) {
          console.warn('❌ No valid session - RLS will block all queries');
        }
        
        // Handle different auth events
        if (event === 'SIGNED_IN' && sessionIsReady) {
          console.log('✅ User signed in successfully:', session.user.email);
          authLogger.log({ 
            event: 'SIGNIN_SUCCESS', 
            auth_event: event,
            details: { email: session.user.email }
          });
          
          // Defer heavy operations to prevent deadlock
          setTimeout(() => {
            startPremiumTrialForNewUser(session.user);
          }, 0);
          
          // Handle redirect carefully
          if (window.location.pathname === '/auth') {
            timeoutId = setTimeout(() => {
              authLogger.log({ 
                event: 'REDIRECT_DECISION', 
                from_path: '/auth',
                to_path: '/',
                details: { reason: 'signed_in_redirect' }
              });
              redirectToHome(session.user);
            }, 100);
          }
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('🚪 User signed out');
          authLogger.log({ event: 'SIGNED_OUT', auth_event: event });
          cleanupLocalAuth();
          if (!isPreviewMode && window.location.pathname !== '/auth') {
            setTimeout(() => {
              navigate('/auth', { replace: true });
            }, 100);
          }
        }

        if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token refreshed');
          authLogger.log({ 
            event: 'TOKEN_REFRESHED', 
            auth_event: event,
            details: { 
              isValid: isValidSession,
              userId: session?.user?.id
            }
          });
          
          // If refreshed token is still invalid, sign out
          if (!isValidSession && session) {
            authLogger.log({ event: 'INVALID_REFRESHED_TOKEN' });
            setTimeout(() => signOut(), 0);
          }
        }
      }
    );

    // THEN check for existing session
    const initAuth = async () => {
      try {
        authLogger.log({ 
          event: 'INIT', 
          details: { pathname: window.location.pathname } 
        });
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session fetch error:', error.message);
          authLogger.log({ 
            event: 'SESSION_ERROR',
            details: { error: error.message }
          });
          setAuthState(prev => ({ ...prev, session: null, user: null }));
          cleanupLocalAuth();
        } else {
          // Validate initial session
          const isValidSession = session && 
            session.access_token && 
            session.expires_at && 
            (session.expires_at * 1000) > Date.now();

          console.log('🔍 Initial session check:', {
            hasSession: !!session,
            isValid: isValidSession,
            userId: session?.user?.id || 'No user',
            expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
          });
          
          authLogger.log({ 
            event: 'INITIAL_SESSION',
            session_user_id: session?.user?.id,
            details: { 
              hasSession: !!session, 
              hasUser: !!session?.user,
              isValid: isValidSession,
              expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
            }
          });
          
          if (isValidSession) {
            setAuthState({
              session,
              user: session.user ?? null,
              loading: false,
              isSessionReady: true,
            });
            
            // Check if token expires soon and refresh preventively
            const expiresIn = (session.expires_at * 1000) - Date.now();
            if (expiresIn < 5 * 60 * 1000) { // Less than 5 minutes
              authLogger.log({ event: 'TOKEN_EXPIRES_SOON', details: { expiresIn } });
              setTimeout(() => {
                supabase.auth.refreshSession().catch(console.error);
              }, 0);
            }
            
            // Handle redirect for existing valid session
            if (window.location.pathname === '/auth') {
              console.log('🔄 Valid session exists, redirecting from auth...');
              authLogger.log({ 
                event: 'REDIRECT_DECISION',
                from_path: '/auth',
                to_path: '/',
                details: { reason: 'existing_valid_session' }
              });
              setTimeout(() => {
                redirectToHome(session.user);
              }, 50);
            }
          } else {
            authLogger.log({ event: 'INVALID_INITIAL_SESSION' });
            setAuthState({
              session: null,
              user: null,
              loading: false,
              isSessionReady: true, // Ready but no valid session
            });
            if (session) {
              // Clean up invalid session
              cleanupLocalAuth();
            }
          }
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        authLogger.log({ 
          event: 'INIT_ERROR',
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        });
        setAuthState({
          session: null,
          user: null,
          loading: false,
          isSessionReady: true,
        });
        cleanupLocalAuth();
      }
    };

    initAuth();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [navigate, isPreviewMode]);

  const authDebugInfo = {
    hasUser: !!authState.user,
    hasSession: !!authState.session,
    hasAccessToken: !!authState.session?.access_token,
    sessionUserId: authState.session?.user?.id,
  };

  const value = {
    ...authState,
    signOut,
    authDebugInfo,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};