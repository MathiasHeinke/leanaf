
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const useCoachLimitHandler = () => {
  const navigate = useNavigate();

  const showLimitReachedToast = (
    featureType: 'coach_chat' | 'meal_analysis' | 'coach_recipes' | 'daily_analysis',
    coachPersonality: string = 'motivierend'
  ) => {
    const messages = {
      coach_chat: {
        sascha: "Deine 2 täglichen Coach-Gespräche sind aufgebraucht! 🎯 Morgen wieder verfügbar.",
        lucy: "Deine Coach-Gespräche sind für heute aufgebraucht, Schatz 💝 Morgen gibt's neue!",
        kai: "Coach-Limit erreicht! 🔥 Morgen stehen dir wieder 2 Gespräche zur Verfügung! 💪"
      },
      meal_analysis: {
        sascha: "5 AI-Analysen aufgebraucht! 🍽️ Morgen wieder verfügbar.",
        lucy: "Deine Meal-Analysen sind für heute aufgebraucht 💝 Morgen gibt's neue!",
        kai: "Meal-Analysis-Limit gesprengt! 🔥 Morgen wieder 5 neue Analysen! 💪"
      },
      coach_recipes: {
        sascha: "Coach-Rezepte für heute aufgebraucht! 👨‍🍳 Morgen wieder verfügbar.",
        lucy: "Dein Rezept für heute ist aufgebraucht 💝 Morgen gibt's ein neues!",
        kai: "Rezept-Limit erreicht! 🔥 Morgen gibt's wieder ein neues Rezept! 💪"
      },
      daily_analysis: {
        sascha: "Wöchentliche Analyse bereits genutzt! 📊 Nächste Woche wieder verfügbar.",
        lucy: "Deine wöchentliche Analyse ist schon verwendet 💝 Nächste Woche wieder!",
        kai: "Weekly Analysis done! 🔥 Nächste Woche wieder eine neue! 💪"
      }
    };

    const message = messages[featureType][coachPersonality as keyof typeof messages[typeof featureType]] || 
                   messages[featureType].kai;

    toast.error(message, {
      action: {
        label: "Pro holen - 33% Rabatt!",
        onClick: () => navigate('/subscription')
      },
      duration: 5000
    });
  };

  const handleLimitError = (error: any, featureType: string, coachPersonality: string = 'motivierend') => {
    console.error(`${featureType} limit error:`, error);
    
    if (error.message?.includes('limit') || error.message?.includes('429')) {
      showLimitReachedToast(
        featureType as 'coach_chat' | 'meal_analysis' | 'coach_recipes' | 'daily_analysis',
        coachPersonality
      );
    } else {
      // Generic error
      toast.error('Es gab einen technischen Fehler. Bitte versuche es später erneut.');
    }
  };

  return {
    showLimitReachedToast,
    handleLimitError
  };
};
