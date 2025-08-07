import React, { useState, useEffect } from 'react';
import { Crown, Zap, Sparkles, Star, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface PremiumSlideProps {
  onComplete: () => void;
}

interface OnboardingStats {
  total_users: number;
  current_coupons_used: number;
  max_coupons: number;
}

export const PremiumSlide = ({ onComplete }: PremiumSlideProps) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<OnboardingStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userNumber, setUserNumber] = useState<number | null>(null);
  const [couponCode, setCouponCode] = useState<string | null>(null);

  // Fetch current stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase
          .from('onboarding_stats')
          .select('*')
          .maybeSingle();
        
        if (error) throw error;
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  const handlePremiumChoice = async (plan: 'trial' | 'monthly' | 'sixmonths') => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Increment user stats and get coupon
      const { data: statsData, error: statsError } = await supabase
        .rpc('increment_onboarding_stats');
      
      if (statsError) throw statsError;
      
      const response = statsData as { user_number: number; coupon_code: string | null; coupons_remaining: number };
      setUserNumber(response.user_number);
      setCouponCode(response.coupon_code);

      if (plan === 'trial') {
        // Free trial - complete onboarding
        toast.success('3-Tage Premium Trial aktiviert!');
        setTimeout(() => onComplete(), 1000);
      } else {
        // Paid plans - redirect to Stripe
        const { data: checkoutData, error: checkoutError } = await supabase.functions
          .invoke('create-checkout-session', {
            body: { plan, coupon_code: response.coupon_code }
          });

        if (checkoutError) throw checkoutError;
        
        if (checkoutData.url) {
          window.open(checkoutData.url, '_blank');
          setTimeout(() => onComplete(), 1000);
        }
      }
    } catch (error) {
      console.error('Error handling premium choice:', error);
      toast.error('Fehler beim Verarbeiten deiner Auswahl');
    } finally {
      setIsLoading(false);
    }
  };

  const couponsRemaining = stats ? Math.max(0, stats.max_coupons - stats.current_coupons_used) : 0;
  const showCoupon = couponsRemaining > 0;

  return (
    <div className="text-center space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary via-accent to-primary-glow rounded-full flex items-center justify-center relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary-glow rounded-full blur-lg opacity-50 animate-pulse"></div>
          <Crown className="w-10 h-10 text-white relative z-10" />
        </div>
        
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Bereit für Premium?
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Entscheide dich für deinen perfekten Start
          </p>
        </div>
      </div>

      {/* User Counter & Coupon */}
      {stats && (
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-4 border border-primary/20">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Users className="w-5 h-5 text-primary" />
            <span className="font-semibold">
              Du bist Nutzer #{stats.total_users + 1}
            </span>
          </div>
          
          {showCoupon && (
            <div className="bg-gradient-to-r from-accent to-primary text-white px-4 py-2 rounded-lg">
              <div className="flex items-center justify-center gap-2">
                <Star className="w-4 h-4" />
                <span className="font-bold text-sm">
                  12 MONATE KOSTENLOS für die ersten 50!
                </span>
              </div>
              <p className="text-xs mt-1 opacity-90">
                Noch {couponsRemaining} Plätze verfügbar
              </p>
            </div>
          )}
        </div>
      )}

      {/* Premium Options */}
      <div className="space-y-4">
        {/* Free Trial */}
        <div className="bg-background border-2 border-primary/30 rounded-xl p-6 hover:border-primary/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-bold">3 Tage Premium Trial</h3>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            Teste alle Premium-Features kostenlos
          </p>
          <Button 
            onClick={() => handlePremiumChoice('trial')}
            disabled={isLoading}
            className="w-full"
            variant="outline"
          >
            Kostenlos testen
          </Button>
        </div>

        {/* Monthly Plan */}
        <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="w-6 h-6 text-primary" />
            <div className="flex-1">
              <h3 className="text-lg font-bold">Monatlich</h3>
              <p className="text-sm text-muted-foreground">€19.99/Monat</p>
            </div>
            {showCoupon && (
              <div className="bg-accent text-white px-2 py-1 rounded text-xs font-bold">
                KOSTENLOS
              </div>
            )}
          </div>
          <Button 
            onClick={() => handlePremiumChoice('monthly')}
            disabled={isLoading}
            className="w-full"
          >
            {showCoupon ? 'Kostenlos starten' : 'Wählen'}
          </Button>
        </div>

        {/* 6-Month Plan */}
        <div className="bg-gradient-to-br from-accent/5 to-primary/5 border border-accent/20 rounded-xl p-6 relative">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-accent text-white px-3 py-1 rounded-full text-xs font-bold">
            BELIEBT
          </div>
          <div className="flex items-center gap-3 mb-3">
            <Crown className="w-6 h-6 text-accent" />
            <div className="flex-1">
              <h3 className="text-lg font-bold">6 Monate</h3>
              <div className="text-sm text-muted-foreground">
                <span className="line-through">€119.94</span>
                <span className="ml-2 text-accent font-semibold">€89.99</span>
                <span className="ml-1">(-25%)</span>
              </div>
            </div>
            {showCoupon && (
              <div className="bg-accent text-white px-2 py-1 rounded text-xs font-bold">
                KOSTENLOS
              </div>
            )}
          </div>
          <Button 
            onClick={() => handlePremiumChoice('sixmonths')}
            disabled={isLoading}
            className="w-full bg-accent hover:bg-accent/90"
          >
            {showCoupon ? 'Kostenlos starten' : 'Sparen & Wählen'}
          </Button>
        </div>
      </div>

      {/* Features Preview */}
      <div className="text-left bg-muted/30 rounded-xl p-4">
        <h4 className="font-semibold mb-3 text-center">Premium Features:</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>• Unbegrenzte AI-Chats</div>
          <div>• Personalisierte Trainingspläne</div>
          <div>• Detaillierte Analysen</div>
          <div>• Priority Support</div>
        </div>
      </div>

      {/* Coupon Code Display */}
      {couponCode && (
        <div className="bg-gradient-to-r from-accent to-primary text-white p-4 rounded-xl">
          <p className="font-bold">Dein exklusiver Code:</p>
          <p className="text-2xl font-mono tracking-wider mt-1">{couponCode}</p>
          <p className="text-xs mt-2 opacity-90">
            Code wird automatisch bei Stripe angewendet
          </p>
        </div>
      )}
    </div>
  );
};