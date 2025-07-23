import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Crown, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface CoachRecommendation {
  id: string;
  coach_id: string;
  last_recommendation_sent: string;
  recommendation_count: number;
}

const COACH_DATA = {
  sascha: {
    name: "Sascha",
    avatar: "/coach-images/2c06031d-707a-400d-aaa0-a46decdddfe2.png"
  },
  lucy: {
    name: "Lucy", 
    avatar: "/coach-images/9e4f4475-6b1f-4563-806d-89f78ba853e6.png"
  },
  kai: {
    name: "Kai",
    avatar: "/coach-images/fa6fb4d0-0626-4ff4-a5c2-552d0e3d9bbb.png"
  }
};

export const WeeklyCoachRecommendation = () => {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const navigate = useNavigate();
  const [recommendation, setRecommendation] = useState<CoachRecommendation | null>(null);
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<string>('sascha');
  const [isLoading, setIsLoading] = useState(true);
  const [coachMessage, setCoachMessage] = useState<string>('');
  const [generatingMessage, setGeneratingMessage] = useState(false);

  useEffect(() => {
    if (!user || isPremium) {
      setIsLoading(false);
      return;
    }

    checkForRecommendation();
  }, [user, isPremium]);

  const generateCoachMessage = async (coachPersonality: string, userName?: string) => {
    setGeneratingMessage(true);
    try {
      const response = await supabase.functions.invoke('generate-coach-recommendation', {
        body: { 
          coachPersonality,
          userName: userName || 'Champion'
        }
      });

      if (response.data?.recommendation) {
        setCoachMessage(response.data.recommendation);
      } else {
        // Fallback messages if API fails
        const fallbackMessages = {
          sascha: "Zeit für Pro! Erreiche deine Ziele 3x schneller.",
          lucy: "Mit Pro wird alles leichter und nachhaltiger 💝",
          kai: "Pro = Deine Transformation! Jetzt upgraden! 🔥💪"
        };
        setCoachMessage(fallbackMessages[coachPersonality as keyof typeof fallbackMessages] || fallbackMessages.sascha);
      }
    } catch (error) {
      console.error('Error generating coach message:', error);
      // Fallback message
      setCoachMessage("Hol dir Pro und erreiche deine Ziele schneller!");
    } finally {
      setGeneratingMessage(false);
    }
  };

  const checkForRecommendation = async () => {
    if (!user) return;

    try {
      // Get user's profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('coach_personality, display_name')
        .eq('user_id', user.id)
        .single();

      const coachPersonality = profile?.coach_personality || 'sascha';
      setSelectedCoach(coachPersonality);

      // Check for existing recommendation
      const { data: existingRec } = await supabase
        .from('coach_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .eq('coach_id', coachPersonality)
        .single();

      let shouldShow = false;

      if (!existingRec) {
        // Create first recommendation
        const { data: newRec } = await supabase
          .from('coach_recommendations')
          .insert({
            user_id: user.id,
            coach_id: coachPersonality,
            recommendation_count: 1
          })
          .select()
          .single();

        setRecommendation(newRec);
        shouldShow = true;
      } else {
        // Check if 7 days have passed since last recommendation
        const lastSent = new Date(existingRec.last_recommendation_sent);
        const now = new Date();
        const daysDiff = (now.getTime() - lastSent.getTime()) / (1000 * 3600 * 24);

        if (daysDiff >= 7) {
          // Update recommendation
          const { data: updatedRec } = await supabase
            .from('coach_recommendations')
            .update({
              last_recommendation_sent: new Date().toISOString(),
              recommendation_count: existingRec.recommendation_count + 1
            })
            .eq('id', existingRec.id)
            .select()
            .single();

          setRecommendation(updatedRec);
          shouldShow = true;
        }
      }

      if (shouldShow) {
        await generateCoachMessage(coachPersonality, profile?.display_name);
        setShowRecommendation(true);
      }
    } catch (error) {
      console.error('Error checking coach recommendation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const dismissRecommendation = () => {
    setShowRecommendation(false);
  };

  const handleUpgrade = () => {
    navigate('/subscription');
    setShowRecommendation(false);
  };

  if (isLoading || !showRecommendation || isPremium || !user) {
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
                  <p className="text-xs text-muted-foreground font-medium">{coachData.name} empfiehlt</p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissRecommendation}
                className="h-8 w-8 p-0 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
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
                onClick={dismissRecommendation}
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
