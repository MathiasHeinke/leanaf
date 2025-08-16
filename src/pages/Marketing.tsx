
import React from 'react';
import { Navigate } from 'react-router-dom';
import EmailMarketingAdmin from '@/components/EmailMarketingAdmin';
import { useSecureAdminAccess } from '@/hooks/useSecureAdminAccess';

const Marketing = () => {
  const { isAdmin, loading, error } = useSecureAdminAccess('marketing_admin');

  // Show loading while auth or permission check is in progress
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // If not admin, redirect to home
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="w-full h-full min-h-screen p-0 m-0">
      <EmailMarketingAdmin />
    </div>
  );
};

export default Marketing;
