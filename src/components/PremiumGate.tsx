
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, X, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PremiumGateProps {
  title?: string;
  description?: string;
  features?: string[];
  className?: string;
  children?: React.ReactNode;
  feature?: string;
  hideable?: boolean;
  fallbackMessage?: string;
}

export const PremiumGate: React.FC<PremiumGateProps> = ({ 
  title = "Premium Feature", 
  description = "Dieses Feature ist nur mit einem Pro-Account verfügbar.", 
  features = [], 
  className = '',
  children,
  feature,
  hideable,
  fallbackMessage
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleUpgrade = () => {
    navigate('/subscription');
  };

  const hideFeature = async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('profiles')
        .update({ hide_premium_features: true })
        .eq('user_id', user.id);
      
      toast.success('Premium-Features ausgeblendet. In Settings wieder einblendbar.', {
        duration: 5000,
        action: {
          label: "Settings",
          onClick: () => navigate('/profile')
        }
      });
      
      // Trigger a page refresh to hide the component immediately
      window.location.reload();
    } catch (error) {
      console.error('Error hiding premium features:', error);
      toast.error('Fehler beim Ausblenden der Premium-Features');
    }
  };

  // If children are provided, this is a wrapper component
  if (children) {
    return (
      <Card className={`border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <Crown className="h-5 w-5" />
              {title}
            </CardTitle>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={hideFeature}
                className="h-6 w-6 p-0 text-orange-600 hover:text-orange-800 hover:bg-orange-100 dark:text-orange-400 dark:hover:text-orange-200"
                title="Premium-Features ausblenden"
              >
                <Settings className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={hideFeature}
                className="h-6 w-6 p-0 text-orange-600 hover:text-orange-800 hover:bg-orange-100 dark:text-orange-400 dark:hover:text-orange-200"
                title="Ausblenden"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-orange-700 dark:text-orange-300">
            {fallbackMessage || description}
          </p>
          
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={handleUpgrade}
              className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
            >
              <Crown className="h-4 w-4 mr-2" />
              Pro holen - 33% Rabatt!
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={hideFeature}
              className="border-orange-300 text-orange-600 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-400"
            >
              Ausblenden
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-orange-800 dark:text-orange-200">
            <Crown className="h-5 w-5" />
            {title}
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={hideFeature}
              className="h-6 w-6 p-0 text-orange-600 hover:text-orange-800 hover:bg-orange-100 dark:text-orange-400 dark:hover:text-orange-200"
              title="Premium-Features ausblenden"
            >
              <Settings className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={hideFeature}
              className="h-6 w-6 p-0 text-orange-600 hover:text-orange-800 hover:bg-orange-100 dark:text-orange-400 dark:hover:text-orange-200"
              title="Ausblenden"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-orange-700 dark:text-orange-300">
          {description}
        </p>
        
        {features.length > 0 && (
          <ul className="space-y-2">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                <Crown className="h-3 w-3" />
                {feature}
              </li>
            ))}
          </ul>
        )}
        
        <div className="flex gap-2 pt-2">
          <Button 
            onClick={handleUpgrade}
            className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
          >
            <Crown className="h-4 w-4 mr-2" />
            Pro holen - 33% Rabatt!
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={hideFeature}
            className="border-orange-300 text-orange-600 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-400"
          >
            Ausblenden
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
