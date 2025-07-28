import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Navigate } from 'react-router-dom';
import EmailMarketingAdmin from '@/components/EmailMarketingAdmin';

const Marketing = () => {
  const { user } = useAuth();
  const { subscription } = useSubscription();

  // Check if user is super admin
  if (!user || subscription?.tier !== 'Super Admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <EmailMarketingAdmin />
    </div>
  );
};

export default Marketing;