
import { RandomQuote } from "@/components/RandomQuote";
import { useAuth } from "@/hooks/useAuth";
import { generateDynamicCoachGreeting, createGreetingContext } from "@/utils/dynamicCoachGreetings";
import { useGlobalCoachMemory } from "@/hooks/useGlobalCoachMemory";
import { useParams } from "react-router-dom";

interface OptimizedGreetingProps {
  userProfile?: any;
  coachId?: string;
}

export const OptimizedGreeting = ({ userProfile, coachId }: OptimizedGreetingProps) => {
  const { user } = useAuth();
  const { memory } = useGlobalCoachMemory();
  const params = useParams();

  // Determine current coach from route or prop
  const currentCoachId = coachId || (params['*']?.split('/')[0]) || 'lucy';
  
  const getUserName = () => {
    if (userProfile?.display_name) {
      return userProfile.display_name.split(' ')[0];
    }
    if (user?.email) {
      const emailName = user.email.split('@')[0];
      if (/^[a-zA-Z]/.test(emailName)) {
        return emailName.split('.')[0];
      }
    }
    return 'Du';
  };

  // Generate personalized coach greeting
  const generateCoachGreeting = () => {
    const firstName = getUserName();
    const context = createGreetingContext(firstName, currentCoachId, memory, false);
    return generateDynamicCoachGreeting(context);
  };

  // Show coach-specific greeting when we have a coach context
  const shouldShowGreeting = currentCoachId && ['lucy', 'sascha', 'kai', 'markus', 'dr-vita', 'integral'].includes(currentCoachId);

  if (!shouldShowGreeting) {
    return null;
  }

  return (
    <div className="mb-4 p-4 bg-gradient-to-r from-primary/10 to-primary-glow/5 rounded-xl border border-primary/20">
      <div className="text-center space-y-3">
        <div className="text-lg font-medium text-primary">
          {generateCoachGreeting()}
        </div>
        <div className="max-w-sm mx-auto opacity-75">
          <RandomQuote 
            userGender={userProfile?.gender}
            fallbackText=""
          />
        </div>
      </div>
    </div>
  );
};
