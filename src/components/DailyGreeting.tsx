
import { useTranslation } from "@/hooks/useTranslation";
import { RandomQuote } from "@/components/RandomQuote";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DailyGreetingProps {
  userProfile?: any;
}

export const DailyGreeting = ({ userProfile }: DailyGreetingProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Guten Morgen";
    if (hour < 18) return "Guten Tag"; 
    return "Guten Abend";
  };

  const getUserName = () => {
    return userProfile?.display_name || user?.email?.split('@')[0] || 'Nutzer';
  };

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-primary-glow/5 rounded-2xl border border-primary/20">
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold text-primary">
          {getTimeBasedGreeting()}, {getUserName()}! 👋
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
