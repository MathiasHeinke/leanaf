import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ProfileCompletionStatus {
  displayName: boolean;
  weight: boolean;
  height: boolean;
  age: boolean;
  gender: boolean;
  goal: boolean;
  targetWeight: boolean;
  targetDate: boolean;
  trackingPreferences: boolean;
}

export const useProfileCompletion = () => {
  const { user } = useAuth();
  const [completionStatus, setCompletionStatus] = useState<ProfileCompletionStatus>({
    displayName: false,
    weight: false,
    height: false,
    age: false,
    gender: false,
    goal: false,
    targetWeight: false,
    targetDate: false,
    trackingPreferences: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkProfileCompletion();
    }
  }, [user]);

  const checkProfileCompletion = async () => {
    if (!user) return;

    try {
      // Check profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, weight, height, age, gender, goal, target_weight, target_date')
        .eq('user_id', user.id)
        .maybeSingle();

      // Check tracking preferences
      const { data: preferences } = await supabase
        .from('user_tracking_preferences')
        .select('*')
        .eq('user_id', user.id);

      const status: ProfileCompletionStatus = {
        displayName: !!(profile?.display_name?.trim()),
        weight: !!(profile?.weight && profile.weight > 0),
        height: !!(profile?.height && profile.height > 0),
        age: !!(profile?.age && profile.age > 0),
        gender: !!(profile?.gender?.trim()),
        goal: !!(profile?.goal?.trim() && profile.goal !== 'maintain'),
        targetWeight: !!(profile?.target_weight && profile.target_weight > 0),
        targetDate: !!(profile?.target_date),
        trackingPreferences: !!(preferences && preferences.length > 0),
      };

      setCompletionStatus(status);
    } catch (error) {
      console.error('Error checking profile completion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isProfileComplete = () => {
    return Object.values(completionStatus).every(status => status);
  };

  const getIncompleteFields = () => {
    return Object.entries(completionStatus)
      .filter(([_, completed]) => !completed)
      .map(([field, _]) => field);
  };

  const getCompletionPercentage = () => {
    const completed = Object.values(completionStatus).filter(status => status).length;
    const total = Object.keys(completionStatus).length;
    return Math.round((completed / total) * 100);
  };

  return {
    completionStatus,
    isProfileComplete: isProfileComplete(),
    incompleteFields: getIncompleteFields(),
    completionPercentage: getCompletionPercentage(),
    isLoading,
    refreshCompletion: checkProfileCompletion,
  };
};