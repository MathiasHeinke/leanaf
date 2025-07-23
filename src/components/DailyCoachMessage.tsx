
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Crown, Sparkles, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useAIUsageLimits } from '@/hooks/useAIUsageLimits';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const COACH_DATA = {
  sascha: {
    name: "Sascha",
    avatar: "/lovable-uploads/2c06031d-707a-400d-aaa0-a46decdddfe2.png"
  },
  lucy: {
    name: "Lucy", 
    avatar: "/lovable-uploads/9e4f4475-6b1f-4563-806d-89f78ba853e6.png"
  },
  kai: {
    name: "Kai",
    avatar: "/lovable-uploads/fa6fb4d0-0626-4ff4-a5c2-552d0e3d9bbb.png"
  }
};

export const DailyCoachMessage = () => {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const { getCurrentUsage } = useAIUsageLimits();
  const navigate = useNavigate();
  
  const [showMessage, setShowMessage] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<string>('sascha');
  const [coachMessage, setCoachMessage] = useState<string>('');
  const [generatingMessage, setGeneratingMessage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [aiUsageStatus, setAiUsageStatus] = useState<any>(null);

  useEffect(() => {
    if (!user || isPremium) {
      setIsLoading(false);
      return;
    }

    checkForDailyMessage();
  }, [user, isPremium]);

  const checkForDailyMessage = async () => {
    if (!user) return;

    try {
      // Get user profile and coach settings
      const { data: profile } = await supabase
        .from('profiles')
        .select('coach_personality, display_name, hide_premium_features')
        .eq('user_id', user.id)
        .single();

      // Don't show if user has hidden premium features
      if (profile?.hide_premium_features) {
        setIsLoading(false);
        return;
      }

      const coachPersonality = profile?.coach_personality || 'sascha';
      setSelectedCoach(coachPersonality);

      // Check current AI usage status
      const usageData = await Promise.all([
        getCurrentUsage('coach_chat'),
        getCurrentUsage('meal_analysis'),
        getCurrentUsage('coach_recipes')
      ]);

      setAiUsageStatus({
        coach_chat: usageData[0],
        meal_analysis: usageData[1],
        coach_recipes: usageData[2]
      });

      // Check if we should show daily message
      const today = new Date().toISOString().split('T')[0];
      
      const { data: messageRecord } = await supabase
        .from('coach_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .eq('coach_id', coachPersonality)
        .single();

      let shouldShow = false;

      if (!messageRecord) {
        // First time - create record and show message
        await supabase
          .from('coach_recommendations')
          .insert({
            user_id: user.id,
            coach_id: coachPersonality,
            recommendation_count: 1,
            last_recommendation_sent: new Date().toISOString()
          });
        shouldShow = true;
      } else {
        // Check if last message was shown today
        const lastShownDate = messageRecord.last_recommendation_sent?.split('T')[0];
        
        if (lastShownDate !== today) {
          // New day - update record and show message
          await supabase
            .from('coach_recommendations')
            .update({
              last_recommendation_sent: new Date().toISOString(),
              recommendation_count: messageRecord.recommendation_count + 1
            })
            .eq('id', messageRecord.id);
          shouldShow = true;
        }
      }

      if (shouldShow) {
        await generateCoachMessage(coachPersonality, profile?.display_name, usageData);
        setShowMessage(true);
      }
    } catch (error) {
      console.error('Error checking daily coach message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateCoachMessage = async (coachPersonality: string, userName?: string, usageData?: any[]) => {
    setGeneratingMessage(true);
    try {
      const response = await supabase.functions.invoke('generate-coach-recommendation', {
        body: { 
          coachPersonality,
          userName: userName || 'Champion',
          aiUsageStatus: aiUsageStatus,
          messageType: 'daily_motivation'
        }
      });

      if (response.data?.recommendation) {
        setCoachMessage(response.data.recommendation);
      } else {
        // Fallback messages with AI-credit awareness
        const hasUsedAI = usageData?.some(usage => usage && usage.daily_count > 0);
        const fallbackMessages = {
          sascha: hasUsedAI 
            ? "AI-Credits clever genutzt! Zeit für Pro = 3x mehr Power! 🎯" 
            : "Zeit für Pro! Erreiche deine Ziele 3x schneller! 🎯",
          lucy: hasUsedAI 
            ? "Du nutzt die AI super! Mit Pro wird alles noch leichter ❤️" 
            : "Mit Pro wird alles leichter und nachhaltiger ❤️",
          kai: hasUsedAI 
            ? "AI-Power genutzt! Pro = Deine Transformation! 💪🔥" 
            : "Pro = Deine Transformation! Jetzt upgraden! 💪🔥"
        };
        setCoachMessage(fallbackMessages[coachPersonality as keyof typeof fallbackMessages] || fallbackMessages.sascha);
      }
    } catch (error) {
      console.error('Error generating coach message:', error);
      setCoachMessage("Hol dir Pro und erreiche deine Ziele schneller! 🚀");
    } finally {
      setGeneratingMessage(false);
    }
  };

  const dismissMessage = () => {
    setShowMessage(false);
    toast.success('Coach-Nachricht für heute ausgeblendet. Morgen wieder da! 👋');
  };

  const hideAllMessages = async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('profiles')
        .update({ hide_premium_features: true })
        .eq('user_id', user.id);
      
      setShowMessage(false);
      toast.success('Premium-Features ausgeblendet. In Settings wieder einblendbar.', {
        action: {
          label: "Settings",
          onClick: () => navigate('/profile')
        }
      });
    } catch (error) {
      console.error('Error hiding premium features:', error);
      toast.error('Fehler beim Ausblenden');
    }
  };

  const handleUpgrade = () => {
    navigate('/subscription');
    setShowMessage(false);
  };

  if (isLoading || !showMessage || isPremium || !user) {
    return null;
  }

  const coachData = COACH_DATA[selectedCoach as keyof typeof COACH_DATA] || COACH_DATA.sascha;

  return (
    <Card className="mx-4 mb-4 border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-lg">
      <CardContent className="p-0">
        <div className="relative overflow-hidden rounded-lg">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20" />
          
          {/* Content */}
          <div className="relative p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={coachData.avatar}
                    alt={coachData.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-white/50"
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-primary-foreground" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{coachData.name} empfiehlt heute</p>
                </div>
              </div>
              
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={hideAllMessages}
                  className="h-6 w-6 p-0 hover:bg-white/10 text-muted-foreground"
                  title="Alle Premium-Features ausblenden"
                >
                  <Settings className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={dismissMessage}
                  className="h-6 w-6 p-0 hover:bg-white/10"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="mb-4">
              {generatingMessage ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-pulse">💭</div>
                  <span>Dein Coach denkt nach...</span>
                </div>
              ) : (
                <p className="text-sm font-medium text-foreground leading-relaxed">
                  {coachMessage}
                </p>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleUpgrade}
                size="sm"
                className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground font-semibold shadow-md"
              >
                <Crown className="h-4 w-4 mr-2" />
                Pro holen - 33% Rabatt!
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissMessage}
                className="px-3 hover:bg-white/10 text-muted-foreground"
              >
                Später
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
