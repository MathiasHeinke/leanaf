import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { authRateLimit, validateEmail, validatePassword } from '@/utils/secureInputValidation';
import { secureLogger } from '@/utils/secureLogger';

interface AuthError {
  message: string;
  field?: string;
}

interface AuthState {
  loading: boolean;
  error: AuthError | null;
}

export const useSecureAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({ loading: false, error: null });

  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthState({ loading: true, error: null });

    try {
      // Rate limiting check
      if (!authRateLimit.isAllowed(email)) {
        const remaining = authRateLimit.getRemainingAttempts(email);
        throw new Error(`Too many login attempts. Try again later. ${remaining} attempts remaining.`);
      }

      // Input validation
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.errors[0]);
      }

      if (!password) {
        throw new Error('Password is required');
      }

      // Attempt sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailValidation.sanitized!,
        password,
      });

      if (error) {
        // Log failed attempt
        secureLogger.security('Failed login attempt', {
          email: emailValidation.sanitized,
          error: error.message,
          timestamp: new Date().toISOString()
        });

        // Return user-friendly error
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and confirm your account');
        } else {
          throw new Error('Login failed. Please try again.');
        }
      }

      // Log successful login
      secureLogger.info('Successful login', {
        userId: data.user?.id,
        email: emailValidation.sanitized
      });

      setAuthState({ loading: false, error: null });
      return { data, error: null };

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Login failed');
      setAuthState({ loading: false, error: { message: error.message } });
      return { data: null, error };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setAuthState({ loading: true, error: null });

    try {
      // Rate limiting check
      if (!authRateLimit.isAllowed(email)) {
        throw new Error('Too many signup attempts. Please try again later.');
      }

      // Input validation
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.errors[0]);
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors[0]);
      }

      // Attempt sign up
      const { data, error } = await supabase.auth.signUp({
        email: emailValidation.sanitized!,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        // Log failed attempt
        secureLogger.security('Failed signup attempt', {
          email: emailValidation.sanitized,
          error: error.message,
          timestamp: new Date().toISOString()
        });

        // Return user-friendly error
        if (error.message.includes('already registered')) {
          throw new Error('An account with this email already exists');
        } else {
          throw new Error('Signup failed. Please try again.');
        }
      }

      // Log successful signup
      secureLogger.info('Successful signup', {
        userId: data.user?.id,
        email: emailValidation.sanitized
      });

      setAuthState({ loading: false, error: null });
      return { data, error: null };

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Signup failed');
      setAuthState({ loading: false, error: { message: error.message } });
      return { data: null, error };
    }
  }, []);

  const signOut = useCallback(async () => {
    setAuthState({ loading: true, error: null });

    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }

      secureLogger.info('User signed out');
      setAuthState({ loading: false, error: null });
      return { error: null };

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Signout failed');
      setAuthState({ loading: false, error: { message: error.message } });
      return { error };
    }
  }, []);

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    clearError
  };
};