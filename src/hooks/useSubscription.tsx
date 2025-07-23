
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TrialData {
  hasActiveTrial: boolean;
  trialExpiry: Date | null;
  trialDaysLeft: number;
}

interface SubscriptionContextType {
  isPremium: boolean;
  isBasic: boolean;
  subscriptionTier: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
  trial: TrialData;
  refreshSubscription: () => Promise<void>;
  createCheckoutSession: () => Promise<void>;
  createPortalSession: () => Promise<void>;
  startPremiumTrial: () => Promise<boolean>;
  // Debug functions
  isInDebugMode: () => boolean;
  debugTier: string | null;
  setDebugTier: (tier: string) => void;
  clearDebugMode: () => void;
  // New debug functions for Edge Functions
  createDebugSubscription: () => Promise<void>;
  clearDebugSubscription: () => Promise<void>;
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
  const [isBasic, setIsBasic] = useState(true);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [trial, setTrial] = useState<TrialData>({
    hasActiveTrial: false,
    trialExpiry: null,
    trialDaysLeft: 0,
  });
  
  // Debug state
  const [debugMode, setDebugMode] = useState(false);
  const [debugTier, setDebugTierState] = useState<string | null>(null);
  
  const { user } = useAuth();

  const refreshSubscription = async () => {
    if (!user) {
      setIsPremium(false);
      setIsBasic(true);
      setSubscriptionTier(null);
      setSubscriptionEnd(null);
      setTrial({
        hasActiveTrial: false,
        trialExpiry: null,
        trialDaysLeft: 0,
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Check subscription status
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;

      // Check trial status
      const { data: trialData, error: trialError } = await supabase
        .from('user_trials')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('trial_type', 'premium')
        .maybeSingle();

      if (trialError && trialError.code !== 'PGRST116') {
        console.error('Error checking trial:', trialError);
      }

      // Calculate trial status
      let hasActiveTrial = false;
      let trialExpiry: Date | null = null;
      let trialDaysLeft = 0;

      if (trialData && new Date(trialData.expires_at) > new Date()) {
        hasActiveTrial = true;
        trialExpiry = new Date(trialData.expires_at);
        trialDaysLeft = Math.ceil((trialExpiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      }

      const isSubscribed = data?.subscribed || false;
      const premium = isSubscribed || hasActiveTrial;
      const basic = !premium;

      setIsPremium(premium);
      setIsBasic(basic);
      setSubscriptionTier(data?.subscription_tier || (hasActiveTrial ? 'premium' : null));
      setSubscriptionEnd(data?.subscription_end || null);
      setTrial({
        hasActiveTrial,
        trialExpiry,
        trialDaysLeft,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setIsPremium(false);
      setIsBasic(true);
      setSubscriptionTier(null);
      setSubscriptionEnd(null);
      setTrial({
        hasActiveTrial: false,
        trialExpiry: null,
        trialDaysLeft: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const startPremiumTrial = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('user_trials')
        .insert({
          user_id: user.id,
          trial_type: 'premium',
          started_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
        });

      if (error) {
        console.error('Error starting trial:', error);
        return false;
      }

      await refreshSubscription();
      return true;
    } catch (error) {
      console.error('Error starting premium trial:', error);
      return false;
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

  // NEW: Create debug subscription entry for Edge Functions
  const createDebugSubscription = async () => {
    if (!user || !debugTier) return;

    try {
      console.log(`[Subscription Debug] Creating debug subscription entry for tier: ${debugTier}`);
      
      const isPremiumTier = ['basic', 'premium', 'enterprise'].includes(debugTier.toLowerCase());
      
      // Insert or update debug subscription entry
      const { error } = await supabase
        .from('subscribers')
        .upsert({
          user_id: user.id,
          email: user.email || '',
          subscribed: isPremiumTier,
          subscription_tier: isPremiumTier ? debugTier : null,
          subscription_end: isPremiumTier ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error creating debug subscription:', error);
      } else {
        console.log('[Subscription Debug] Debug subscription created successfully');
      }
    } catch (error) {
      console.error('Error in createDebugSubscription:', error);
    }
  };

  // NEW: Clear debug subscription entry
  const clearDebugSubscription = async () => {
    if (!user) return;

    try {
      console.log('[Subscription Debug] Clearing debug subscription entry');
      
      // Reset subscription to free tier
      const { error } = await supabase
        .from('subscribers')
        .upsert({
          user_id: user.id,
          email: user.email || '',
          subscribed: false,
          subscription_tier: null,
          subscription_end: null,
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error clearing debug subscription:', error);
      } else {
        console.log('[Subscription Debug] Debug subscription cleared successfully');
      }
    } catch (error) {
      console.error('Error in clearDebugSubscription:', error);
    }
  };

  // Auto-create debug subscription when debug tier changes
  useEffect(() => {
    if (isInDebugMode() && user) {
      createDebugSubscription();
    }
  }, [debugTier, user]);

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
    isBasic: !getIsPremium(),
    subscriptionTier: getSubscriptionTier(),
    subscriptionEnd,
    loading,
    trial,
    refreshSubscription,
    createCheckoutSession,
    createPortalSession,
    startPremiumTrial,
    // Debug functions
    isInDebugMode,
    debugTier,
    setDebugTier,
    clearDebugMode,
    // New debug functions
    createDebugSubscription,
    clearDebugSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
