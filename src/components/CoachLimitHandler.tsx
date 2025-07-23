
import React from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface CoachLimitHandlerProps {
  error: any;
  featureType: 'coach_chat' | 'meal_analysis' | 'coach_recipes' | 'daily_analysis';
}

export const CoachLimitHandler: React.FC<CoachLimitHandlerProps> = ({ error, featureType }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  React.useEffect(() => {
    if (error?.code === 'USAGE_LIMIT_EXCEEDED' || error?.status === 429) {
      handleLimitError();
    }
  }, [error]);

  const handleLimitError = async () => {
    // Get user's coach personality for personalized messages
    let coachPersonality = 'motivierend';
    if (user) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('coach_personality')
          .eq('user_id', user.id)
          .single();
        
        if (profile?.coach_personality) {
          coachPersonality = profile.coach_personality;
        }
      } catch (err) {
        console.error('Error fetching coach personality:', err);
      }
    }

    const messages = getCoachMessages(coachPersonality, featureType);
    
    toast.error(messages.toast, {
      duration: 8000,
      action: {
        label: "Pro holen - 33% Rabatt!",
        onClick: () => navigate('/subscription')
      }
    });
  };

  const getCoachMessages = (personality: string, feature: string) => {
    const messageMap = {
      coach_chat: {
        sascha: "Schluss mit Ausreden! 🎯 Deine 2 täglichen Coach-Gespräche sind aufgebraucht. Morgen wieder verfügbar oder JETZT Pro holen!",
        soft: "Deine 2 Coach-Gespräche sind für heute aufgebraucht ❤️ Morgen stehen dir wieder 2 zur Verfügung. Pro = unbegrenzte Gespräche!",
        motivierend: "Power-User! 💪 Deine 2 täglichen Coach-Gespräche sind geschafft! Morgen wieder da oder Pro für unlimited Power!"
      },
      meal_analysis: {
        sascha: "Fertig für heute! 🍽️ Deine 5 AI-Analysen sind aufgebraucht. Morgen wieder verfügbar oder Pro für unlimited Analysis!",
        soft: "Deine 5 täglichen AI-Analysen sind geschafft ❤️ Morgen wieder verfügbar. Upgrade für unlimited AI!",
        motivierend: "Mega! 💪 5 Analysen geschafft! Morgen wieder 5 verfügbar oder Pro für unlimited AI-Power!"
      },
      coach_recipes: {
        sascha: "Rezept-Limit erreicht! 👨‍🍳 Morgen wieder verfügbar oder Pro für unlimited Rezepte!",
        soft: "Dein Daily Recipe ist geschafft ❤️ Morgen wieder verfügbar. Pro = unbegrenzte Rezepte!",
        motivierend: "Recipe-Champion! 💪 Morgen wieder verfügbar oder Pro für unlimited Rezepte!"
      },
      daily_analysis: {
        sascha: "Weekly Analysis fertig! 📊 Nächste Woche wieder da oder Pro für tägliche Insights!",
        soft: "Deine wöchentliche Analyse ist geschafft ❤️ Pro bietet dir tägliche Insights!",
        motivierend: "Analysis-Power! 💪 Nächste Woche wieder da oder Pro für daily Insights!"
      }
    };

    const defaultMessage = "Limit erreicht! Morgen wieder verfügbar oder Pro für unlimited Features!";
    
    return {
      toast: messageMap[feature as keyof typeof messageMap]?.[personality as keyof typeof messageMap[feature]] || defaultMessage
    };
  };

  return null;
};
