import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGlobalCoachMemory } from '@/hooks/useGlobalCoachMemory';
import { supabase } from '@/integrations/supabase/client';

interface DynamicCoachGreetingProps {
  coachId: string;
  coachName: string;
  coachRole: string;
  userProfile?: any;
}

interface ContextTokens {
  userName: string;
  timeOfDay: string;
  lastWorkout?: string;
  sleepHours?: number;
  coachFocus: string;
  calLeft?: number;
  lastLift?: string;
}

export const DynamicCoachGreeting = ({ 
  coachId, 
  coachName, 
  coachRole, 
  userProfile 
}: DynamicCoachGreetingProps) => {
  const { user } = useAuth();
  const { memory } = useGlobalCoachMemory();
  const [greeting, setGreeting] = useState('');

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

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Morgen";
    if (hour < 18) return "Tag"; 
    return "Abend";
  };

  const generateCoachGreeting = async (tokens: ContextTokens) => {
    const templates = {
      lucy: [
        `Guten ${tokens.timeOfDay}, ${tokens.userName}! 🍏\nLust auf eine gesunde Mahlzeit-Idee?`,
        `Hey ${tokens.userName}! 🌱\nWie können wir heute deinen Stoffwechsel ankurbeln?`,
        `Moin ${tokens.userName}! 💪\nZeit für smarte Ernährung - was steht an?`
      ],
      sascha: [
        `Hey ${tokens.userName}! 🔥\nReady für ein starkes Training heute?`,
        `Moin ${tokens.userName}! 💪\nLass uns deine Grenzen verschieben!`,
        `Guten ${tokens.timeOfDay}, ${tokens.userName}! ⚡\nZeit für Performance!`
      ],
      kai: [
        `Guten ${tokens.timeOfDay}, ${tokens.userName}! 🧘‍♂️\nWie fühlst du dich heute?`,
        `Hey ${tokens.userName}! ✨\nBereit für eine ganzheitliche Transformation?`,
        `Moin ${tokens.userName}! 🌟\nLass uns an deinem Mindset arbeiten!`
      ],
      'dr-vita': [
        `Guten ${tokens.timeOfDay}, ${tokens.userName}! 🌸\nWie kann ich dir heute helfen?`,
        `Hey ${tokens.userName}! 💖\nZeit für deine weibliche Gesundheit!`,
        `Moin ${tokens.userName}! 🌺\nLass uns über Hormone und Wohlbefinden sprechen!`
      ]
    };

    const coachTemplates = templates[coachId as keyof typeof templates] || templates.lucy;
    const randomTemplate = coachTemplates[Math.floor(Math.random() * coachTemplates.length)];
    
    return randomTemplate;
  };

  useEffect(() => {
    const loadGreeting = async () => {
      const tokens: ContextTokens = {
        userName: getUserName(),
        timeOfDay: getTimeOfDay(),
        coachFocus: coachRole
      };

      // Load additional context from memory
      if (memory && memory.conversation_context) {
        // Use existing memory data for context
        const recentMoods = memory.conversation_context.mood_history || [];
        if (recentMoods.length > 0) {
          const lastMood = recentMoods[recentMoods.length - 1];
          // Could use mood data to adjust greeting tone
        }
      }

      const generatedGreeting = await generateCoachGreeting(tokens);
      setGreeting(generatedGreeting);
    };

    loadGreeting();
  }, [coachId, coachName, user, userProfile]);

  if (!greeting) {
    return (
      <div className="mb-4 p-4 bg-gradient-to-r from-primary/10 to-primary-glow/5 rounded-2xl border border-primary/20">
        <div className="text-center">
          <h2 className="text-xl font-bold text-primary">
            {`Hallo ${getUserName()}! 👋`}
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 p-4 bg-gradient-to-r from-primary/10 to-primary-glow/5 rounded-2xl border border-primary/20">
      <div className="text-center">
        <h2 className="text-xl font-bold text-primary whitespace-pre-line">
          {greeting}
        </h2>
      </div>
    </div>
  );
};