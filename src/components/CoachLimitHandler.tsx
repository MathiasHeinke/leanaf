import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface LimitError {
  status: number;
  message?: string;
}

interface CoachLimitHandlerProps {
  coachPersonality: string;
  feature: 'coach_chat' | 'meal_analysis' | 'coach_recipes' | 'daily_analysis';
}

const FEATURE_LIMITS = {
  coach_chat: { daily: 2, name: 'Coach-Gespräche' },
  meal_analysis: { daily: 5, name: 'AI-Analysen' },
  coach_recipes: { daily: 1, name: 'Rezept-Anfragen' },
  daily_analysis: { weekly: 1, name: 'Wochenanalysen' }
} as const;

export const useCoachLimitHandler = ({ coachPersonality, feature }: CoachLimitHandlerProps) => {
  const navigate = useNavigate();

  const getCoachName = (personality: string) => {
    switch (personality) {
      case 'hart': return 'Sascha';
      case 'soft': return 'Lucy';
      case 'motivierend':
      default: return 'Kai';
    }
  };

  const getCoachIcon = (personality: string) => {
    switch (personality) {
      case 'hart': return '🎯';
      case 'soft': return '❤️';
      case 'motivierend':
      default: return '💪';
    }
  };

  const getPersonalizedLimitMessage = (personality: string, feature: string) => {
    const coachName = getCoachName(personality);
    const icon = getCoachIcon(personality);
    const featureData = FEATURE_LIMITS[feature as keyof typeof FEATURE_LIMITS];
    
    const baseMessages = {
      hart: {
        coach_chat: `${icon} Hey! ${coachName} hier. Deine 2 täglichen Coach-Sessions sind aufgebraucht! Morgen geht's weiter - oder upgrade jetzt für unbegrenzte Gespräche!`,
        meal_analysis: `${icon} ${coachName} hier! Deine 5 täglichen AI-Analysen sind durch. Upgrade für unlimited Power!`,
        coach_recipes: `${icon} Daily Recipe-Limit erreicht! ${coachName} sagt: Pro = unbegrenzte Rezepte!`,
        daily_analysis: `${icon} Wochenanalyse bereits genutzt! ${coachName} empfiehlt Pro für mehr Insights!`
      },
      soft: {
        coach_chat: `${icon} Liebe/r, ${coachName} hier. Du hast heute schon 2 schöne Gespräche geführt. Morgen bin ich wieder für dich da! ❤️`,
        meal_analysis: `${icon} Du hast heute schon 5 Mal nach Analysen gefragt, das ist super! Morgen gibt's wieder neue. Pro-Plan für mehr? 💕`,
        coach_recipes: `${icon} Ein Rezept pro Tag reicht meist aus, aber als Pro-Mitglied kannst du so viele anfragen wie du möchtest! 🍳`,
        daily_analysis: `${icon} Diese Woche hast du schon eine schöne Analyse erhalten. Nächste Woche gibt's die nächste! 📊`
      },
      motivierend: {
        coach_chat: `${icon} Hey Champion! ${coachName} hier. 2 starke Gespräche heute geschafft! Morgen legen wir wieder los - oder Pro für unlimited Power!`,
        meal_analysis: `${icon} Wow, 5 AI-Analysen heute! Du bist am Ball! Upgrade für unlimited Analysen und bleib dran! 🔥`,
        coach_recipes: `${icon} Ein Rezept-Request heute erledigt! Pro-Plan = unlimited Rezepte für maximale Performance! 👨‍🍳`,
        daily_analysis: `${icon} Weekly Analysis complete! Nächste Woche gibt's die nächste Power-Analyse! 📈`
      }
    };

    return baseMessages[personality as keyof typeof baseMessages]?.[feature as keyof typeof baseMessages.hart] || 
           baseMessages.motivierend[feature as keyof typeof baseMessages.motivierend];
  };

  const showLimitReachedToast = (personality: string, feature: string) => {
    // ✅ UNLIMITED MODE: No limit toasts
    return;
  };

  const handleError = (error: LimitError): string => {
    // ✅ UNLIMITED MODE: All features unlimited, no rate limiting
    // Return simple technical error message
    return "Technisches Problem aufgetreten. Bitte versuche es nochmal.";
  };

  return {
    handleError,
    showLimitReachedToast,
    getPersonalizedLimitMessage
  };
};

export default useCoachLimitHandler;