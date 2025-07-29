import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import EmailMarketingAdmin from '@/components/EmailMarketingAdmin';

const Marketing = () => {
  const { user } = useAuth();
  const [hasMarketingRole, setHasMarketingRole] = useState<boolean | null>(null);

  useEffect(() => {
    const checkMarketingRole = async () => {
      if (!user) {
        console.log('No user found, waiting for auth...');
        return; // Don't set false immediately, wait for auth to complete
      }

      console.log('Checking marketing role for user:', user.id);

      try {
        // Check if user has marketing role using RPC function
        const { data, error } = await supabase.rpc('current_user_has_role', {
          _role: 'marketing'
        });
        
        if (error) {
          console.error('Error checking marketing role:', error);
          setHasMarketingRole(false);
        } else {
          console.log('Marketing role check result:', data);
          setHasMarketingRole(data);
        }
      } catch (error) {
        console.error('Error checking marketing role:', error);
        setHasMarketingRole(false);
      }
    };

    // Only check if we have a user, otherwise wait
    if (user !== undefined) {
      checkMarketingRole();
    }
  }, [user]);

  // Show loading while checking permissions
  if (hasMarketingRole === null) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Check if user has marketing role
  if (!user || !hasMarketingRole) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="w-full max-w-none px-8 py-6">
      <EmailMarketingAdmin />
    </div>
  );
};

export default Marketing;