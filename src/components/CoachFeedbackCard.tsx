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
  type: 'sleep' | 'workout' | 'weight' | 'measurement';
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
          case 'measurement':
            functionName = 'coach-weight-analysis';
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
      case 'measurement':
        return "Körpermaße zeigen oft Fortschritte, die die Waage nicht anzeigt! 📏";
      default:
        return "Weiter so!";
    }
  };

  const getThemeColors = (type: string) => {
    switch (type) {
      case 'sleep':
        return {
          bg: 'bg-indigo-100/50 dark:bg-indigo-900/30',
          border: 'border-indigo-200 dark:border-indigo-700',
          text: 'text-indigo-700 dark:text-indigo-300',
          nameText: 'text-indigo-800 dark:text-indigo-200'
        };
      case 'workout':
        return {
          bg: 'bg-cyan-100/50 dark:bg-cyan-900/30',
          border: 'border-cyan-200 dark:border-cyan-700',
          text: 'text-cyan-700 dark:text-cyan-300',
          nameText: 'text-cyan-800 dark:text-cyan-200'
        };
      case 'weight':
        return {
          bg: 'bg-blue-100/50 dark:bg-blue-900/30',
          border: 'border-blue-200 dark:border-blue-700',
          text: 'text-blue-700 dark:text-blue-300',
          nameText: 'text-blue-800 dark:text-blue-200'
        };
      case 'measurement':
        return {
          bg: 'bg-sky-100/50 dark:bg-sky-900/30',
          border: 'border-sky-200 dark:border-sky-700',
          text: 'text-sky-700 dark:text-sky-300',
          nameText: 'text-sky-800 dark:text-sky-200'
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