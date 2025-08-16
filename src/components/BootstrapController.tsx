import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useBootstrap } from '@/hooks/useBootstrap';
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

  // Monitor auth readiness
  useEffect(() => {
    const authReady = isSessionReady && !!user && !!session && !authLoading;
    
    setState(prev => ({
      ...prev,
      authReady,
      hasErrors: prev.hasErrors || (!authReady && !authLoading && isSessionReady)
    }));
  }, [isSessionReady, user, session, authLoading]);

  // Monitor profile loading
  useEffect(() => {
    const profileLoaded = !profileLoading && !profileError;
    const hasProfileError = !!profileError;

    setState(prev => ({
      ...prev,
      profileLoaded,
      hasErrors: prev.hasErrors || hasProfileError,
      errorMessage: hasProfileError ? profileError : prev.errorMessage
    }));
  }, [profileLoading, profileError, profileData]);

  // Monitor bootstrap completion
  useEffect(() => {
    const bootstrapComplete = bootstrapState.bootstrapComplete && !bootstrapState.isBootstrapping;
    const hasBootstrapError = !!bootstrapState.error;

    setState(prev => ({
      ...prev,
      bootstrapComplete,
      hasErrors: prev.hasErrors || hasBootstrapError,
      errorMessage: hasBootstrapError ? bootstrapState.error : prev.errorMessage
    }));
  }, [bootstrapState]);

  // Check if we're ready to show the app
  const isReady = state.authReady && state.profileLoaded;
  const showLoading = !isReady && !state.hasErrors;

  // Debug logging
  useEffect(() => {
    console.log('🚀 BootstrapController State:', {
      authReady: state.authReady,
      profileLoaded: state.profileLoaded,
      bootstrapComplete: state.bootstrapComplete,
      hasErrors: state.hasErrors,
      isReady,
      userEmail: user?.email,
      profileExists: !!profileData
    });
  }, [state, isReady, user, profileData]);

  if (state.hasErrors && state.errorMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-destructive text-lg font-medium">
            Fehler beim Laden der App
          </div>
          <div className="text-muted-foreground text-sm">
            {state.errorMessage}
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Neu laden
          </button>
        </div>
      </div>
    );
  }

  if (showLoading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <div className="text-sm text-muted-foreground">
            App wird geladen...
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>✓ Auth: {state.authReady ? 'Bereit' : 'Lädt...'}</div>
            <div>✓ Profil: {state.profileLoaded ? 'Geladen' : 'Lädt...'}</div>
            <div>✓ Bootstrap: {state.bootstrapComplete ? 'Fertig' : 'Lädt...'}</div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};