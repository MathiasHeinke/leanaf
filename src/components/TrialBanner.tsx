import { Clock, Crown, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export const TrialBanner = () => {
  const { trial, isBasic } = useSubscription();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if dismissed or if user has premium or no trial
  if (dismissed || !isBasic || !trial.hasActiveTrial) {
    return null;
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-secondary/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-primary/20 rounded-full flex items-center justify-center">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">
                🎉 Premium Trial aktiv!
              </p>
              <p className="text-xs text-muted-foreground">
                Noch {trial.trialDaysLeft} Tag{trial.trialDaysLeft !== 1 ? 'e' : ''} verbleibend
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => navigate('/subscription')}
              className="text-xs"
            >
              <Crown className="h-3 w-3 mr-1" />
              Upgraden
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissed(true)}
              className="h-8 w-8 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};