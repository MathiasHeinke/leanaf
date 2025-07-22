import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Lock, Sparkles, Clock } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useFeatureAccess, FeatureName } from '@/hooks/useFeatureAccess';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface PremiumGateProps {
  children: ReactNode;
  feature?: FeatureName;
  fallbackMessage?: string;
  showUpgrade?: boolean;
  showTrialPrompt?: boolean;
}

export const PremiumGate = ({ 
  children, 
  feature = "workout_tracking", 
  fallbackMessage,
  showUpgrade = true,
  showTrialPrompt = true
}: PremiumGateProps) => {
  const { trial, startPremiumTrial, isPremium } = useSubscription();
  const { hasFeatureAccess, getFeatureStatus } = useFeatureAccess();
  const navigate = useNavigate();

  const featureStatus = getFeatureStatus(feature);
  
  if (featureStatus.hasAccess) {
    return <>{children}</>;
  }

  const handleStartTrial = async () => {
    const success = await startPremiumTrial();
    if (success) {
      toast.success('🎉 Premium Trial gestartet! 3 Tage kostenloses Premium.', {
        duration: 5000,
      });
    } else {
      toast.error('Fehler beim Starten des Trials. Bitte versuche es erneut.');
    }
  };

  if (!showUpgrade) {
    return null;
  }

  return (
    <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="p-3 rounded-full bg-primary/10">
            <Crown className="h-5 w-5 text-primary" />
          </div>
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          <Lock className="h-4 w-4" />
          Premium Feature
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-muted-foreground">
          {fallbackMessage || 'Dieses Feature ist nur für Premium-Nutzer verfügbar.'}
        </p>
        
        {showTrialPrompt && !trial.hasActiveTrial && !isPremium && (
          <div className="space-y-3">
            <Button 
              onClick={handleStartTrial}
              className="w-full"
              variant="default"
            >
              <Clock className="h-4 w-4 mr-2" />
              3 Tage Premium kostenlos testen
            </Button>
            <div className="text-xs text-muted-foreground">
              Oder direkt zu Premium upgraden:
            </div>
          </div>
        )}
        
        <Button 
          onClick={() => navigate('/subscription')}
          className="w-full"
          variant={showTrialPrompt && !trial.hasActiveTrial ? "outline" : "default"}
        >
          <Crown className="h-4 w-4 mr-2" />
          Zu Premium upgraden
        </Button>
        
        {trial.hasActiveTrial && (
          <div className="text-sm text-muted-foreground">
            Trial läuft noch {trial.trialDaysLeft} Tag{trial.trialDaysLeft !== 1 ? 'e' : ''}
          </div>
        )}
      </CardContent>
    </Card>
  );
};