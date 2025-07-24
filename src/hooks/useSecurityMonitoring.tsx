import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SecurityEventData {
  event_type: string;
  event_category?: string;
  metadata?: Record<string, any>;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

export const useSecurityMonitoring = () => {
  const { user } = useAuth();

  const logSecurityEvent = useCallback(async (eventData: SecurityEventData) => {
    try {
      // Get client information
      const userAgent = navigator.userAgent;
      const timestamp = new Date().toISOString();
      
      // Get IP address (will be handled server-side in production)
      let ipAddress = null;
      try {
        // This is a simplified approach - in production, IP should be captured server-side
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        ipAddress = data.ip;
      } catch (error) {
        console.warn('Could not fetch IP address:', error);
      }

      const { error } = await supabase.rpc('log_security_event_enhanced', {
        p_user_id: user?.id || null,
        p_event_type: eventData.event_type,
        p_event_category: eventData.event_category || 'auth',
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_metadata: {
          ...eventData.metadata,
          timestamp,
          url: window.location.href,
          referer: document.referrer,
        },
        p_severity: eventData.severity || 'info',
      });

      if (error) {
        console.error('Failed to log security event:', error);
      }
    } catch (error) {
      console.error('Error in security monitoring:', error);
    }
  }, [user]);

  const logAuthAttempt = useCallback(async (
    action: 'sign_in' | 'sign_up' | 'sign_out' | 'password_reset',
    success: boolean,
    additionalData?: Record<string, any>
  ) => {
    await logSecurityEvent({
      event_type: `auth_${action}_${success ? 'success' : 'failure'}`,
      event_category: 'auth',
      severity: success ? 'info' : 'warning',
      metadata: {
        action,
        success,
        ...additionalData,
      },
    });
  }, [logSecurityEvent]);

  const logSuspiciousActivity = useCallback(async (
    activity: string,
    details?: Record<string, any>
  ) => {
    await logSecurityEvent({
      event_type: 'suspicious_activity',
      event_category: 'security',
      severity: 'error',
      metadata: {
        activity,
        ...details,
      },
    });
  }, [logSecurityEvent]);

  const logPasswordChange = useCallback(async (success: boolean) => {
    await logSecurityEvent({
      event_type: `password_change_${success ? 'success' : 'failure'}`,
      event_category: 'auth',
      severity: success ? 'info' : 'warning',
      metadata: {
        action: 'password_change',
        success,
      },
    });
  }, [logSecurityEvent]);

  const logDataAccess = useCallback(async (
    resource: string,
    action: 'read' | 'write' | 'delete',
    success: boolean
  ) => {
    await logSecurityEvent({
      event_type: `data_access_${action}_${success ? 'success' : 'failure'}`,
      event_category: 'data',
      severity: success ? 'info' : 'warning',
      metadata: {
        resource,
        action,
        success,
      },
    });
  }, [logSecurityEvent]);

  const logRateLimitExceeded = useCallback(async (
    endpoint: string,
    limit: number
  ) => {
    await logSecurityEvent({
      event_type: 'rate_limit_exceeded',
      event_category: 'security',
      severity: 'warning',
      metadata: {
        endpoint,
        limit,
      },
    });
  }, [logSecurityEvent]);

  return {
    logSecurityEvent,
    logAuthAttempt,
    logSuspiciousActivity,
    logPasswordChange,
    logDataAccess,
    logRateLimitExceeded,
  };
};