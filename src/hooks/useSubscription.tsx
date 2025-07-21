
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SubscriptionContextType {
  isPremium: boolean;
  subscriptionTier: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
  createCheckoutSession: () => Promise<void>;
  createPortalSession: () => Promise<void>;
  // Debug functions
  isInDebugMode: () => boolean;
  debugTier: string | null;
  setDebugTier: (tier: string) => void;
  clearDebugMode: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Debug state
  const [debugMode, setDebugMode] = useState(false);
  const [debugTier, setDebugTierState] = useState<string | null>(null);
  
  const { user } = useAuth();

  const refreshSubscription = async () => {
    if (!user) {
      setIsPremium(false);
      setSubscriptionTier(null);
      setSubscriptionEnd(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;

      setIsPremium(data?.subscribed || false);
      setSubscriptionTier(data?.subscription_tier || null);
      setSubscriptionEnd(data?.subscription_end || null);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setIsPremium(false);
      setSubscriptionTier(null);
      setSubscriptionEnd(null);
    } finally {
      setLoading(false);
    }
  };

  const createCheckoutSession = async (plan?: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { plan: plan || 'premium' },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    }
  };

  const createPortalSession = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: { user_id: user.id },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
    }
  };

  // Debug functions
  const isInDebugMode = () => debugMode && debugTier !== null;
  
  const setDebugTier = (tier: string) => {
    console.log(`[Subscription Debug] Switching to tier: ${tier}`);
    setDebugMode(true);
    setDebugTierState(tier);
  };
  
  const clearDebugMode = () => {
    console.log('[Subscription Debug] Clearing debug mode, returning to real subscription status');
    setDebugMode(false);
    setDebugTierState(null);
  };
  
  // Clear debug mode on logout
  useEffect(() => {
    if (!user) {
      clearDebugMode();
    }
  }, [user]);

  useEffect(() => {
    refreshSubscription();
  }, [user]);

  // Override values when in debug mode
  const getIsPremium = () => {
    if (isInDebugMode() && debugTier) {
      return ['basic', 'premium', 'enterprise'].includes(debugTier.toLowerCase());
    }
    return isPremium;
  };
  
  const getSubscriptionTier = () => {
    if (isInDebugMode() && debugTier) {
      return debugTier;
    }
    return subscriptionTier;
  };

  const value = {
    isPremium: getIsPremium(),
    subscriptionTier: getSubscriptionTier(),
    subscriptionEnd,
    loading,
    refreshSubscription,
    createCheckoutSession,
    createPortalSession,
    // Debug functions
    isInDebugMode,
    debugTier,
    setDebugTier,
    clearDebugMode,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
