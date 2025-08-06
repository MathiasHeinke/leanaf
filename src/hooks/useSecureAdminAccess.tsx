import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { secureLogger } from '@/utils/secureLogger';

interface AdminAccessResult {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export const useSecureAdminAccess = (resource?: string): AdminAccessResult => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (authLoading) return;
      
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // SECURITY FIX: Use improved admin access validation
        const { data: isAdmin, error: adminError } = await supabase.rpc('has_admin_access', {
          user_uuid: user.id
        });

        if (!adminError && isAdmin) {
          setIsAdmin(true);
          secureLogger.info('Admin access granted', {
            userId: user.id,
            resource,
            timestamp: new Date().toISOString()
          });
          
          // Log admin access attempt for security monitoring
          await supabase.rpc('log_security_event_enhanced', {
            p_user_id: user.id,
            p_event_type: 'admin_access_granted',
            p_event_category: 'authorization',
            p_severity: 'info',
            p_metadata: {
              resource,
              access_method: 'role_based'
            }
          });
          
          return;
        }

        // If no admin access found, deny and log attempt
        setIsAdmin(false);
        
        // Log failed admin access attempt for security monitoring
        await supabase.rpc('log_security_event_enhanced', {
          p_user_id: user.id,
          p_event_type: 'admin_access_denied',
          p_event_category: 'authorization',
          p_severity: 'warning',
          p_metadata: {
            resource,
            reason: 'insufficient_privileges',
            attempted_at: new Date().toISOString()
          }
        });

        secureLogger.security('Admin access denied', {
          userId: user.id,
          resource,
          reason: 'insufficient_privileges'
        });
      } catch (err) {
        secureLogger.error('Admin access check error', {
          error: err,
          userId: user?.id,
          resource
        });
        setError('An error occurred while checking admin access');
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [user, authLoading, resource]);

  return { isAdmin, loading, error };
};