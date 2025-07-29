import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import EmailMarketingAdmin from '@/components/EmailMarketingAdmin';

const Marketing = () => {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user) {
        setIsSuperAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('is_super_admin_by_email');
        if (error) {
          console.error('Error checking super admin status:', error);
          setIsSuperAdmin(false);
        } else {
          setIsSuperAdmin(data);
        }
      } catch (error) {
        console.error('Error checking super admin status:', error);
        setIsSuperAdmin(false);
      }
    };

    checkSuperAdmin();
  }, [user]);

  // Show loading while checking permissions
  if (isSuperAdmin === null) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Check if user is super admin
  if (!user || !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <EmailMarketingAdmin />
    </div>
  );
};

export default Marketing;