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

  // ARES-only: always return ARES
  const getCoachName = (_personality: string) => 'ARES';

  // ARES-only: always use Zap icon
  const getCoachIcon = (_personality: string) => '⚡';

  const getPersonalizedLimitMessage = (_personality: string, feature: string) => {
    const coachName = 'ARES';
    const icon = '⚡';
    
    const messages: Record<string, string> = {
      coach_chat: `${icon} ${coachName} hier! Deine 2 täglichen Coach-Sessions sind aufgebraucht! Morgen geht's weiter - oder upgrade jetzt für unbegrenzte Gespräche!`,
      meal_analysis: `${icon} ${coachName} hier! Deine 5 täglichen AI-Analysen sind durch. Upgrade für unlimited Power!`,
      coach_recipes: `${icon} Daily Recipe-Limit erreicht! ${coachName} sagt: Pro = unbegrenzte Rezepte!`,
      daily_analysis: `${icon} Wochenanalyse bereits genutzt! ${coachName} empfiehlt Pro für mehr Insights!`
    };

    return messages[feature] || messages.coach_chat;
  };

  const showLimitReachedToast = (_personality: string, _feature: string) => {
    // ✅ UNLIMITED MODE: No limit toasts
    return;
  };

  const handleError = (_error: LimitError): string => {
    // ✅ UNLIMITED MODE: All features unlimited, no rate limiting
    return "Technisches Problem aufgetreten. Bitte versuche es nochmal.";
  };

  return {
    handleError,
    showLimitReachedToast,
    getPersonalizedLimitMessage
  };
};

export default useCoachLimitHandler;
