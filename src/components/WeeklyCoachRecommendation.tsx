import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Crown } from 'lucide-react';
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

const COACH_MESSAGES = {
  sascha: {
    name: "Sascha",
    message: "Hey! Zeit für den nächsten Level. Mit Pro holst du 300% mehr aus deinem Training raus!",
    avatar: "/lovable-uploads/2c06031d-707a-400d-aaa0-a46decdddfe2.png"
  },
  lucy: {
    name: "Lucy", 
    message: "Du machst das schon so toll! Mit Pro können wir noch viel sanfter und nachhaltiger an deine Ziele.",
    avatar: "/lovable-uploads/9e4f4475-6b1f-4563-806d-89f78ba853e6.png"
  },
  kai: {
    name: "Kai",
    message: "BOOM! 🔥 Du rockst das! Aber stell dir vor, was mit Pro möglich wäre - unlimited Power!",
    avatar: "/lovable-uploads/fa6fb4d0-0626-4ff4-a5c2-552d0e3d9bbb.png"
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

  useEffect(() => {
    if (!user || isPremium) {
      setIsLoading(false);
      return;
    }

    checkForRecommendation();
  }, [user, isPremium]);

  const checkForRecommendation = async () => {
    if (!user) return;

    try {
      // Get user's selected coach from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('coach_personality')
        .eq('user_id', user.id)
        .single();

      if (profile?.coach_personality) {
        setSelectedCoach(profile.coach_personality);
      }

      // Check for existing recommendation
      const { data: existingRec } = await supabase
        .from('coach_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .eq('coach_id', profile?.coach_personality || 'sascha')
        .single();

      if (!existingRec) {
        // Create first recommendation
        const { data: newRec } = await supabase
          .from('coach_recommendations')
          .insert({
            user_id: user.id,
            coach_id: profile?.coach_personality || 'sascha',
            recommendation_count: 1
          })
          .select()
          .single();

        setRecommendation(newRec);
        setShowRecommendation(true);
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
          setShowRecommendation(true);
        }
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

  const coachData = COACH_MESSAGES[selectedCoach as keyof typeof COACH_MESSAGES] || COACH_MESSAGES.sascha;

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <img
              src={coachData.avatar}
              alt={coachData.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
            />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-foreground">
                {coachData.name} empfiehlt
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissRecommendation}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">
              {coachData.message}
            </p>
            
            <div className="flex gap-2">
              <Button
                onClick={handleUpgrade}
                size="sm"
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
              >
                <Crown className="h-4 w-4 mr-1" />
                Jetzt Pro holen - 33% Rabatt!
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={dismissRecommendation}
              >
                Später erinnern
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};