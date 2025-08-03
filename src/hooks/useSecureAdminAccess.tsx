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

        // First try direct admin check by user ID and email
        const { data: directCheck, error: directError } = await supabase.rpc('is_super_admin', {
          user_uuid: user.id
        });

        if (!directError && directCheck) {
          setIsAdmin(true);
          secureLogger.info('Admin access granted via direct check', {
            userId: user.id,
            resource
          });
          return;
        }

        // Fallback to email-based admin check
        const { data: emailAdmins, error: emailError } = await supabase
          .from('admin_emails')
          .select('*')
          .eq('email', user.email)
          .eq('is_active', true)
          .single();

        if (!emailError && emailAdmins) {
          setIsAdmin(true);
          secureLogger.info('Admin access granted via email check', {
            userId: user.id,
            email: user.email,
            resource
          });
          return;
        }

        // Final fallback to validate_admin_access RPC
        const { data, error: rpcError } = await supabase.rpc('validate_admin_access', {
          p_resource: resource || 'admin_panel'
        });

        if (rpcError) {
          secureLogger.error('Admin access validation failed', {
            error: rpcError,
            userId: user.id,
            resource
          });
          setError('Failed to verify admin access');
          setIsAdmin(false);
        } else {
          setIsAdmin(data || false);
          
          // Log successful verification
          if (data) {
            secureLogger.info('Admin access granted', {
              userId: user.id,
              resource
            });
          }
        }
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