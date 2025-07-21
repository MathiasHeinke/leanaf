
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

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: '7,99€',
      period: '/Monat',
      icon: <Star className="h-6 w-6 text-blue-600" />,
      color: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20',
      features: [
        'Basis KI-Coaching',
        'Meal Tracking',
        'Basic Insights', 
        'Weight Tracking',
        'Sleep Tracking'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '19,99€',
      period: '/Monat',
      icon: <Crown className="h-6 w-6 text-yellow-600" />,
      color: 'bg-yellow-50 border-yellow-300 dark:bg-yellow-950/20',
      popular: true,
      features: [
        'Erweiterte KI-Analyse',
        'Smart Insights Dashboard',
        'Transformation Tracking',
        'Custom Meal Plans',
        'Priority Support',
        'Alle Basic Features'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '39,99€',
      period: '/Monat',
      icon: <Trophy className="h-6 w-6 text-purple-600" />,
      color: 'bg-purple-50 border-purple-300 dark:bg-purple-950/20',
      features: [
        'Personal AI Coach',
        'Custom Training Plans',
        '1:1 Support',
        'Advanced Analytics',
        'API Access',
        'Alle Premium Features'
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
    <div className="p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            KI Coach Subscription
          </h1>
        </div>

        <div className="space-y-8">
          {/* Current Plan Status */}
          <Card className={isPremium ? "border-primary bg-primary/5" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Aktueller Plan
                {isPremium && <Sparkles className="h-4 w-4 text-primary" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Badge variant={isPremium ? 'default' : 'secondary'} className="text-sm">
                    {isPremium ? `KI Coach ${subscriptionTier || 'Premium'}` : 'Free Plan'}
                  </Badge>
                  {isPremium && subscriptionEnd && (
                    <p className="text-sm text-muted-foreground">
                      Erneuert sich am: {new Date(subscriptionEnd).toLocaleDateString('de-DE')}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={refreshSubscription}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Aktualisieren
                  </Button>
                  {isPremium && (
                    <Button onClick={createPortalSession} variant="outline">
                      <Settings className="h-4 w-4 mr-2" />
                      Abo verwalten
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Plans */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center">Wähle deinen Plan</h2>
            <p className="text-center text-muted-foreground mb-8">
              Jederzeit kündbar • 30 Tage Geld-zurück-Garantie
            </p>
            
            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const isCurrentPlan = isPremium && subscriptionTier === plan.name;
                
                return (
                  <Card 
                    key={plan.id} 
                    className={`relative ${plan.color} ${plan.popular ? 'ring-2 ring-primary' : ''} ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}
                  >
                    {plan.popular && !isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground">
                          <Zap className="h-3 w-3 mr-1" />
                          Beliebt
                        </Badge>
                      </div>
                    )}
                    
                    {isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-green-600 text-white">
                          <Check className="h-3 w-3 mr-1" />
                          Aktiv
                        </Badge>
                      </div>
                    )}
                    
                    <CardHeader className="text-center space-y-4">
                      <div className="flex justify-center">{plan.icon}</div>
                      <div>
                        <CardTitle className="text-2xl">{plan.name}</CardTitle>
                        <div className="flex items-baseline justify-center space-x-1">
                          <span className="text-3xl font-bold">{plan.price}</span>
                          <span className="text-sm text-muted-foreground">{plan.period}</span>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-6">
                      <ul className="space-y-3">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      
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
              <CardTitle>Warum KI Coach Premium?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-2 text-muted-foreground">
                <p>🎯 <strong>Basic:</strong> Perfekt für den Einstieg in AI-gesteuertes Fitness Tracking</p>
                <p>🚀 <strong>Premium:</strong> Erweiterte Analyse & Smart Insights für optimale Ergebnisse</p>
                <p>👑 <strong>Enterprise:</strong> Persönlicher AI Coach mit maßgeschneiderten Plänen</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
