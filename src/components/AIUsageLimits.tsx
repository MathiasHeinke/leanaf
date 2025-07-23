
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Brain, Zap, Crown, Lock, Clock } from 'lucide-react';
import { useAIUsageLimits } from '@/hooks/useAIUsageLimits';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

interface AIUsageLimitsProps {
  featureType: 'meal_analysis' | 'coach_chat' | 'coach_recipes' | 'daily_analysis';
  className?: string;
}

export const AIUsageLimits: React.FC<AIUsageLimitsProps> = ({ featureType, className }) => {
  const { getCurrentUsage } = useAIUsageLimits();
  const { isPremium } = useSubscription();
  const navigate = useNavigate();
  const [usage, setUsage] = useState<{ daily_count: number; monthly_count: number } | null>(null);
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');

  useEffect(() => {
    if (!isPremium) {
      getCurrentUsage(featureType).then(setUsage);
    }
  }, [featureType, isPremium, getCurrentUsage]);

  useEffect(() => {
    const updateTimeUntilReset = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeUntilReset(`${hours}h ${minutes}m`);
    };

    updateTimeUntilReset();
    const interval = setInterval(updateTimeUntilReset, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

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
        return { name: 'AI Meal Analysen', dailyLimit: 5, icon: Brain, emoji: '🍽️' };
      case 'coach_chat':
        return { name: 'Coach Chat', dailyLimit: 2, icon: Zap, emoji: '💬' };
      case 'coach_recipes':
        return { name: 'Coach Recipes', dailyLimit: 1, icon: Zap, emoji: '👨‍🍳' };
      case 'daily_analysis':
        return { name: 'Daily Analysis', dailyLimit: 0, weeklyLimit: 1, icon: Zap, emoji: '📊' };
      default:
        return { name: 'AI Feature', dailyLimit: 0, icon: Brain, emoji: '🤖' };
    }
  };

  const featureInfo = getFeatureInfo();
  const IconComponent = featureInfo.icon;
  const dailyUsed = usage?.daily_count || 0;
  const dailyRemaining = Math.max(0, featureInfo.dailyLimit - dailyUsed);
  const progressPercent = featureInfo.dailyLimit > 0 ? (dailyUsed / featureInfo.dailyLimit) * 100 : 0;

  const isWeeklyFeature = featureType === 'daily_analysis';
  const isProOnly = featureInfo.dailyLimit === 0 && !isWeeklyFeature;
  const isLowUsage = dailyRemaining <= 1 && dailyRemaining > 0;
  const isLimitReached = dailyRemaining === 0 && featureInfo.dailyLimit > 0;

  const getCardClassName = () => {
    if (isProOnly) return 'border-orange-200 bg-orange-50';
    if (isLimitReached) return 'border-red-200 bg-red-50';
    if (isLowUsage) return 'border-yellow-200 bg-yellow-50';
    return '';
  };

  return (
    <Card className={`${className} ${getCardClassName()}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <IconComponent className="h-4 w-4" />
          {featureInfo.name}
          <span className="text-xs">{featureInfo.emoji}</span>
          {isProOnly && <Lock className="h-3 w-3 text-orange-600" />}
          {isLimitReached && <span className="text-xs text-red-600 font-bold">LIMIT</span>}
          {isLowUsage && <span className="text-xs text-yellow-600 font-bold">FAST LEER</span>}
        </CardTitle>
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
              className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
            >
              <Crown className="h-3 w-3 mr-1" />
              Pro - 33% Rabatt!
            </Button>
          </div>
        ) : isWeeklyFeature ? (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Diese Woche verwendet:</span>
              <span className="text-blue-600 font-medium">
                0/1
              </span>
            </div>
            <Progress value={0} className="h-2" />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>1 pro Woche verfügbar</span>
            </div>
            <Button 
              size="sm" 
              onClick={() => navigate('/subscription')}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
            >
              <Crown className="h-3 w-3 mr-1" />
              Pro - 33% Rabatt!
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Heute verwendet:</span>
              <span className={`font-medium ${
                isLimitReached ? 'text-red-600' : 
                isLowUsage ? 'text-yellow-600' : 
                'text-foreground'
              }`}>
                {dailyUsed}/{featureInfo.dailyLimit}
              </span>
            </div>
            <Progress 
              value={progressPercent} 
              className={`h-2 ${
                isLimitReached ? '[&>div]:bg-red-500' : 
                isLowUsage ? '[&>div]:bg-yellow-500' : ''
              }`} 
            />
            
            {isLimitReached ? (
              <div className="space-y-2">
                <div className="text-xs text-red-600 font-medium">
                  Tageslimit erreicht! {featureInfo.emoji}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Reset in {timeUntilReset}</span>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => navigate('/subscription')}
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                >
                  <Crown className="h-3 w-3 mr-1" />
                  Pro - 33% Rabatt!
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {dailyRemaining} verbleibend
                  </span>
                  {isLowUsage && (
                    <span className="text-xs text-yellow-600 font-medium">
                      Bald aufgebraucht!
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Reset in {timeUntilReset}</span>
                </div>
                
                {(isLowUsage || dailyRemaining <= 2) && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigate('/subscription')}
                    className="w-full border-primary/20 hover:bg-primary/5"
                  >
                    <Crown className="h-3 w-3 mr-1" />
                    Pro - 33% Rabatt!
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
