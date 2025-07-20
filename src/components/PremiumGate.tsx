
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Lock } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

interface PremiumGateProps {
  feature: string;
  description: string;
  children?: React.ReactNode;
  showUpgrade?: boolean;
}

export const PremiumGate = ({ 
  feature, 
  description, 
  children, 
  showUpgrade = true 
}: PremiumGateProps) => {
  const { isPremium, createCheckoutSession } = useSubscription();

  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <Card className="relative overflow-hidden border-2 border-primary/20">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10" />
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          {feature}
          <Badge variant="outline" className="ml-auto">
            <Crown className="h-3 w-3 mr-1" />
            Premium
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        <p className="text-muted-foreground mb-4">{description}</p>
        {showUpgrade && (
          <Button onClick={createCheckoutSession} className="w-full">
            <Crown className="h-4 w-4 mr-2" />
            Jetzt upgraden für 7€/Monat
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
