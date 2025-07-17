import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Crown, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SubscriptionPageProps {
  onClose: () => void;
}

const Subscription = ({ onClose }: SubscriptionPageProps) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('free');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const { user } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (user) {
      loadSubscriptionStatus();
    }
  }, [user]);

  const loadSubscriptionStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSubscriptionStatus(data.subscription_status || 'free');
      }
    } catch (error: any) {
      console.error('Error loading subscription status:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { 
          user_id: user.id,
          price_id: 'price_premium_monthly' // This would be your actual Stripe price ID
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      toast.error('Error starting subscription process');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: { user_id: user.id }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Error creating portal session:', error);
      toast.error('Error accessing subscription management');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    t('subscription.feature1'),
    t('subscription.feature2'),
    t('subscription.feature3'),
    t('subscription.feature4'),
  ];

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>
          <h1 className="text-2xl font-bold">{t('subscription.title')}</h1>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                {t('subscription.currentPlan')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant={subscriptionStatus === 'premium' ? 'default' : 'secondary'}>
                    {subscriptionStatus === 'premium' ? t('subscription.premium') : t('subscription.free')}
                  </Badge>
                </div>
                {subscriptionStatus === 'premium' ? (
                  <Button
                    onClick={handleManageSubscription}
                    disabled={loading}
                    variant="outline"
                  >
                    {loading ? t('subscription.processing') : t('subscription.manage')}
                  </Button>
                ) : (
                  <Button
                    onClick={handleUpgrade}
                    disabled={loading}
                  >
                    {loading ? t('subscription.processing') : t('subscription.upgrade')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {subscriptionStatus === 'free' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  {t('subscription.upgrade')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-2xl font-bold text-primary mb-2">
                    {t('subscription.monthlyPrice')}
                  </p>
                </div>
                
                <div className="space-y-3 mb-6">
                  <h4 className="font-semibold">{t('subscription.features')}</h4>
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? t('subscription.processing') : t('subscription.upgrade')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Subscription;