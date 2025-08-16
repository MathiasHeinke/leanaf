import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export const AuthDebugPanel = () => {
  const { user, session, loading, isSessionReady } = useAuth();
  const [email, setEmail] = useState('office@mathiasheinke.de');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Super admin deletion helpers
  const [delEmail, setDelEmail] = useState('heinkemathias@icloud.com');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) { setIsSuperAdmin(null); return; }
      try {
        const { data, error } = await supabase.rpc('is_super_admin', { user_uuid: user.id });
        if (!mounted) return;
        if (error) {
          console.warn('is_super_admin RPC error:', error);
          setIsSuperAdmin(false);
        } else {
          setIsSuperAdmin(!!data);
        }
      } catch (e) {
        if (mounted) setIsSuperAdmin(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.id]);

  const handleQuickLogin = async () => {
    if (!password) {
      toast.error('Please enter password');
      return;
    }

    setIsLoggingIn(true);
    try {
      console.log('🔑 Attempting login for:', email);
      try { await supabase.auth.signOut({ scope: 'global' }); } catch {}
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('❌ Login error:', error);
        toast.error(`Login failed: ${error.message}`);
      } else {
        console.log('✅ Login successful:', data);
        toast.success('Logged in successfully');
        setTimeout(() => { window.location.href = '/'; }, 600);
      }
    } catch (error) {
      console.error('❌ Login exception:', error);
      toast.error('Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      console.log('🚪 Signing out...');
      await supabase.auth.signOut({ scope: 'global' });
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) localStorage.removeItem(key);
      });
      toast.success('Signed out');
      window.location.href = '/auth';
    } catch (error) {
      console.error('❌ Sign out error:', error);
      toast.error('Sign out failed');
    }
  };

  const handleDeleteByEmail = async () => {
    if (!delEmail) { toast.error('Please enter an email to delete'); return; }
    if (!confirm(`Delete user ${delEmail}? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { email: delEmail, purge: true },
      });
      if (error) throw error as any;
      if ((data as any)?.ok) {
        toast.success(`Deleted ${delEmail}`);
      } else {
        toast.error(`Failed: ${(data as any)?.why || 'unknown error'}`);
      }
    } catch (e: any) {
      console.error('❌ Delete failed:', e);
      toast.error(`Delete failed: ${e?.message || String(e)}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-4">
      <CardHeader>
        <CardTitle>🔍 Auth Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auth State Display */}
        <div className="text-sm space-y-1">
          <div>Loading: {loading ? '✅' : '❌'}</div>
          <div>Session Ready: {isSessionReady ? '✅' : '❌'}</div>
          <div>Has User: {user ? '✅' : '❌'}</div>
          <div>Has Session: {session ? '✅' : '❌'}</div>
          {user && <div>User ID: {user.id}</div>}
          {user && <div>Email: {user.email}</div>}
          {session && <div>Session expires: {new Date(session.expires_at! * 1000).toLocaleString()}</div>}
        </div>

        {/* Quick Login */}
        {!user && (
          <div className="space-y-2">
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleQuickLogin()} />
            <Button onClick={handleQuickLogin} disabled={isLoggingIn} className="w-full">
              {isLoggingIn ? 'Logging in...' : 'Quick Login'}
            </Button>
          </div>
        )}

        {/* Sign Out */}
        {user && (
          <Button onClick={handleSignOut} variant="outline" className="w-full">
            Sign Out
          </Button>
        )}

        {/* Super Admin Tools */}
        {user && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Super Admin Tools {isSuperAdmin === null ? '(checking...)' : isSuperAdmin ? '✅' : '❌'}</div>
            <div className="flex gap-2">
              <Input type="email" placeholder="Email to delete" value={delEmail} onChange={(e) => setDelEmail(e.target.value)} />
              <Button onClick={handleDeleteByEmail} disabled={!isSuperAdmin || isDeleting} variant="destructive">
                {isDeleting ? 'Deleting...' : 'Delete user'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
