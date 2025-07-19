
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

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

  const validateForm = () => {
    setError('');
    
    if (!email || !password) {
      setError(t('auth.fillAllFields'));
      return false;
    }
    
    if (!email.includes('@')) {
      setError(t('auth.emailInvalid'));
      return false;
    }
    
    if (password.length < 6) {
      setError(t('auth.passwordTooShort'));
      return false;
    }
    
    if (isSignUp && password !== confirmPassword) {
      setError(t('auth.passwordsNoMatch'));
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isPasswordReset) {
      handlePasswordReset();
      return;
    }
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Add retry logic for network issues
      let attempt = 0;
      const maxAttempts = 3;
      
      while (attempt < maxAttempts) {
        try {
          if (attempt > 0) {
            cleanupAuthState();
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Wait before retry
          }
          
          if (isSignUp) {
            const { error } = await supabase.auth.signUp({
              email,
              password,
              options: {
                emailRedirectTo: `${window.location.origin}/`
              }
            });
            
            if (error) {
              if (error.message.includes('already registered')) {
                setError(t('auth.emailAlreadyRegistered'));
                return;
              }
              throw error;
            }
            
            toast.success(t('auth.accountCreated'));
            setIsSignUp(false); // Switch to login view after successful signup
            break;
          } else {
            const { data, error } = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            
            if (error) {
              if (error.message.includes('Invalid login credentials')) {
                setError(t('auth.invalidCredentials'));
                return;
              }
              throw error;
            }
            
            if (data.user) {
              toast.success(t('auth.signInSuccess'));
              window.location.replace('/');
            }
            break;
          }
        } catch (networkError: any) {
          attempt++;
          if (attempt >= maxAttempts) {
            throw networkError;
          }
          console.log(`Auth attempt ${attempt} failed, retrying...`);
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      if (error.message.includes('Load failed') || error.message.includes('network')) {
        setError(t('auth.networkError'));
      } else {
        setError(error.message || t('auth.genericError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError(t('auth.enterEmail'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`
      });
      
      if (error) throw error;
      
      toast.success(t('auth.passwordResetSent'));
      setIsPasswordReset(false);
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError(t('auth.passwordResetError'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) throw error;
    } catch (error: any) {
      console.error('Google auth error:', error);
      setError(t('auth.googleError'));
    } finally {
      setLoading(false);
    }
  };

  const handleAppleAuth = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) throw error;
    } catch (error: any) {
      console.error('Apple auth error:', error);
      setError(t('auth.appleError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {t('app.title')}
          </CardTitle>
          <CardDescription>
            {isPasswordReset ? t('auth.passwordResetTitle') : (isSignUp ? t('auth.signUp') : t('auth.signIn'))}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.email')}
                required
              />
            </div>
            
            {!isPasswordReset && (
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.password')}
                  required
                />
              </div>
            )}
            
            {isSignUp && !isPasswordReset && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('auth.confirmPassword')}
                  required
                />
              </div>
            )}
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('auth.loading') : (
                isPasswordReset ? t('auth.passwordResetEmail') :
                (isSignUp ? t('auth.signUp') : t('auth.signIn'))
              )}
            </Button>
          </form>
          
          {/* Social Login Buttons */}
          <div className="mt-6 space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t('auth.orContinueWith')}
                </span>
              </div>
            </div>
            
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleAuth}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {t('auth.googleSignIn')}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleAppleAuth}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.017 9.986c3.45 0 6.234-2.784 6.234-6.234S15.467-2.72 12.017-2.72s-6.234 2.784-6.234 6.234 2.784 6.234 6.234 6.234zm6.965 4.284c-.585-.585-1.248-.882-1.985-.882-.975 0-1.755.546-2.34 1.131l-1.326 1.326c-.585.585-1.365 1.131-2.34 1.131s-1.755-.546-2.34-1.131l-1.326-1.326c-.585-.585-1.365-1.131-2.34-1.131-.737 0-1.4.297-1.985.882C2.454 15.856 2 16.831 2 17.895v1.463c0 2.197 1.787 3.984 3.984 3.984h12.032c2.197 0 3.984-1.787 3.984-3.984v-1.463c0-1.064-.454-2.039-1.018-2.625z"/>
              </svg>
              {t('auth.appleSignIn')}
            </Button>
          </div>
          
          <div className="mt-4 text-center text-sm space-y-2">
            {isPasswordReset ? (
              <p>
                <button
                  onClick={() => setIsPasswordReset(false)}
                  className="text-primary hover:underline"
                >
                  {t('auth.backToSignIn')}
                </button>
              </p>
            ) : isSignUp ? (
              <>
                <p>
                  {t('auth.haveAccount')}{' '}
                  <button
                    onClick={() => setIsSignUp(false)}
                    className="text-primary hover:underline"
                  >
                    {t('auth.signInHere')}
                  </button>
                </p>
              </>
            ) : (
              <>
                <p>
                  {t('auth.noAccount')}{' '}
                  <button
                    onClick={() => setIsSignUp(true)}
                    className="text-primary hover:underline"
                  >
                    {t('auth.signUpHere')}
                  </button>
                </p>
                <p>
                  <button
                    onClick={() => setIsPasswordReset(true)}
                    className="text-primary hover:underline"
                  >
                    {t('auth.forgotPassword')}
                  </button>
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
