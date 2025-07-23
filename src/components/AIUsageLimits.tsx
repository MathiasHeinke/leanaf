
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Brain, Zap, Crown, Lock, X, Settings, Clock } from 'lucide-react';
import { useAIUsageLimits } from '@/hooks/useAIUsageLimits';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIUsageLimitsProps {
  featureType: 'meal_analysis' | 'coach_chat' | 'coach_recipes' | 'daily_analysis';
  className?: string;
}

export const AIUsageLimits: React.FC<AIUsageLimitsProps> = ({ featureType, className }) => {
  const { getCurrentUsage } = useAIUsageLimits();
  const { isPremium } = useSubscription();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [usage, setUsage] = useState<{ daily_count: number; monthly_count: number } | null>(null);
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');

  useEffect(() => {
    if (!isPremium && user) {
      getCurrentUsage(featureType).then(setUsage);
    }
  }, [featureType, isPremium, getCurrentUsage, user]);

  // Calculate time until midnight
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeUntilReset(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  const hideFeature = async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('profiles')
        .update({ hide_premium_features: true })
        .eq('user_id', user.id);
      
      toast.success('AI-Limits ausgeblendet. In Settings wieder einblendbar.', {
        action: {
          label: "Settings",
          onClick: () => navigate('/profile')
        }
      });
      
      // Hide the component immediately
      window.location.reload();
    } catch (error) {
      console.error('Error hiding AI limits:', error);
      toast.error('Fehler beim Ausblenden');
    }
  };

  if (isPremium) {
    return (
      <Card className={`border-primary/20 bg-primary/5 ${className}`}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Pro - Unlimited AI</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getFeatureInfo = () => {
    switch (featureType) {
      case 'meal_analysis':
        return { name: 'AI Meal Analysen', dailyLimit: 5, icon: Brain };
      case 'coach_chat':
        return { name: 'Coach Chat', dailyLimit: 2, icon: Zap };
      case 'coach_recipes':
        return { name: 'Coach Recipes', dailyLimit: 1, icon: Zap };
      case 'daily_analysis':
        return { name: 'Daily Analysis', dailyLimit: 0, weeklyLimit: 1, icon: Zap };
      default:
        return { name: 'AI Feature', dailyLimit: 0, icon: Brain };
    }
  };

  const featureInfo = getFeatureInfo();
  const IconComponent = featureInfo.icon;
  const dailyUsed = usage?.daily_count || 0;
  const dailyRemaining = Math.max(0, featureInfo.dailyLimit - dailyUsed);
  const progressPercent = featureInfo.dailyLimit > 0 ? (dailyUsed / featureInfo.dailyLimit) * 100 : 0;

  const isWeeklyFeature = featureType === 'daily_analysis';
  const isProOnly = featureInfo.dailyLimit === 0 && !isWeeklyFeature;
  const isLowUsage = dailyRemaining <= 1 && !isProOnly && !isWeeklyFeature;
  const isExhausted = dailyRemaining === 0 && !isProOnly && !isWeeklyFeature;

  return (
    <Card className={`${className} ${
      isProOnly ? 'border-orange-200 bg-orange-50' : 
      isExhausted ? 'border-red-200 bg-red-50' :
      isLowUsage ? 'border-yellow-200 bg-yellow-50' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <IconComponent className="h-4 w-4" />
            {featureInfo.name}
            {isProOnly && <Lock className="h-3 w-3 text-orange-600" />}
            {isExhausted && <span className="text-red-600 text-xs">ERSCHÖPFT</span>}
            {isLowUsage && <span className="text-yellow-600 text-xs">NIEDRIG</span>}
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={hideFeature}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              title="AI-Limits ausblenden"
            >
              <Settings className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={hideFeature}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              title="Ausblenden"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isProOnly ? (
          <div className="space-y-2">
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              Pro Feature
            </Badge>
            <p className="text-xs text-muted-foreground">
              Upgrade zu Pro für unbegrenzten Zugang
            </p>
            <Button 
              size="sm" 
              onClick={() => navigate('/subscription')}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            >
              <Crown className="h-3 w-3 mr-1" />
              Jetzt upgraden - 33% Rabatt!
            </Button>
          </div>
        ) : isWeeklyFeature ? (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Diese Woche verwendet:</span>
              <span className="text-blue-600 font-medium">0/1</span>
            </div>
            <Progress value={0} className="h-2" />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">1 pro Woche verfügbar</span>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => navigate('/subscription')}
                className="text-xs px-2 py-1 h-6"
              >
                Upgrade
              </Button>
            </div>
            <div className="text-xs text-blue-600">
              Wöchentliches Feature - Upgrade für tägliche Nutzung
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Heute verwendet:</span>
              <span className={`${
                isExhausted ? 'text-red-600 font-bold' : 
                isLowUsage ? 'text-yellow-600 font-medium' : ''
              }`}>
                {dailyUsed}/{featureInfo.dailyLimit}
              </span>
            </div>
            <Progress 
              value={progressPercent} 
              className={`h-2 ${
                isExhausted ? 'bg-red-100' : 
                isLowUsage ? 'bg-yellow-100' : ''
              }`} 
            />
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {dailyRemaining} verbleibend
                </span>
                {!isExhausted && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{timeUntilReset}</span>
                  </div>
                )}
              </div>
              {(isLowUsage || isExhausted) && (
                <Button 
                  size="sm" 
                  variant={isExhausted ? "default" : "outline"}
                  onClick={() => navigate('/subscription')}
                  className={`text-xs px-2 py-1 h-6 ${
                    isExhausted ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' : ''
                  }`}
                >
                  <Crown className="h-3 w-3 mr-1" />
                  {isExhausted ? '33% Rabatt!' : 'Upgrade'}
                </Button>
              )}
            </div>
            
            {isExhausted && (
              <div className="text-xs text-red-600 font-medium bg-red-100 p-2 rounded border border-red-200">
                ⚠️ Tageslimit erreicht! Reset um 00:00 Uhr ({timeUntilReset}) oder jetzt Pro holen für unlimited AI!
              </div>
            )}
            
            {isLowUsage && !isExhausted && (
              <div className="text-xs text-yellow-600 font-medium bg-yellow-100 p-2 rounded border border-yellow-200">
                ⚡ Nur noch {dailyRemaining} übrig! Pro = unlimited AI-Power!
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
