
import { useTranslation } from "@/hooks/useTranslation";
import { RandomQuote } from "@/components/RandomQuote";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateDynamicCoachGreeting, createGreetingContext } from "@/utils/dynamicCoachGreetings";
import { useGlobalCoachMemory } from "@/hooks/useGlobalCoachMemory";
import { useParams } from "react-router-dom";

// Import getDisplayName utility
const getDisplayName = (profile: any): string => {
  return (
    profile?.preferred_name ||
    profile?.first_name ||
    profile?.nickname ||
    profile?.full_name ||
    profile?.email?.split('@')[0] ||
    'Athlet'
  );
};

interface DailyGreetingProps {
  userProfile?: any;
  coachId?: string;
}

export const DailyGreeting = ({ userProfile, coachId }: DailyGreetingProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { memory } = useGlobalCoachMemory();
  const params = useParams();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Determine current coach from route or prop
  const currentCoachId = coachId || (params['*']?.split('/')[0]) || 'lucy';
  
  const getUserName = () => {
    // Use getDisplayName utility instead of direct email extraction
    const fullName = getDisplayName(userProfile);
    if (fullName && fullName !== 'Athlet') {
      return fullName.split(' ')[0]; // Get first name only
    }
    return 'Du';
  };

  // Generate personalized coach greeting or fallback to time-based
  const generateGreeting = () => {
    if (currentCoachId && ['lucy', 'sascha', 'kai', 'markus', 'dr_vita', 'sophia'].includes(currentCoachId)) {
      const firstName = getUserName();
      const context = createGreetingContext(firstName, currentCoachId, memory, false);
      return generateDynamicCoachGreeting(context);
    }
    
    // Fallback to time-based greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
    return `${greeting}, ${getUserName()}! 👋`;
  };

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-primary-glow/5 rounded-2xl border border-primary/20">
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold text-primary">
          {generateGreeting()}
        </h2>
        <div className="max-w-sm mx-auto">
          <RandomQuote 
            userGender={userProfile?.gender}
            fallbackText="Bleib motiviert! 💪"
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>
    </div>
  );
};
