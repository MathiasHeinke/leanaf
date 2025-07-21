
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Crown, Check, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

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
    createCheckoutSession, 
    createPortalSession,
    refreshSubscription 
  } = useSubscription();

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

  const premiumFeatures = [
    'Unbegrenzte Mahlzeit-Analysen',
    'Erweiterte Coach-Persönlichkeiten',
    'Detaillierte Verlaufsstatistiken',
    'KI-Rezeptvorschläge',
    'Datenexport & Backup',
    'Premium Support',
    'Dark Mode & Themes',
    'Offline-Synchronisation'
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
      <div className="max-w-2xl mx-auto">
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
          <h1 className="text-2xl font-bold">KaloAI Premium</h1>
        </div>

        <div className="space-y-6">
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
                    {isPremium ? 'KaloAI Premium' : 'Kostenlos'}
                  </Badge>
                  {isPremium && subscriptionEnd && (
                    <p className="text-sm text-muted-foreground">
                      Erneuert sich am: {new Date(subscriptionEnd).toLocaleDateString('de-DE')}
                    </p>
                  )}
                </div>
                {isPremium ? (
                  <Button onClick={createPortalSession} variant="outline">
                    Abo verwalten
                  </Button>
                ) : (
                  <Button onClick={createCheckoutSession} size="lg" className="font-semibold">
                    <Crown className="h-4 w-4 mr-2" />
                    Für 7€/Monat upgraden
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Premium Features */}
          {!isPremium && (
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  KaloAI Premium
                  <Badge className="ml-auto bg-primary text-primary-foreground">
                    7€/Monat
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Changed from grid-cols-1 md:grid-cols-2 to grid-cols-1 */}
                  <div className="grid grid-cols-1 gap-3">
                    {premiumFeatures.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t">
                    <Button 
                      onClick={createCheckoutSession} 
                      size="lg" 
                      className="w-full font-semibold"
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      Jetzt Premium werden - 7€/Monat
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Jederzeit kündbar • 30 Tage Geld-zurück-Garantie
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Premium Benefits */}
          {isPremium && (
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <Sparkles className="h-5 w-5" />
                  Premium aktiv
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-green-700 mb-4">
                  Du nutzt alle Premium-Features von KaloAI. Vielen Dank für deine Unterstützung! 🎉
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {premiumFeatures.slice(0, 4).map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-green-700">
                      <Check className="h-3 w-3" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Refresh Button */}
          <div className="text-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshSubscription}
              disabled={loading}
            >
              Abo-Status aktualisieren
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
