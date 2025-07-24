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
      
      // Monitor for console tampering attempts
      const originalConsole = {
        log: console.log,
        warn: console.warn,
        error: console.error
      };
      
      let consoleAccessCount = 0;
      const consoleMonitor = () => {
        consoleAccessCount++;
        if (consoleAccessCount > 5) {
          logSecurityEvent({
            event_type: 'console_tampering_attempt',
            event_category: 'security',
            severity: 'warning',
            metadata: {
              access_count: consoleAccessCount,
              timestamp: new Date().toISOString()
            }
          });
        }
      };
      
      // Override console methods to detect tampering
      Object.defineProperty(console, 'log', {
        get: () => {
          consoleMonitor();
          return originalConsole.log;
        }
      });
      
      return () => {
        window.removeEventListener('popstate', handleNavigation);
        // Restore original console methods
        console.log = originalConsole.log;
        console.warn = originalConsole.warn;
        console.error = originalConsole.error;
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