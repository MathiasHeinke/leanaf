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
      if (!user?.email) {
        console.log('No user or email found');
        setIsSuperAdmin(false);
        return;
      }

      console.log('Checking super admin status for:', user.email);

      try {
        // Direct query to admin_emails table instead of RPC function
        const { data, error } = await supabase
          .from('admin_emails')
          .select('role, is_active')
          .eq('email', user.email)
          .eq('is_active', true)
          .in('role', ['super_admin', 'admin'])
          .single();
        
        if (error) {
          console.log('No admin record found for email:', user.email);
          setIsSuperAdmin(false);
        } else {
          console.log('Admin record found:', data);
          setIsSuperAdmin(true);
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