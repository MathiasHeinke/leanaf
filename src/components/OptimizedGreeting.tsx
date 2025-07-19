
import { useTranslation } from "@/hooks/useTranslation";
import { RandomQuote } from "@/components/RandomQuote";
import { useAuth } from "@/hooks/useAuth";

interface OptimizedGreetingProps {
  userProfile?: any;
}

export const OptimizedGreeting = ({ userProfile }: OptimizedGreetingProps) => {
  const { user } = useAuth();

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Guten Morgen";
    if (hour < 18) return "Guten Tag"; 
    return "Guten Abend";
  };

  const getUserName = () => {
    return userProfile?.display_name || user?.email?.split('@')[0] || 'Nutzer';
  };

  // Only show greeting if we have gender-specific content or it's a new user
  const shouldShowGreeting = userProfile?.gender === 'male' || userProfile?.gender === 'female';

  if (!shouldShowGreeting) {
    return null; // No intrusive content for users without gender data
  }

  return (
    <div className="mb-4 p-3 bg-gradient-to-r from-primary/5 to-primary-glow/5 rounded-xl border border-primary/10">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold text-primary">
          {getTimeBasedGreeting()}, {getUserName()}! 👋
        </h2>
        <div className="max-w-sm mx-auto">
          <RandomQuote 
            userGender={userProfile?.gender}
            fallbackText="" // No fallback text to avoid redundancy
          />
        </div>
      </div>
    </div>
  );
};
