import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Brain, Zap, Crown, Lock } from 'lucide-react';
import { useAIUsageLimits } from '@/hooks/useAIUsageLimits';
import { useCredits } from '@/hooks/useCredits';
import { useNavigate } from 'react-router-dom';
import { useSecureAdminAccess } from '@/hooks/useSecureAdminAccess';

interface AIUsageLimitsProps {
  featureType: 'meal_analysis' | 'coach_chat' | 'coach_recipes' | 'daily_analysis';
  className?: string;
}

export const AIUsageLimits: React.FC<AIUsageLimitsProps> = ({ featureType, className }) => {
  const { getCurrentUsage } = useAIUsageLimits();
  const { status: creditsStatus, loading: creditsLoading } = useCredits();
  const { isAdmin: isSuperAdmin, loading: adminLoading } = useSecureAdminAccess();
  const navigate = useNavigate();
  const [usage, setUsage] = useState<{ daily_count: number; monthly_count: number } | null>(null);

  useEffect(() => {
    if (!creditsLoading && (adminLoading || !isSuperAdmin)) {
      getCurrentUsage(featureType).then(setUsage);
    }
  }, [featureType, creditsLoading, isSuperAdmin, adminLoading, getCurrentUsage]);

  // Super Admins get unlimited AI access
  if (!adminLoading && isSuperAdmin) {
    return (
      <Card className={`border-primary/20 bg-primary/5 ${className}`}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {(!adminLoading && isSuperAdmin) ? 'Super Admin - Unlimited AI' : 'Pro - Unlimited AI'}
            </span>
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

  return (
    <Card className={`${className} ${isProOnly ? 'border-orange-200 bg-orange-50' : ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <IconComponent className="h-4 w-4" />
          {featureInfo.name}
          {isProOnly && <Lock className="h-3 w-3 text-orange-600" />}
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
              onClick={() => navigate('/credits')}
              className="w-full"
            >
              Jetzt upgraden
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
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                1 pro Woche verfügbar
              </span>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => navigate('/credits')}
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
              <span className={dailyRemaining <= 1 ? 'text-red-600 font-medium' : ''}>
                {dailyUsed}/{featureInfo.dailyLimit}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                {dailyRemaining} verbleibend
              </span>
              {dailyRemaining <= 1 && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => navigate('/credits')}
                  className="text-xs px-2 py-1 h-6"
                >
                  Upgrade
                </Button>
              )}
            </div>
            {dailyRemaining === 0 && (
              <div className="text-xs text-red-600 font-medium">
                Tageslimit erreicht. Morgen verfügbar oder jetzt upgraden.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};