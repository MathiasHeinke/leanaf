import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useBootstrap } from '@/hooks/useBootstrap';
import { useBootGate } from '@/hooks/useBootGate';
import { Loader2 } from 'lucide-react';

interface BootstrapState {
  authReady: boolean;
  profileLoaded: boolean;
  bootstrapComplete: boolean;
  hasErrors: boolean;
  errorMessage?: string;
}

interface BootstrapControllerProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const BootstrapController: React.FC<BootstrapControllerProps> = ({ 
  children, 
  fallback 
}) => {
  const gate = useBootGate(4000); // 4s Watchdog
  
  // Old logic for reference (still used for state tracking but not blocking)
  const { user, session, isSessionReady, loading: authLoading } = useAuth();
  const { profileData, isLoading: profileLoading, error: profileError } = useUserProfile();
  const bootstrapState = useBootstrap();
  
  const [state, setState] = useState<BootstrapState>({
    authReady: false,
    profileLoaded: false,
    bootstrapComplete: false,
    hasErrors: false
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // Monitor auth readiness (for debug/state tracking only)
  useEffect(() => {
    const authReady = isSessionReady && !!user && !!session && !authLoading;
    setState(prev => ({ ...prev, authReady }));
  }, [isSessionReady, user, session, authLoading]);

  // Monitor profile loading (for debug/state tracking only) 
  useEffect(() => {
    const profileLoaded = !profileLoading && !profileError;
    setState(prev => ({ ...prev, profileLoaded }));
  }, [profileLoading, profileError, profileData]);

  // Monitor bootstrap completion (for debug/state tracking only)
  useEffect(() => {
    const bootstrapComplete = bootstrapState.bootstrapComplete && !bootstrapState.isBootstrapping;
    setState(prev => ({ ...prev, bootstrapComplete }));
  }, [bootstrapState]);

  // NEW LOGIC: Auth must be ready AND (gate ready OR degraded)
  const authReady = isSessionReady && !!user && !!session;
  const showDashboard = authReady && (gate.ready || gate.degraded);
  const showLoading = !showDashboard;

  // Debug logging
  useEffect(() => {
    console.log('🚀 BootstrapController State:', {
      gate: { ready: gate.ready, degraded: gate.degraded, reason: gate.reason },
      legacy: {
        authReady: state.authReady,
        profileLoaded: state.profileLoaded,
        bootstrapComplete: state.bootstrapComplete
      },
      showDashboard,
      userEmail: user?.email,
      profileExists: !!profileData
    });
  }, [gate, state, showDashboard, user, profileData]);

  if (showLoading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <div className="text-sm text-muted-foreground">
            Initialisiere...
          </div>
          <div className="text-xs text-muted-foreground">
            {gate.reason && `Status: ${gate.reason}`}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
    </>
  );
};