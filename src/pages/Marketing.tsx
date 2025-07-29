import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import EmailMarketingAdmin from '@/components/EmailMarketingAdmin';

// Cache für Marketing-Rolle
const marketingRoleCache = new Map<string, { hasRole: boolean; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 Minuten

const Marketing = () => {
  const { user, loading } = useAuth();
  const [hasMarketingRole, setHasMarketingRole] = useState<boolean | null>(null);
  const checkInProgress = useRef(false);

  useEffect(() => {
    const checkMarketingRole = async () => {
      if (!user?.id || checkInProgress.current) {
        return;
      }

      // Cache-Check
      const cacheKey = user.id;
      const cached = marketingRoleCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setHasMarketingRole(cached.hasRole);
        return;
      }

      checkInProgress.current = true;

      try {
        const { data, error } = await supabase.rpc('current_user_has_role', {
          _role: 'marketing'
        });
        
        if (error) {
          console.error('Marketing role check error:', error.message);
          setHasMarketingRole(false);
          marketingRoleCache.set(cacheKey, { hasRole: false, timestamp: Date.now() });
        } else {
          setHasMarketingRole(data);
          marketingRoleCache.set(cacheKey, { hasRole: data, timestamp: Date.now() });
        }
      } catch (error) {
        console.error('Marketing role check failed:', error);
        setHasMarketingRole(false);
        marketingRoleCache.set(cacheKey, { hasRole: false, timestamp: Date.now() });
      } finally {
        checkInProgress.current = false;
      }
    };

    if (user && !loading) {
      checkMarketingRole();
    }
  }, [user?.id, loading]);

  // Show loading while auth or permission check is in progress
  if (loading || hasMarketingRole === null) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Check if user has marketing role
  if (!user || !hasMarketingRole) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="w-full h-full min-h-screen p-0 m-0">
      <EmailMarketingAdmin />
    </div>
  );
};

export default Marketing;