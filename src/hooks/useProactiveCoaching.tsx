import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ProactiveMessage {
  id: string;
  type: 'check_in' | 'motivation' | 'celebration' | 'support' | 'surprise';
  message: string;
  trigger_reason: string;
  personality: string;
  sent_at: string;
}

interface UserActivityPattern {
  last_meal_logged: string | null;
  last_workout_logged: string | null;
  last_weight_logged: string | null;
  last_app_open: string | null;
  typical_active_hours: number[];
  inactive_days: number;
}

export const useProactiveCoaching = () => {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false); // Temporarily disabled
  const [lastMessage, setLastMessage] = useState<ProactiveMessage | null>(null);

  // Check for proactive opportunities every 5 minutes when app is active
  useEffect(() => {
    if (!user?.id || !isEnabled) return;

    const checkInterval = setInterval(() => {
      checkForProactiveOpportunities();
    }, 5 * 60 * 1000); // 5 minutes

    // Initial check
    checkForProactiveOpportunities();

    return () => clearInterval(checkInterval);
  }, [user?.id, isEnabled]);

  const checkForProactiveOpportunities = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get user activity pattern
      const activityPattern = await getUserActivityPattern();
      
      // Get user's coach personality
      const { data: profile } = await supabase
        .from('profiles')
        .select('coach_personality')
        .eq('user_id', user.id)
        .maybeSingle();

      const coachPersonality = profile?.coach_personality || 'motivierend';

      // Check various proactive scenarios
      await checkInactivitySupport(activityPattern, coachPersonality);
      await checkMilestoneOpportunities(coachPersonality);
      await checkMotivationalNudges(activityPattern, coachPersonality);
      await checkSurpriseAndDelight(coachPersonality);

    } catch (error) {
      console.error('Error checking proactive opportunities:', error);
    }
  }, [user?.id]);

  const getUserActivityPattern = async (): Promise<UserActivityPattern> => {
    if (!user?.id) {
      return {
        last_meal_logged: null,
        last_workout_logged: null,
        last_weight_logged: null,
        last_app_open: null,
        typical_active_hours: [],
        inactive_days: 0
      };
    }

    try {
      const [mealData, workoutData, weightData] = await Promise.all([
        supabase
          .from('meals')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1),
        
        supabase
          .from('workouts')
          .select('date')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(1),
        
        supabase
          .from('weight_history')
          .select('date')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(1)
      ]);

      const lastMeal = mealData.data?.[0]?.created_at || null;
      const lastWorkout = workoutData.data?.[0]?.date || null;
      const lastWeight = weightData.data?.[0]?.date || null;

      // Calculate inactive days
      const now = new Date();
      const lastActivity = [lastMeal, lastWorkout, lastWeight]
        .filter(Boolean)
        .map(date => new Date(date!))
        .sort((a, b) => b.getTime() - a.getTime())[0];

      const inactiveDays = lastActivity 
        ? Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      return {
        last_meal_logged: lastMeal,
        last_workout_logged: lastWorkout,
        last_weight_logged: lastWeight,
        last_app_open: new Date().toISOString(),
        typical_active_hours: [8, 9, 12, 13, 18, 19, 20], // Default active hours
        inactive_days: inactiveDays
      };

    } catch (error) {
      console.error('Error getting user activity pattern:', error);
      return {
        last_meal_logged: null,
        last_workout_logged: null,
        last_weight_logged: null,
        last_app_open: null,
        typical_active_hours: [],
        inactive_days: 0
      };
    }
  };

  const checkInactivitySupport = async (
    pattern: UserActivityPattern, 
    personality: string
  ) => {
    // If user hasn't logged anything for 2+ days
    if (pattern.inactive_days >= 2) {
      const messages = {
        motivierend: [
          "Hey! Ich hab dich ein paar Tage nicht gesehen. Wie läuft's denn? 💪",
          "Vermisse unsere Gespräche! Lass uns wieder durchstarten! 🚀",
          "Hey Champ! Zeit für ein kleines Comeback? Ich bin hier für dich! 🔥"
        ],
        hart: [
          "2 Tage Pause? Das reicht jetzt aber! Wo warst du? 🎯",
          "Komm schon, keine Ausreden mehr! Zurück an die Arbeit! ⚡",
          "Ich warte hier seit 2 Tagen! Zeit für Action! 💥"
        ],
        soft: [
          "Hallo Liebes ❤️ Ich mache mir ein bisschen Sorgen. Alles okay?",
          "Vermisse dich! Magst du mir erzählen, wie es dir geht? 🤗",
          "Du warst ein paar Tage weg. Brauchst du vielleicht Unterstützung? 💛"
        ]
      };

      const personalityMessages = messages[personality as keyof typeof messages] || messages.motivierend;
      const message = personalityMessages[Math.floor(Math.random() * personalityMessages.length)];

      await sendProactiveMessage('check_in', message, `Inactive for ${pattern.inactive_days} days`, personality);
    }
  };

  const checkMilestoneOpportunities = async (personality: string) => {
    // Check for recent achievements to celebrate
    try {
      const { data: recentMeals } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user!.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      const mealCount = recentMeals?.length || 0;

      if (mealCount >= 3) {
        const messages = {
          motivierend: [
            "Wow! 3+ Mahlzeiten heute geloggt! Du rockst das! 🌟",
            "Fantastische Konsistenz heute! Keep it up! 💪🔥",
            "Du bist heute richtig am Ball! Respekt! 👏"
          ],
          hart: [
            "Gut! Endlich mal Disziplin gezeigt! Weiter so! 🎯",
            "Das nenne ich Fortschritt! Jetzt bloß nicht nachlassen! ⚡",
            "Ordentlich! Aber das ist erst der Anfang! 💥"
          ],
          soft: [
            "Das macht mich so stolz! Du kümmerst dich super um dich! ❤️",
            "Siehst du? Du schaffst das wunderbar! 🌸",
            "Was für ein toller Tag! Du solltest stolz auf dich sein! 🤗"
          ]
        };

        const personalityMessages = messages[personality as keyof typeof messages] || messages.motivierend;
        const message = personalityMessages[Math.floor(Math.random() * personalityMessages.length)];

        await sendProactiveMessage('celebration', message, `Logged ${mealCount} meals today`, personality);
      }
    } catch (error) {
      console.error('Error checking milestones:', error);
    }
  };

  const checkMotivationalNudges = async (
    pattern: UserActivityPattern, 
    personality: string
  ) => {
    const currentHour = new Date().getHours();
    
    // Evening motivation if no workout logged
    if (currentHour >= 18 && currentHour <= 20 && !pattern.last_workout_logged) {
      const messages = {
        motivierend: [
          "Perfekte Zeit für ein kleines Workout! 30 Minuten reichen schon! 💪",
          "Abends noch Lust auf Bewegung? Dein Körper wird es dir danken! 🏃‍♂️",
          "Wie wär's mit einem entspannten Spaziergang? 🚶‍♀️✨"
        ],
        hart: [
          "Abends faul auf der Couch? Das war's noch nicht für heute! 🎯",
          "Noch Zeit für Sport! Keine Ausreden! Los geht's! ⚡",
          "Der Tag ist noch nicht vorbei! Beweg dich! 💥"
        ],
        soft: [
          "Ein sanfter Abendspaziergang könnte dir gut tun ❤️",
          "Magst du heute noch etwas für dich tun? Yoga vielleicht? 🧘‍♀️",
          "Ein bisschen Bewegung entspannt wunderbar nach dem Tag 🌅"
        ]
      };

      const personalityMessages = messages[personality as keyof typeof messages] || messages.motivierend;
      const message = personalityMessages[Math.floor(Math.random() * personalityMessages.length)];

      await sendProactiveMessage('motivation', message, 'Evening workout nudge', personality);
    }
  };

  const checkSurpriseAndDelight = async (personality: string) => {
    // Random surprise messages (5% chance when checking)
    if (Math.random() < 0.05) {
      const surprises = {
        motivierend: [
          "Fun Fact: Wusstest du, dass Lachen 10-40 Kalorien verbrennt? 😄",
          "Tipp des Tages: Trinke ein Glas Wasser, bevor du isst! 💧",
          "Du bist stärker als du denkst! Das wollte ich dir nur mal sagen 💪✨"
        ],
        hart: [
          "Fact: Champions essen Proteine zum Frühstück! 🥚💪",
          "Real Talk: Consistency beats perfection! Immer! 🎯",
          "Reminder: Deine Konkurrenz schläft nie! Du auch nicht! ⚡"
        ],
        soft: [
          "Kleine Erinnerung: Du bist wundervoll, genau wie du bist ❤️",
          "Heute schon gelächelt? Das wärmt mein Herz! 😊",
          "Du machst das so toll! Ich glaube fest an dich! 🌟"
        ]
      };

      const personalityMessages = surprises[personality as keyof typeof surprises] || surprises.motivierend;
      const message = personalityMessages[Math.floor(Math.random() * personalityMessages.length)];

      await sendProactiveMessage('surprise', message, 'Random surprise message', personality);
    }
  };

  const sendProactiveMessage = async (
    type: ProactiveMessage['type'],
    message: string,
    triggerReason: string,
    personality: string
  ) => {
    try {
      // Check if we sent a message recently (avoid spam)
      // @ts-ignore - Types will be updated after migration
      const { data: recentMessages } = await supabase
        .from('proactive_messages')
        .select('*')
        .eq('user_id', user!.id)
        .gte('sent_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Last 2 hours
        .order('sent_at', { ascending: false })
        .limit(1);

      if (recentMessages && recentMessages.length > 0) {
        return; // Don't spam user
      }

      // Save proactive message
      // @ts-ignore - Types will be updated after migration
      const { data } = await supabase
        .from('proactive_messages')
        .insert({
          user_id: user!.id,
          message_type: type,
          message_content: message,
          trigger_reason: triggerReason,
          coach_personality: personality
        })
        .select()
        .maybeSingle();

      if (data) {
        const proactiveMessage: ProactiveMessage = {
          id: data.id,
          // @ts-ignore - Types will be updated after migration
          type: data.message_type,
          // @ts-ignore - Types will be updated after migration
          message: data.message_content,
          // @ts-ignore - Types will be updated after migration
          trigger_reason: data.trigger_reason,
          // @ts-ignore - Types will be updated after migration
          personality: data.coach_personality,
          // @ts-ignore - Types will be updated after migration
          sent_at: data.sent_at
        };

        setLastMessage(proactiveMessage);

        // ARES-Only: Single coach system
        const coachName = 'ARES';
        const icon = '⚡';
        
        toast(message, {
          description: `${icon} ${coachName}`,
          duration: 6000,
        });
      }

    } catch (error) {
      console.error('Error sending proactive message:', error);
    }
  };

  return {
    isEnabled,
    setIsEnabled,
    lastMessage,
    checkForProactiveOpportunities
  };
};