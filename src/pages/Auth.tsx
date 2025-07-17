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
      setError('Please fill in all fields');
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
                setError('Diese E-Mail ist bereits registriert. Versuchen Sie sich anzumelden.');
                return;
              }
              throw error;
            }
            
            toast.success('Konto erfolgreich erstellt! Bitte überprüfen Sie Ihre E-Mail zur Bestätigung.');
            setIsSignUp(false); // Switch to login view after successful signup
            break;
          } else {
            const { data, error } = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            
            if (error) {
              if (error.message.includes('Invalid login credentials')) {
                setError('Ungültige Anmeldedaten. Bitte überprüfen Sie E-Mail und Passwort.');
                return;
              }
              throw error;
            }
            
            if (data.user) {
              toast.success('Erfolgreich angemeldet!');
              window.location.href = '/';
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
        setError('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.');
      } else {
        setError(error.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
      }
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
            {isSignUp ? t('auth.signUp') : t('auth.signIn')}
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
            
            {isSignUp && (
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
              {loading ? t('auth.loading') : (isSignUp ? t('auth.signUp') : t('auth.signIn'))}
            </Button>
          </form>
          
          <div className="mt-4 text-center text-sm">
            {isSignUp ? (
              <p>
                {t('auth.haveAccount')}{' '}
                <button
                  onClick={() => setIsSignUp(false)}
                  className="text-primary hover:underline"
                >
                  {t('auth.signInHere')}
                </button>
              </p>
            ) : (
              <p>
                {t('auth.noAccount')}{' '}
                <button
                  onClick={() => setIsSignUp(true)}
                  className="text-primary hover:underline"
                >
                  {t('auth.signUpHere')}
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;