import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { signUpSchema, signInSchema, ClientRateLimit } from '@/utils/validationSchemas';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [privacyAccepted, setPrivacyAccepted] = useState(true);
  const [rateLimiter] = useState(() => new ClientRateLimit(5, 15 * 60 * 1000));
  
  const { user, session, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const { logAuthAttempt, logSuspiciousActivity } = useSecurityMonitoring();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect if we're sure the user is authenticated and not loading
    if (!authLoading && user && session) {
      console.log('🔄 User already authenticated, redirecting to home');
      navigate('/');
      return;
    }
    
    // Check rate limiting on component mount
    const clientId = `${navigator.userAgent}_${window.location.href}`;
    if (!rateLimiter.isAllowed(clientId)) {
      const remaining = rateLimiter.getRemainingAttempts(clientId);
      if (remaining === 0) {
        toast.error('Zu viele Anmeldeversuche. Bitte warten Sie 15 Minuten.');
        logSuspiciousActivity('rate_limit_exceeded', { 
          action: 'auth_attempt',
          client_info: navigator.userAgent 
        });
      }
    }
  }, [user, session, authLoading, navigate, rateLimiter, logSuspiciousActivity]);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 flex items-center justify-center p-4">
        <div className="text-center">
          <Shield className="h-8 w-8 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Überprüfe Anmeldestatus...</p>
        </div>
      </div>
    );
  }

  const cleanupAuthState = () => {
    try {
      // Force sign out first
      supabase.auth.signOut({ scope: 'global' }).catch(() => {});
      
      // Clear localStorage
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear sessionStorage
      Object.keys(sessionStorage || {}).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
        }
      });
      
      console.log('Auth state cleaned up successfully');
    } catch (error) {
      console.error('Error during auth cleanup:', error);
    }
  };

  const validateForm = () => {
    setError('');
    const errors: Record<string, string> = {};
    
    // Email validation
    if (!email || email.trim() === '') {
      errors.email = 'E-Mail ist erforderlich';
    } else if (email.length > 254) {
      errors.email = 'E-Mail ist zu lang';
    } else {
      // Simple email regex without unsafe-eval
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
      }
    }
    
    // Password validation
    if (!password || password.trim() === '') {
      errors.password = 'Passwort ist erforderlich';
    } else if (isSignUp) {
      // Only validate password strength for sign up
      if (password.length < 8) {
        errors.password = 'Passwort muss mindestens 8 Zeichen lang sein';
      } else if (password.length > 128) {
        errors.password = 'Passwort ist zu lang';
      } else {
        // Check for at least 2 of: lowercase, uppercase, number
        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const criteria = [hasLower, hasUpper, hasNumber].filter(Boolean).length;
        
        if (criteria < 2) {
          errors.password = 'Passwort muss mindestens 2 der folgenden enthalten: Großbuchstabe, Kleinbuchstabe, oder Zahl';
        }
      }
    }
    
    // Confirm password validation (only for sign up)
    if (isSignUp) {
      if (!confirmPassword || confirmPassword.trim() === '') {
        errors.confirmPassword = 'Passwort bestätigen ist erforderlich';
      } else if (password !== confirmPassword) {
        errors.confirmPassword = 'Passwörter stimmen nicht überein';
      }
      
      // Privacy policy validation
      if (!privacyAccepted) {
        errors.privacy = 'Sie müssen der Datenschutzerklärung zustimmen, um sich zu registrieren.';
      }
    }

    setValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      setError(firstError);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔐 Login attempt started', { email, isSignUp, isPasswordReset });
    
    // Check rate limiting
    const clientId = `${navigator.userAgent}_${window.location.href}`;
    if (!rateLimiter.isAllowed(clientId)) {
      const remaining = rateLimiter.getRemainingAttempts(clientId);
      setError(`Zu viele Anmeldeversuche. Versuchen Sie es in 15 Minuten erneut. (${remaining} Versuche übrig)`);
      await logSuspiciousActivity('rate_limit_exceeded', { 
        action: 'auth_attempt',
        client_info: navigator.userAgent,
        remaining_attempts: remaining
      });
      return;
    }
    
    if (isPasswordReset) {
      handlePasswordReset();
      return;
    }
    
    const isValid = validateForm();
    if (!isValid) return;
    
    setLoading(true);
    setError('');
    
    // Add retry logic for network issues
    let attempt = 0;
    const maxAttempts = 3;
    
    try {
      
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
            
            await logAuthAttempt('sign_up', !error, { 
              email_domain: email.split('@')[1] 
            });
            
            if (error) {
              await logSuspiciousActivity('auth_failure', {
                error_message: error.message,
                email_domain: email.split('@')[1],
                action: 'sign_up'
              });
              
              if (error.message.includes('already registered')) {
                setError(t('auth.emailAlreadyRegistered'));
                return;
              } else if (error.message.includes('weak password') || error.message.includes('password_breach')) {
                setError('Das Passwort ist zu schwach oder wurde bei Datenlecks gefunden. Bitte wählen Sie ein anderes.');
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
            
            await logAuthAttempt('sign_in', !error, { 
              email_domain: email.split('@')[1] 
            });
            
            if (error) {
              await logSuspiciousActivity('auth_failure', {
                error_message: error.message,
                email_domain: email.split('@')[1],
                action: 'sign_in'
              });
              
              if (error.message.includes('Invalid login credentials')) {
                setError(t('auth.invalidCredentials'));
                return;
              }
              throw error;
            }
            
            if (data.user) {
              console.log('✅ Sign in successful, auth state will handle redirect');
              toast.success(t('auth.signInSuccess'));
              // Don't manually redirect - let the auth state change handle it
            }
            break;
          }
        } catch (networkError: any) {
          attempt++;
          if (attempt >= maxAttempts) {
            throw networkError;
          }
        }
      }
    } catch (error: any) {
      await logAuthAttempt(
        isSignUp ? 'sign_up' : 'sign_in',
        false,
        {
          email,
          error_message: error.message,
          attempt_count: maxAttempts
        }
      );
      
      await logSuspiciousActivity('auth_error', {
        error_message: error.message,
        action: isSignUp ? 'sign_up' : 'sign_in'
      });
      
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
        redirectTo: `${window.location.origin}/`
      });
      
      await logAuthAttempt('password_reset', !error);
      
      if (error) throw error;
      
      toast.success(t('auth.passwordResetSent'));
      setIsPasswordReset(false);
    } catch (error: any) {
      await logSuspiciousActivity('auth_error', {
        error_message: error.message,
        action: 'password_reset'
      });
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
      setError(t('auth.appleError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            {t('app.title')}
          </CardTitle>
          <CardDescription>
            {isPasswordReset ? t('auth.passwordResetTitle') : (isSignUp ? 'Sicheres Konto erstellen' : t('auth.signIn'))}
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
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (validationErrors.email) {
                    setValidationErrors(prev => ({ ...prev, email: '' }));
                    setError('');
                  }
                }}
                placeholder={t('auth.email')}
                className={validationErrors.email ? 'border-destructive' : ''}
                required
              />
              {validationErrors.email && (
                <p className="text-sm text-destructive">{validationErrors.email}</p>
              )}
            </div>
            
            {!isPasswordReset && (
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (validationErrors.password) {
                        setValidationErrors(prev => ({ ...prev, password: '' }));
                        setError('');
                      }
                    }}
                    placeholder={isSignUp ? "Starkes Passwort erstellen" : t('auth.password')}
                    required
                    className={`pr-10 ${validationErrors.password ? 'border-destructive' : ''}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {validationErrors.password && (
                  <p className="text-sm text-destructive">{validationErrors.password}</p>
                )}
                
                {/* Password strength indicator for signup */}
                {isSignUp && password && (
                  <PasswordStrengthIndicator 
                    password={password} 
                    className="mt-2"
                  />
                )}
              </div>
            )}
            
            {isSignUp && !isPasswordReset && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (validationErrors.confirmPassword) {
                        setValidationErrors(prev => ({ ...prev, confirmPassword: '' }));
                        setError('');
                      }
                    }}
                    placeholder={t('auth.confirmPassword')}
                    required
                    className={`pr-10 ${validationErrors.confirmPassword ? 'border-destructive' : ''}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {validationErrors.confirmPassword && (
                  <p className="text-sm text-destructive">{validationErrors.confirmPassword}</p>
                )}
              </div>
            )}
            
            {/* Datenschutz-Zustimmung für Registrierung */}
            {isSignUp && !isPasswordReset && (
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="privacy"
                    checked={privacyAccepted}
                    onCheckedChange={(checked) => {
                      setPrivacyAccepted(!!checked);
                      if (validationErrors.privacy) {
                        setValidationErrors(prev => ({ ...prev, privacy: '' }));
                        setError('');
                      }
                    }}
                    className="mt-1"
                  />
                  <label htmlFor="privacy" className="text-sm leading-tight cursor-pointer">
                    Ich stimme der{' '}
                    <Link 
                      to="/privacy" 
                      target="_blank"
                      className="text-primary hover:underline"
                    >
                      Datenschutzerklärung
                    </Link>
                    {' '}zu und erlaube die Verarbeitung meiner Daten entsprechend den darin beschriebenen Zwecken.
                  </label>
                </div>
                {validationErrors.privacy && (
                  <p className="text-sm text-destructive">{validationErrors.privacy}</p>
                )}
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
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
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
