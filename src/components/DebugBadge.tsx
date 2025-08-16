import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useBootstrap } from '@/hooks/useBootstrap';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface DebugBadgeProps {
  show?: boolean;
  compact?: boolean;
}

export const DebugBadge: React.FC<DebugBadgeProps> = ({ 
  show = process.env.NODE_ENV === 'development', 
  compact = false 
}) => {
  const { user, session, isSessionReady, loading: authLoading } = useAuth();
  const { profileData, isLoading: profileLoading, error: profileError } = useUserProfile();
  const bootstrapState = useBootstrap();

  if (!show) return null;

  const getStatusBadge = (condition: boolean, loading: boolean = false) => {
    if (loading) return <Badge variant="secondary">⏳</Badge>;
    return condition ? <Badge variant="default">✅</Badge> : <Badge variant="destructive">❌</Badge>;
  };

  if (compact) {
    return (
      <div className="fixed bottom-4 left-4 bg-background/90 border rounded-lg p-2 text-xs font-mono z-50">
        <div className="flex gap-2 items-center">
          {getStatusBadge(!!user && !!session, authLoading)}
          <span>Auth</span>
          {getStatusBadge(!!profileData && !profileError, profileLoading)}
          <span>Profile</span>
          {getStatusBadge(bootstrapState.bootstrapComplete, bootstrapState.isBootstrapping)}
          <span>Bootstrap</span>
        </div>
      </div>
    );
  }

  return (
    <Card className="fixed bottom-4 left-4 p-3 text-xs font-mono z-50 bg-background/95 backdrop-blur-sm">
      <div className="space-y-2">
        <div className="font-semibold text-primary">Debug Status</div>
        
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span>👤 User:</span>
            <div className="flex items-center gap-1">
              {getStatusBadge(!!user, authLoading)}
              <span className="text-muted-foreground">
                {user?.email || 'none'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between gap-2">
            <span>🪪 Session:</span>
            <div className="flex items-center gap-1">
              {getStatusBadge(!!session && isSessionReady, authLoading)}
              <span className="text-muted-foreground">
                {isSessionReady ? 'ready' : 'pending'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between gap-2">
            <span>📋 Profile:</span>
            <div className="flex items-center gap-1">
              {getStatusBadge(!!profileData && !profileError, profileLoading)}
              <span className="text-muted-foreground">
                {profileError ? 'error' : profileData ? 'loaded' : 'none'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between gap-2">
            <span>🚀 Bootstrap:</span>
            <div className="flex items-center gap-1">
              {getStatusBadge(bootstrapState.bootstrapComplete, bootstrapState.isBootstrapping)}
              <span className="text-muted-foreground">
                {bootstrapState.error ? 'error' : 
                 bootstrapState.bootstrapComplete ? 'done' : 
                 bootstrapState.isBootstrapping ? 'running' : 'pending'}
              </span>
            </div>
          </div>
        </div>

        {(profileError || bootstrapState.error) && (
          <div className="mt-2 pt-2 border-t">
            <div className="text-destructive text-xs">
              {profileError || bootstrapState.error}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};