
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { Crown, Shield, Sparkles, X, User, AlertTriangle, Database, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SubscriptionDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubscriptionDebugPanel = ({ isOpen, onClose }: SubscriptionDebugPanelProps) => {
  const { 
    isPremium, 
    subscriptionTier, 
    subscriptionEnd, 
    loading,
    // Debug functions
    isInDebugMode,
    debugTier,
    setDebugTier,
    clearDebugMode,
    clearDebugSubscription
  } = useSubscription();

  const { user } = useAuth();
  const [realDbStatus, setRealDbStatus] = useState<any>(null);

  // Check real database status
  useEffect(() => {
    const checkRealStatus = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('subscribers')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking real subscription:', error);
        }
        
        setRealDbStatus(data);
      } catch (error) {
        console.error('Error in checkRealStatus:', error);
      }
    };

    if (isOpen) {
      checkRealStatus();
    }
  }, [user, isOpen, debugTier]);

  if (!isOpen) return null;

  const getTierIcon = (tier: string) => {
    switch(tier?.toLowerCase()) {
      case 'basic': return <Sparkles className="h-4 w-4 text-blue-600" />;
      case 'premium': return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'enterprise': return <Shield className="h-4 w-4 text-purple-600" />;
      default: return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch(tier?.toLowerCase()) {
      case 'basic': return 'bg-blue-500';
      case 'premium': return 'bg-yellow-500';
      case 'enterprise': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getCurrentDisplayTier = () => {
    if (isInDebugMode() && debugTier) return debugTier;
    return subscriptionTier || 'free';
  };

  const getCurrentIsPremium = () => {
    if (isInDebugMode() && debugTier) {
      return ['basic', 'premium', 'enterprise'].includes(debugTier.toLowerCase());
    }
    return isPremium;
  };

  const debugTiers = [
    { id: 'free', name: 'Free', description: 'Basic features only' },
    { id: 'basic', name: 'Basic', description: 'Limited premium features' },
    { id: 'premium', name: 'Premium', description: 'Full premium access' },
    { id: 'enterprise', name: 'Enterprise', description: 'All features unlocked' }
  ];

  const handleClearDebugMode = async () => {
    await clearDebugSubscription();
    clearDebugMode();
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Card className="p-4 bg-card/95 backdrop-blur border shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Subscription Debug</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-3 text-xs">
          {/* Debug Mode Status */}
          {isInDebugMode() && (
            <div className="p-2 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 mb-1">
                <AlertTriangle className="h-3 w-3" />
                <span className="font-semibold">DEBUG MODE ACTIVE</span>
              </div>
              <div className="text-orange-600/80 dark:text-orange-400/80">
                Currently simulating: <span className="font-semibold">{debugTier}</span>
              </div>
            </div>
          )}
          
          {/* Frontend Status */}
          <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 mb-2">
              <User className="h-3 w-3" />
              <span className="font-semibold">Frontend Status</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span>Display Tier:</span>
                <div className="flex items-center gap-1">
                  {getTierIcon(getCurrentDisplayTier())}
                  <Badge className={getTierColor(getCurrentDisplayTier())}>
                    {getCurrentDisplayTier().toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Premium Access:</span>
                <Badge variant={getCurrentIsPremium() ? "default" : "secondary"}>
                  {getCurrentIsPremium() ? 'YES' : 'NO'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Database Status */}
          <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 mb-2">
              <Database className="h-3 w-3" />
              <span className="font-semibold">Database Status (Edge Functions)</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span>DB Subscribed:</span>
                <Badge variant={realDbStatus?.subscribed ? "default" : "secondary"}>
                  {realDbStatus?.subscribed ? 'YES' : 'NO'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>DB Tier:</span>
                <span className="capitalize">{realDbStatus?.subscription_tier || 'free'}</span>
              </div>
              {realDbStatus?.subscription_end && (
                <div className="flex items-center justify-between">
                  <span>DB Expires:</span>
                  <span className="text-xs">{new Date(realDbStatus.subscription_end).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Edge Function Status */}
          <div className="p-2 bg-purple-50 dark:bg-purple-950/20 rounded border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400 mb-2">
              <Zap className="h-3 w-3" />
              <span className="font-semibold">Edge Function Behavior</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span>Will Use:</span>
                <Badge variant={realDbStatus?.subscribed ? "default" : "secondary"}>
                  {realDbStatus?.subscribed ? 'PRO LIMITS' : 'FREE LIMITS'}
                </Badge>
              </div>
              <div className="text-xs text-purple-600/80 dark:text-purple-400/80">
                {isInDebugMode() 
                  ? 'Debug mode creates real DB entries for Edge Functions' 
                  : 'Edge Functions use real database subscription status'
                }
              </div>
            </div>
          </div>
          
          {/* Real Subscription Info (only when not in debug mode) */}
          {!isInDebugMode() && (
            <>
              <div className="flex items-center justify-between">
                <span>Real Tier:</span>
                <span className="capitalize">{subscriptionTier || 'free'}</span>
              </div>
              
              {subscriptionEnd && (
                <div className="flex items-center justify-between">
                  <span>Expires:</span>
                  <span>{new Date(subscriptionEnd).toLocaleDateString()}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span>Loading:</span>
                <Badge variant={loading ? "destructive" : "secondary"}>
                  {loading ? 'YES' : 'NO'}
                </Badge>
              </div>
            </>
          )}
        </div>
        
        {/* Debug Controls */}
        <div className="space-y-2 mt-4">
          <div className="text-xs font-semibold text-muted-foreground">Debug Tiers:</div>
          <div className="grid grid-cols-2 gap-2">
            {debugTiers.map((tier) => (
              <Button
                key={tier.id}
                variant={getCurrentDisplayTier() === tier.id ? "default" : "outline"}
                size="sm"
                onClick={() => setDebugTier(tier.id)}
                className="text-xs"
                title={tier.description}
              >
                {getTierIcon(tier.id)}
                <span className="ml-1">{tier.name}</span>
              </Button>
            ))}
          </div>
          
          {/* Reset Button */}
          {isInDebugMode() && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearDebugMode}
              className="w-full text-xs"
            >
              Reset to Real Status
            </Button>
          )}
        </div>
        
        {/* Warning */}
        <div className="mt-3 pt-2 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1 mb-1">
            <AlertTriangle className="h-3 w-3" />
            <span className="font-semibold">Important</span>
          </div>
          <div>Debug mode creates real database entries that affect Edge Functions. Use "Reset" to clear.</div>
        </div>
        
        {/* Keyboard Shortcut Info */}
        <div className="mt-2 text-xs text-muted-foreground">
          Shortcut: Ctrl+Shift+S
        </div>
      </Card>
    </div>
  );
};
