import React, { useEffect } from 'react';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';
import { secureLogger } from '@/utils/secureLogger';

interface SecurityManagerProps {
  children: React.ReactNode;
}

export const EnhancedSecurityManager: React.FC<SecurityManagerProps> = ({ children }) => {
  const { logSecurityEvent } = useSecurityMonitoring();

  useEffect(() => {
    // Monitor for suspicious activity patterns
    const monitorSuspiciousActivity = () => {
      // Monitor for rapid navigation (possible bot activity)
      let navigationCount = 0;
      const navigationWindow = 30000; // 30 seconds
      
      const resetNavigationCount = () => {
        navigationCount = 0;
      };
      
      const handleNavigation = () => {
        navigationCount++;
        if (navigationCount > 10) {
          secureLogger.security('Suspicious navigation pattern detected', {
            count: navigationCount,
            timeWindow: navigationWindow
          });
          
          logSecurityEvent({
            event_type: 'suspicious_navigation',
            event_category: 'security',
            severity: 'warning',
            metadata: {
              navigation_count: navigationCount,
              time_window: navigationWindow,
              user_agent: navigator.userAgent
            }
          });
        }
        
        setTimeout(resetNavigationCount, navigationWindow);
      };
      
      // Listen for navigation events
      window.addEventListener('popstate', handleNavigation);
      
      return () => {
        window.removeEventListener('popstate', handleNavigation);
      };
    };
    
    const cleanup = monitorSuspiciousActivity();
    
    // Monitor for failed network requests (possible attacks)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('fetch') || 
          event.reason?.message?.includes('network')) {
        logSecurityEvent({
          event_type: 'network_error',
          event_category: 'security',
          severity: 'info',
          metadata: {
            error_message: event.reason.message,
            url: window.location.href,
            timestamp: new Date().toISOString()
          }
        });
      }
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      cleanup();
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [logSecurityEvent]);

  return <>{children}</>;
};