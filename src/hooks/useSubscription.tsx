
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { secureLogger } from '@/utils/secureLogger';

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
  refreshSubscription: (forceRefresh?: boolean) => Promise<void>;
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
  // Force refresh function
  forceRefreshSubscription: () => Promise<void>;
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

  const refreshSubscription = async (forceRefresh = false) => {
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
      secureLogger.info('Refreshing subscription status', { 
        hasUserId: !!user.id, 
        hasEmail: !!user.email,
        forceRefresh 
      });
      
      // Level 1: Try Edge Function first
      let subscriptionData = null;
      let edgeFunctionError = null;
      
      try {
        const { data, error } = await supabase.functions.invoke('check-subscription', {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          }
        });

        if (error) {
          edgeFunctionError = error;
          secureLogger.error('Subscription Edge function error', error);
        } else {
          subscriptionData = data;
          secureLogger.info('Subscription Edge function response received');
        }
      } catch (error) {
        edgeFunctionError = error;
        secureLogger.error('Subscription Edge function failed', error);
      }

      // Level 2: Fallback to direct database query if Edge Function fails
      if (!subscriptionData && edgeFunctionError) {
        secureLogger.info('Falling back to direct database query');
        
        try {
          const { data: dbData, error: dbError } = await supabase
            .from('subscribers')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (dbError && dbError.code !== 'PGRST116') {
            secureLogger.error('Database fallback error', dbError);
          } else if (dbData) {
            subscriptionData = {
              subscribed: dbData.subscribed,
              subscription_tier: dbData.subscription_tier,
              subscription_end: dbData.subscription_end
            };
            secureLogger.info('Database fallback successful', {
              subscribed: dbData.subscribed,
              subscription_tier: dbData.subscription_tier,
              subscription_end: dbData.subscription_end
            });
          } else {
            secureLogger.info('No subscription found in database');
            subscriptionData = {
              subscribed: false,
              subscription_tier: null,
              subscription_end: null
            };
          }
        } catch (dbError) {
          secureLogger.error('Database fallback failed', dbError);
          throw dbError;
        }
      }

      // Check trial status
      const { data: trialData, error: trialError } = await supabase
        .from('user_trials')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('trial_type', 'premium')
        .maybeSingle();

      if (trialError && trialError.code !== 'PGRST116') {
        secureLogger.error('Error checking trial', trialError);
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

      const isSubscribed = subscriptionData?.subscribed || false;
      const premium = isSubscribed || hasActiveTrial;
      const basic = !premium;

      secureLogger.info('Subscription Final status', {
        isSubscribed,
        subscriptionTier: subscriptionData?.subscription_tier,
        hasActiveTrial,
        premium,
        basic
      });

      setIsPremium(premium);
      setIsBasic(basic);
      setSubscriptionTier(subscriptionData?.subscription_tier || (hasActiveTrial ? 'premium' : null));
      setSubscriptionEnd(subscriptionData?.subscription_end || null);
      setTrial({
        hasActiveTrial,
        trialExpiry,
        trialDaysLeft,
      });
    } catch (error) {
      secureLogger.error('Error checking subscription', error);
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
        secureLogger.error('Error starting trial', error);
        return false;
      }

      await refreshSubscription();
      return true;
    } catch (error) {
      secureLogger.error('Error starting premium trial', error);
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
      secureLogger.error('Error creating checkout session', error);
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
      secureLogger.error('Error creating portal session', error);
    }
  };

  // Debug functions
  const isInDebugMode = () => debugMode && debugTier !== null;
  
  const setDebugTier = (tier: string) => {
    secureLogger.debug('Subscription Debug: Switching to tier', { tier });
    setDebugMode(true);
    setDebugTierState(tier);
  };
  
  const clearDebugMode = () => {
    secureLogger.debug('Subscription Debug: Clearing debug mode, returning to real subscription status');
    setDebugMode(false);
    setDebugTierState(null);
  };

  // NEW: Create debug subscription entry for Edge Functions
  const createDebugSubscription = async () => {
    if (!user || !debugTier) return;

    try {
      secureLogger.debug('Subscription Debug: Creating debug subscription entry', { debugTier });
      
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
        secureLogger.error('Error creating debug subscription', error);
      } else {
        secureLogger.debug('Subscription Debug: Debug subscription created successfully');
      }
    } catch (error) {
      secureLogger.error('Error in createDebugSubscription', error);
    }
  };

  // NEW: Clear debug subscription entry
  const clearDebugSubscription = async () => {
    if (!user) return;

    try {
      secureLogger.debug('Subscription Debug: Clearing debug subscription entry');
      
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
        secureLogger.error('Error clearing debug subscription', error);
      } else {
        secureLogger.debug('Subscription Debug: Debug subscription cleared successfully');
      }
    } catch (error) {
      secureLogger.error('Error in clearDebugSubscription', error);
    }
  };

  // Auto-create debug subscription when debug tier changes
  useEffect(() => {
    if (isInDebugMode() && user) {
      createDebugSubscription();
    }
  }, [debugTier, user]);

  // Force refresh function for admin use
  const forceRefreshSubscription = async () => {
    secureLogger.debug('Force refreshing subscription');
    await refreshSubscription(true);
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

  // Auto-refresh subscription every 30 seconds when user is logged in, but only if not in error state
  useEffect(() => {
    if (!user) return;
    
    let consecutiveErrors = 0;
    const maxErrors = 3;
    
    // Increase interval from 30 seconds to 5 minutes to avoid interrupting user input
    const interval = setInterval(async () => {
      try {
        secureLogger.debug('Auto-refreshing subscription');
        await refreshSubscription();
        consecutiveErrors = 0; // Reset error count on success
      } catch (error) {
        consecutiveErrors++;
        secureLogger.error(`Auto-refresh failed (${consecutiveErrors}/${maxErrors})`, error);
        
        // Stop auto-refresh after too many consecutive errors
        if (consecutiveErrors >= maxErrors) {
          secureLogger.error('Stopping auto-refresh due to consecutive errors');
          clearInterval(interval);
        }
      }
    }, 300000); // Changed from 30000 (30 seconds) to 300000 (5 minutes)

    return () => clearInterval(interval);
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
    // Force refresh
    forceRefreshSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
