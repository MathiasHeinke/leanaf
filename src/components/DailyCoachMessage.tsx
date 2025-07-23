
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

interface CoachMessage {
  id: string;
  coach_id: string;
  last_shown_date: string;
  message_count: number;
  dismissed_today: boolean;
}

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
  const [coachMessage, setCoachMessage] = useState<CoachMessage | null>(null);
  const [showMessage, setShowMessage] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<string>('sascha');
  const [isLoading, setIsLoading] = useState(true);
  const [messageText, setMessageText] = useState<string>('');
  const [generatingMessage, setGeneratingMessage] = useState(false);
  const [aiUsageData, setAiUsageData] = useState<any>(null);

  useEffect(() => {
    if (!user || isPremium) {
      setIsLoading(false);
      return;
    }

    checkForDailyMessage();
  }, [user, isPremium]);

  const generateContextAwareMessage = async (coachPersonality: string, userName?: string) => {
    setGeneratingMessage(true);
    try {
      // Get AI usage data for context
      const [coachUsage, mealUsage, recipeUsage] = await Promise.all([
        getCurrentUsage('coach_chat'),
        getCurrentUsage('meal_analysis'),
        getCurrentUsage('coach_recipes')
      ]);

      const totalUsage = {
        coach_chat: coachUsage?.daily_count || 0,
        meal_analysis: mealUsage?.daily_count || 0,
        coach_recipes: recipeUsage?.daily_count || 0
      };

      setAiUsageData(totalUsage);

      // Check if user has reached any limits
      const hasReachedCoachLimit = totalUsage.coach_chat >= 2;
      const hasReachedMealLimit = totalUsage.meal_analysis >= 5;
      const hasReachedRecipeLimit = totalUsage.coach_recipes >= 1;

      const response = await supabase.functions.invoke('generate-coach-recommendation', {
        body: { 
          coachPersonality,
          userName: userName || 'Champion',
          context: {
            aiUsage: totalUsage,
            hasReachedLimits: {
              coach: hasReachedCoachLimit,
              meals: hasReachedMealLimit,
              recipes: hasReachedRecipeLimit
            }
          }
        }
      });

      if (response.data?.recommendation) {
        setMessageText(response.data.recommendation);
      } else {
        // Fallback messages based on AI usage context
        const fallbackMessages = {
          sascha: hasReachedCoachLimit ? 
            "Limit erreicht! Pro holen = unbegrenzte AI-Power 🎯" : 
            "Zeit für Pro! Erreiche deine Ziele 3x schneller.",
          lucy: hasReachedMealLimit ? 
            "Deine AI-Analysen sind aufgebraucht, Schatz 💝 Pro für mehr!" : 
            "Mit Pro wird alles leichter und nachhaltiger 💝",
          kai: (hasReachedCoachLimit || hasReachedMealLimit) ? 
            "Limits gesprengt! 🔥 Pro = Unlimited Power! 💪" : 
            "Pro = Deine Transformation! Jetzt upgraden! 🔥💪"
        };
        setMessageText(fallbackMessages[coachPersonality as keyof typeof fallbackMessages] || fallbackMessages.sascha);
      }
    } catch (error) {
      console.error('Error generating coach message:', error);
      setMessageText("Hol dir Pro und erreiche deine Ziele schneller! 🚀");
    } finally {
      setGeneratingMessage(false);
    }
  };

  const checkForDailyMessage = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // Get user's profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('coach_personality, display_name, hide_premium_features')
        .eq('user_id', user.id)
        .single();

      // Don't show if user has disabled premium features
      if (profile?.hide_premium_features) {
        setIsLoading(false);
        return;
      }

      const coachPersonality = profile?.coach_personality || 'sascha';
      setSelectedCoach(coachPersonality);

      // Check for existing message record
      const { data: existingMessage } = await supabase
        .from('coach_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .eq('coach_id', coachPersonality)
        .single();

      let shouldShow = false;

      if (!existingMessage) {
        // Create first daily message
        const { data: newMessage } = await supabase
          .from('coach_recommendations')
          .insert({
            user_id: user.id,
            coach_id: coachPersonality,
            recommendation_count: 1,
            last_recommendation_sent: new Date().toISOString()
          })
          .select()
          .single();

        setCoachMessage(newMessage);
        shouldShow = true;
      } else {
        // Check if message was already shown today
        const lastShownDate = new Date(existingMessage.last_recommendation_sent).toISOString().split('T')[0];
        
        if (lastShownDate !== today) {
          // Update message for new day
          const { data: updatedMessage } = await supabase
            .from('coach_recommendations')
            .update({
              last_recommendation_sent: new Date().toISOString(),
              recommendation_count: existingMessage.recommendation_count + 1
            })
            .eq('id', existingMessage.id)
            .select()
            .single();

          setCoachMessage(updatedMessage);
          shouldShow = true;
        }
      }

      if (shouldShow) {
        await generateContextAwareMessage(coachPersonality, profile?.display_name);
        setShowMessage(true);
      }
    } catch (error) {
      console.error('Error checking daily coach message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const dismissForToday = () => {
    setShowMessage(false);
    toast.success('Coach-Nachricht ausgeblendet. Morgen gibt es eine neue!');
  };

  const dismissPermanently = () => {
    if (user) {
      supabase
        .from('profiles')
        .update({ hide_premium_features: true })
        .eq('user_id', user.id)
        .then(() => {
          setShowMessage(false);
          toast.success('Coach-Nachrichten dauerhaft deaktiviert. Du kannst sie in den Einstellungen wieder aktivieren.');
        });
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
                  <p className="text-xs text-muted-foreground font-medium">
                    {coachData.name} • Tägliche Nachricht
                  </p>
                  {aiUsageData && (
                    <p className="text-xs text-muted-foreground">
                      AI-Credits: {aiUsageData.coach_chat}/2 Chat • {aiUsageData.meal_analysis}/5 Analysen
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={dismissPermanently}
                  className="h-8 w-8 p-0 hover:bg-white/10"
                  title="Dauerhaft ausblenden"
                >
                  <Settings className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={dismissForToday}
                  className="h-8 w-8 p-0 hover:bg-white/10"
                  title="Heute ausblenden"
                >
                  <X className="h-4 w-4" />
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
                  {messageText}
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
                onClick={dismissForToday}
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
