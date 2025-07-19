import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, Save, Loader2, Shield, Mail, Key, Smartphone, LogOut, Crown, User } from 'lucide-react';

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
      toast.success('Profil erfolgreich gespeichert');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error('Fehler beim Speichern des Profils');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      toast.error('Bitte geben Sie Ihre E-Mail-Adresse ein');
      return;
    }

    setPasswordResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`
      });
      
      if (error) throw error;
      toast.success('Passwort-Reset-E-Mail wurde gesendet');
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      toast.error('Fehler beim Senden der Passwort-Reset-E-Mail');
    } finally {
      setPasswordResetLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Bitte füllen Sie alle Passwort-Felder aus');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Die Passwörter stimmen nicht überein');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Das Passwort muss mindestens 6 Zeichen lang sein');
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
      toast.success('Passwort erfolgreich geändert');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error('Fehler beim Ändern des Passworts');
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Erfolgreich abgemeldet');
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast.error('Fehler beim Abmelden');
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
                <CardTitle className="text-xl">Persönliche Daten</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Verwalten Sie Ihre grundlegenden Informationen
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
                  <Label htmlFor="displayName">Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ihr vollständiger Name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ihre.email@beispiel.de"
                  />
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center space-x-2">
                {autoSaving && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Wird gespeichert...</span>
                  </>
                )}
                {lastSaved && !autoSaving && (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">
                      Gespeichert {lastSaved.toLocaleTimeString('de-DE', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit' 
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
                    Speichern...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Speichern
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
                <CardTitle className="text-xl">Sicherheit</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Passwort und Sicherheitseinstellungen
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium">Passwort ändern</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Neues Passwort</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mindestens 6 Zeichen"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Passwort wiederholen"
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
                      Wird geändert...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Passwort ändern
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-medium">Passwort zurücksetzen</h3>
              <p className="text-sm text-muted-foreground">
                Eine E-Mail mit Anweisungen zum Zurücksetzen wird an Ihre E-Mail-Adresse gesendet.
              </p>
              <Button 
                onClick={handlePasswordReset}
                disabled={passwordResetLoading || !email}
                variant="outline"
              >
                {passwordResetLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Wird gesendet...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Reset-E-Mail senden
                  </>
                )}
              </Button>
            </div>
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
              Abmelden
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Account;