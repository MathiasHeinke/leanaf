
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, Save, Loader2, Shield, Mail, Key, Smartphone, LogOut, Crown, User, Database } from 'lucide-react';
import { RAGEmbeddingManagerComponent } from '@/components/RAGEmbeddingManager';

const Account = () => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [profileExists, setProfileExists] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();

  const autoSave = async () => {
    if (!user || autoSaving) return;
    setAutoSaving(true);
    try {
      await performSave();
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setAutoSaving(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (user && !initialLoading) {
        autoSave();
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [displayName, email]);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfileExists(true);
        setDisplayName(data.display_name || '');
        setEmail(data.email || '');
      } else {
        setProfileExists(false);
        setEmail(user?.email || '');
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const performSave = async () => {
    if (!user) return;

    const profileData = {
      user_id: user.id,
      display_name: displayName,
      email: email,
    };

    if (profileExists) {
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('user_id', user.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('profiles')
        .insert(profileData);
      if (error) throw error;
      setProfileExists(true);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await performSave();
      toast.success(t('account.profileSaved'));
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(t('account.profileError'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      toast.error(t('auth.enterEmail'));
      return;
    }

    setPasswordResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`
      });
      
      if (error) throw error;
      toast.success(t('account.resetEmailSent'));
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      toast.error(t('auth.passwordResetError'));
    } finally {
      setPasswordResetLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error(t('account.fillAllFields'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('account.passwordsDontMatch'));
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t('account.passwordTooShort'));
      return;
    }

    setPasswordChangeLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      setNewPassword('');
      setConfirmPassword('');
      toast.success(t('account.passwordChanged'));
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(t('account.passwordChangeError'));
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success(t('account.signOutSuccess'));
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast.error(t('account.signOutError'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Persönliche Daten */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{t('account.personalData')}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t('account.personalDataDesc')}
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {initialLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">{t('account.name')}</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={t('account.namePlaceholder')}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('account.emailPlaceholder')}
                  />
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center space-x-2">
                {autoSaving && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{t('account.saving')}</span>
                  </>
                )}
                {lastSaved && !autoSaving && (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">
                      {t('account.saved', { 
                        time: lastSaved.toLocaleTimeString('de-DE', { 
                          hour: '2-digit', 
                          minute: '2-digit', 
                          second: '2-digit' 
                        })
                      })}
                    </span>
                  </>
                )}
              </div>
              
              <Button 
                onClick={handleSave} 
                disabled={loading || autoSaving}
                className="min-w-[100px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('account.saving')}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {t('account.save')}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sicherheit */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-xl">{t('account.security')}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t('account.securityDesc')}
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium">{t('account.changePassword')}</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t('account.newPassword')}</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('account.newPasswordPlaceholder')}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('account.confirmPasswordPlaceholder')}
                  />
                </div>
                
                <Button 
                  onClick={handlePasswordChange}
                  disabled={passwordChangeLoading || !newPassword || !confirmPassword}
                  variant="outline"
                >
                  {passwordChangeLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('account.passwordChanging')}
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      {t('account.changePasswordButton')}
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-medium">{t('account.passwordReset')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('account.passwordResetDesc')}
              </p>
              <Button 
                onClick={handlePasswordReset}
                disabled={passwordResetLoading || !email}
                variant="outline"
              >
                {passwordResetLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('account.resetEmailSending')}
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    {t('account.sendResetEmail')}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* RAG System Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-xl">RAG System Management</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage knowledge base, embeddings and AI content expansion
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <RAGEmbeddingManagerComponent />
          </CardContent>
        </Card>

        {/* Abmelden */}
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <Button 
              onClick={handleSignOut}
              variant="outline"
              className="w-full border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t('account.signOut')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Account;
