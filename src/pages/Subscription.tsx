import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Crown, Check, Sparkles, Star, Trophy, Zap, RefreshCw, Settings, CreditCard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SubscriptionPageProps {
  onClose?: () => void;
}

const Subscription = ({ onClose }: SubscriptionPageProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { 
    isPremium, 
    subscriptionTier, 
    subscriptionEnd, 
    loading, 
    createPortalSession,
    refreshSubscription 
  } = useSubscription();

  const [subscribing, setSubscribing] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'sixmonths' | 'yearly'>('monthly');

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    if (user) {
      refreshSubscription();
    }
  }, [user]);

  // Enhanced checkout function with plan selection
  const handleSubscribe = async (plan: string) => {
    if (!user) {
      toast.error('Bitte logge dich ein');
      return;
    }

    setSubscribing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { plan },
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
      toast.error('Fehler beim Erstellen der Checkout Session');
    } finally {
      setSubscribing(false);
    }
  };

  const getPlanId = (base: string) => {
    if (billingPeriod === 'yearly') return `${base}-yearly`;
    if (billingPeriod === 'sixmonths') return `${base}-sixmonths`;
    return base;
  };

  const getPlanPrice = (base: string, monthlyPrice: number) => {
    if (billingPeriod === 'yearly') {
      return base === 'pro' ? '77,40€' : '0€';
    }
    if (billingPeriod === 'sixmonths') {
      const sixMonthPrice = (monthlyPrice * 6 * 0.67); // 33% discount
      return `${(sixMonthPrice / 100).toFixed(2).replace('.', ',')}€`;
    }
    return `${(monthlyPrice / 100).toFixed(2).replace('.', ',')}€`;
  };

  const getPlanPeriod = () => {
    if (billingPeriod === 'yearly') return '/Jahr';
    if (billingPeriod === 'sixmonths') return '/6 Monate';
    return '/Monat';
  };

  const getSavings = (planName: string) => {
    if (billingPeriod === 'yearly') {
      return planName === 'Pro' ? '77,40€' : '0€';
    }
    if (billingPeriod === 'sixmonths') {
      return planName === 'Pro' ? '25,80€' : '0€';
    }
    return null;
  };

  const getOriginalPrice = (planName: string) => {
    if (billingPeriod === 'yearly') {
      return planName === 'Pro' ? '154,80€' : '0€';
    }
    if (billingPeriod === 'sixmonths') {
      return planName === 'Pro' ? '77,40€' : '0€';
    }
    return null;
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '0€',
      period: '',
      originalPrice: null,
      icon: <Star className="h-6 w-6 text-blue-600" />,
      color: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 dark:from-blue-950/20 dark:to-blue-900/30 shadow-lg',
      features: [
        '✨ Meal Tracking',
        '⚖️ Weight Tracking',
        '📊 Basic Dashboard', 
        '🏆 Points & Badges System',
        '🧠 5 AI Meal Analysen/Tag (GPT-4o-mini)',
        '📈 Basic Charts',
        '🤖 1 KI Coach verfügbar'
      ],
      isFree: true
    },
    {
      id: getPlanId('pro'),
      name: 'Pro',
      price: getPlanPrice('pro', 1290),
      period: getPlanPeriod(),
      originalPrice: getOriginalPrice('Pro'),
      icon: <Crown className="h-6 w-6 text-yellow-600" />,
      color: 'bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-100 border-yellow-300 dark:from-yellow-950/20 dark:via-orange-950/30 dark:to-yellow-900/40 shadow-xl ring-2 ring-yellow-200/50',
      popular: true,
      features: [
        '🚀 Alle Free Features',
        '🧠 Unlimited AI mit GPT-4.1',
        '👥 Über 7+ Experten-Coaches zur Auswahl',
        '🆕 Regelmäßig neue Coaches mit einzigartiger Persönlichkeit',
        '🎯 Tiefes Fachwissen je Expertise-Bereich',
        '💬 Advanced Coach Chat ohne Limits',
        '🍽️ Personalisierte Coach Recipes',
        '📈 Tägliche KI-Analysis & Insights',
        '💪 Workout & Sleep Tracking',
        '📏 Body Measurements & Transformation',
        '🔮 Premium Insights & Prognosen',
        '⚡ Priority Support'
      ]
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Lade Abo-Status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              getleanAI Pläne
            </h1>
          </div>

          <div className="space-y-8">
            {/* Current Plan Status */}
            <Card className={`relative ${isPremium ? "border-primary bg-primary/5" : ""}`}>
              {/* Refresh Icon in der rechten oberen Ecke */}
              <button
                onClick={() => refreshSubscription(true)}
                disabled={loading}
                className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full transition-colors"
                title="Abo-Status aktualisieren"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''} text-muted-foreground hover:text-foreground`} />
              </button>

              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Aktueller Plan
                  {isPremium && <Sparkles className="h-4 w-4 text-primary" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-2">
                    <Badge variant={isPremium ? 'default' : 'secondary'} className="text-sm w-fit">
                      {isPremium ? 'Pro' : 'Free'}
                    </Badge>
                    {isPremium && subscriptionEnd && (
                      <p className="text-sm text-muted-foreground">
                        Erneuert sich am: {new Date(subscriptionEnd).toLocaleDateString('de-DE')}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {isPremium && (
                      <Button onClick={createPortalSession} variant="outline" size="sm" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Abo verwalten
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Plans */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-center">3 Tage kostenlos testen</h2>
              <p className="text-center text-muted-foreground mb-4">
                Teste alle Features 3 Tage kostenlos • Dann wähle deinen Plan • Jederzeit kündbar
              </p>
              
              {/* Billing Toggle */}
              <div className="flex justify-center mb-8">
                <div className="bg-muted/50 p-1 rounded-xl inline-flex border backdrop-blur-sm">
                  <button
                    onClick={() => setBillingPeriod('monthly')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      billingPeriod === 'monthly'
                        ? 'bg-background text-foreground shadow-sm border'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Monatlich
                  </button>
                  <button
                    onClick={() => setBillingPeriod('sixmonths')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                      billingPeriod === 'sixmonths'
                        ? 'bg-background text-foreground shadow-sm border'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    6 Monate
                    <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      -33%
                    </span>
                  </button>
                  <button
                    onClick={() => setBillingPeriod('yearly')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                      billingPeriod === 'yearly'
                        ? 'bg-background text-foreground shadow-sm border'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Jährlich
                    <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      -50%
                    </span>
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {plans.map((plan) => {
                  const isCurrentPlan = plan.isFree ? !isPremium : (isPremium && subscriptionTier?.toLowerCase() === 'pro');
                  
                  return (
                    <Card 
                      key={plan.id} 
                      className={`relative transition-all duration-300 hover:shadow-lg ${plan.color} ${
                        plan.popular ? 'ring-2 ring-primary shadow-lg' : ''
                      } ${isCurrentPlan ? 'ring-2 ring-green-500 shadow-lg' : ''}`}
                    >
                      {plan.popular && !isCurrentPlan && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                          <Badge className="bg-primary text-primary-foreground shadow-md">
                            <Zap className="h-3 w-3 mr-1" />
                            Beliebt
                          </Badge>
                        </div>
                      )}
                      
                      {isCurrentPlan && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                          <Badge className="bg-green-600 text-white shadow-md">
                            <Check className="h-3 w-3 mr-1" />
                            Aktiv
                          </Badge>
                        </div>
                      )}
                      
                      <CardHeader className="text-center space-y-4 pb-4">
                        <div className="flex justify-center">{plan.icon}</div>
                        <div>
                          <CardTitle className="text-xl sm:text-2xl">{plan.name}</CardTitle>
                           <div className="flex flex-col items-center space-y-2 mt-4">
                             {!plan.isFree && billingPeriod !== 'monthly' && plan.originalPrice && (
                               <div className="text-sm text-muted-foreground">
                                 <span className="line-through">{plan.originalPrice}</span>
                                 <span className="ml-2 text-green-600 font-semibold">
                                   {billingPeriod === 'yearly' ? '50%' : '33%'} Rabatt
                                 </span>
                               </div>
                             )}
                             <div className="flex items-baseline justify-center space-x-1">
                               <span className="text-2xl sm:text-3xl font-bold">{plan.price}</span>
                               <span className="text-sm text-muted-foreground">{plan.period}</span>
                             </div>
                             {!plan.isFree && billingPeriod !== 'monthly' && getSavings(plan.name) && getSavings(plan.name) !== '0€' && (
                               <div className="text-xs text-green-600 font-medium">
                                 Du sparst {getSavings(plan.name)} {billingPeriod === 'yearly' ? 'pro Jahr' : 'alle 6 Monate'}
                               </div>
                             )}
                           </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-6">
                        <ul className="space-y-2">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                              <span className="text-sm">{feature}</span>
                            </li>
                          ))}
                        </ul>
                        
                        {plan.isFree ? (
                          <Button 
                            className="w-full" 
                            variant="outline"
                            disabled={true}
                          >
                            {isCurrentPlan ? "Aktueller Plan" : "Kostenlos"}
                          </Button>
                        ) : (
                          <Button 
                            className="w-full" 
                            variant={plan.popular && !isCurrentPlan ? "default" : "outline"}
                            onClick={() => handleSubscribe(plan.id)}
                            disabled={subscribing || isCurrentPlan}
                          >
                            {isCurrentPlan ? (
                              "Aktueller Plan"
                            ) : subscribing ? (
                              "Loading..."
                            ) : (
                              `${plan.name} wählen`
                            )}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Management Section */}
            {isPremium && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Subscription verwalten
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Verwalte deine Zahlungsmethoden, lade Rechnungen herunter oder kündige dein Abo.
                  </p>
                  <Button 
                    onClick={createPortalSession}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    Customer Portal öffnen
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Features Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Warum getleanAI Premium?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-3 text-muted-foreground">
                  <p>🎯 <strong>Basic:</strong> Perfekt für den Einstieg in AI-gesteuertes Fitness Tracking</p>
                  <p>🚀 <strong>Premium:</strong> Nutzer erreichen ihre Ziele 2-3x schneller und brechen seltener ab</p>
                  <p>✨ <strong>3 Tage kostenlos:</strong> Teste alle Features unverbindlich vor deiner Entscheidung</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;