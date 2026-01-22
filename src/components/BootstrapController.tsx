import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBootGate } from '@/hooks/useBootGate';
import { Loader2 } from 'lucide-react';

interface BootstrapControllerProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const BootstrapController: React.FC<BootstrapControllerProps> = ({ 
  children, 
  fallback 
}) => {
  const gate = useBootGate(2000); // 2s Watchdog (reduced from 4s)
  const { user, session, isSessionReady } = useAuth();
  
  // Simplified: Auth ready + gate ready/degraded = show dashboard
  const showDashboard = isSessionReady && !!user && !!session && (gate.ready || gate.degraded);

  if (!showDashboard) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <div className="text-sm text-muted-foreground">
            Initialisiere...
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};