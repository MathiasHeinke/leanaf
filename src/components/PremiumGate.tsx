import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Lock, Sparkles } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

interface PremiumGateProps {
  children: ReactNode;
  feature?: string;
  tier?: 'basic' | 'premium' | 'enterprise';
  fallbackMessage?: string;
  showUpgrade?: boolean;
}

export const PremiumGate = ({ 
  children, 
  feature = "Premium Feature", 
  tier = 'premium',
  fallbackMessage,
  showUpgrade = true
}: PremiumGateProps) => {
  const { isPremium, subscriptionTier } = useSubscription();
  const navigate = useNavigate();

  // Check if user has access to the required tier
  const hasAccess = () => {
    if (!isPremium) return false;
    
    const tierHierarchy = {
      'basic': 1,
      'premium': 2, 
      'enterprise': 3
    };
    
    const userTierLevel = subscriptionTier ? tierHierarchy[subscriptionTier.toLowerCase() as keyof typeof tierHierarchy] || 0 : 0;
    const requiredTierLevel = tierHierarchy[tier];
    
    return userTierLevel >= requiredTierLevel;
  };

  if (hasAccess()) {
    return <>{children}</>;
  }

  const getTierDisplayName = (tier: string) => {
    switch(tier) {
      case 'basic': return 'Basic';
      case 'premium': return 'Premium';
      case 'enterprise': return 'Enterprise';
      default: return 'Premium';
    }
  };

  const getTierIcon = (tier: string) => {
    switch(tier) {
      case 'basic': return <Sparkles className="h-5 w-5 text-blue-600" />;
      case 'premium': return <Crown className="h-5 w-5 text-yellow-600" />;
      case 'enterprise': return <Crown className="h-5 w-5 text-purple-600" />;
      default: return <Crown className="h-5 w-5 text-primary" />;
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
            {getTierIcon(tier)}
          </div>
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          <Lock className="h-4 w-4" />
          {getTierDisplayName(tier)} Feature
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-muted-foreground">
          {fallbackMessage || `"${feature}" ist ein ${getTierDisplayName(tier)} Feature. Upgrade jetzt um Zugang zu bekommen!`}
        </p>
        <Button 
          onClick={() => navigate('/subscription')}
          className="w-full"
        >
          <Crown className="h-4 w-4 mr-2" />
          Zu {getTierDisplayName(tier)} upgraden
        </Button>
      </CardContent>
    </Card>
  );
};