import React, { useState } from 'react';
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

  const handleQuickLogin = async () => {
    if (!password) {
      toast.error('Please enter password');
      return;
    }

    setIsLoggingIn(true);
    try {
      console.log('🔑 Attempting login for:', email);
      
      // Clean up any existing auth state first
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (e) {
        console.log('Previous signout failed (expected if not logged in)');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Login error:', error);
        toast.error(`Login failed: ${error.message}`);
      } else {
        console.log('✅ Login successful:', data);
        toast.success('Logged in successfully');
        // Force page reload to ensure clean state
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
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
      
      // Clean up local storage
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      toast.success('Signed out');
      window.location.href = '/auth';
    } catch (error) {
      console.error('❌ Sign out error:', error);
      toast.error('Sign out failed');
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
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleQuickLogin()}
            />
            <Button 
              onClick={handleQuickLogin} 
              disabled={isLoggingIn}
              className="w-full"
            >
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
      </CardContent>
    </Card>
  );
};