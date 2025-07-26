import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CoachFeedbackCardProps {
  coachName: string;
  coachAvatar: string;
  sleepData?: any;
  workoutData?: any;
  weightData?: any;
  measurementData?: any;
  userId?: string;
  type: 'sleep' | 'workout' | 'weight';
}

export const CoachFeedbackCard = ({ 
  coachName, 
  coachAvatar, 
  sleepData, 
  workoutData, 
  weightData,
  measurementData,
  userId,
  type 
}: CoachFeedbackCardProps) => {
  const [feedback, setFeedback] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCoachFeedback = async () => {
      if (!userId) return;

      setIsLoading(true);
      try {
        let functionName = '';
        let requestBody: any = { userId };

        switch (type) {
          case 'sleep':
            functionName = 'coach-sleep-analysis';
            requestBody.sleepData = sleepData;
            break;
          case 'workout':
            functionName = 'coach-workout-analysis';
            requestBody.workoutData = workoutData;
            break;
          case 'weight':
            functionName = 'coach-weight-analysis';
            requestBody.weightData = weightData;
            requestBody.measurementData = measurementData;
            break;
        }

        console.log(`Calling ${functionName} with:`, requestBody);
        
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: requestBody
        });

        console.log(`Response from ${functionName}:`, { data, error });

        if (error) {
          console.error(`Error from ${functionName}:`, error);
          throw error;
        }
        
        setFeedback(data?.coachFeedback || "Feedback wird geladen...");
      } catch (error) {
        console.error('Error fetching coach feedback:', error);
        setFeedback(getGenericFeedback(type));
      } finally {
        setIsLoading(false);
      }
    };

    fetchCoachFeedback();
  }, [userId, sleepData, workoutData, weightData, measurementData, type]);

  const getGenericFeedback = (type: string) => {
    switch (type) {
      case 'sleep':
        return "Guter Schlaf ist die Basis für erfolgreiche Regeneration! 🌙";
      case 'workout':
        return "Jede Bewegung bringt dich deinem Ziel näher! 💪";
      case 'weight':
        return "Kontinuierliche Fortschritte sind der Schlüssel zum Erfolg! 💖";
      default:
        return "Weiter so!";
    }
  };

  const getThemeColors = (type: string) => {
    switch (type) {
      case 'sleep':
        return {
          bg: 'bg-purple-100/50 dark:bg-purple-900/30',
          border: 'border-purple-200 dark:border-purple-700',
          text: 'text-purple-700 dark:text-purple-300',
          nameText: 'text-purple-800 dark:text-purple-200'
        };
      case 'workout':
        return {
          bg: 'bg-orange-100/50 dark:bg-orange-900/30',
          border: 'border-orange-200 dark:border-orange-700',
          text: 'text-orange-700 dark:text-orange-300',
          nameText: 'text-orange-800 dark:text-orange-200'
        };
      case 'weight':
        return {
          bg: 'bg-pink-100/50 dark:bg-pink-900/30',
          border: 'border-pink-200 dark:border-pink-700',
          text: 'text-pink-700 dark:text-pink-300',
          nameText: 'text-pink-800 dark:text-pink-200'
        };
      default:
        return {
          bg: 'bg-gray-100/50 dark:bg-gray-900/30',
          border: 'border-gray-200 dark:border-gray-700',
          text: 'text-gray-700 dark:text-gray-300',
          nameText: 'text-gray-800 dark:text-gray-200'
        };
    }
  };

  const colors = getThemeColors(type);

  return (
    <div className={`${colors.bg} rounded-lg p-3 ${colors.border} border`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <img 
            src={coachAvatar} 
            alt={`${coachName} Avatar`}
            className="w-8 h-8 rounded-full object-cover"
            onError={(e) => {
              console.log(`Failed to load avatar: ${coachAvatar}`);
              e.currentTarget.src = '/coach-images/default-avatar.jpg';
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-semibold ${colors.nameText}`}>
              Coach {coachName}
            </span>
            <span className="text-pink-500">❤️</span>
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current opacity-50"></div>
              <span className={`text-xs ${colors.text} opacity-75`}>
                Analysiere deine Daten...
              </span>
            </div>
          ) : (
            <p className={`text-xs ${colors.text} leading-relaxed`}>
              {feedback}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};