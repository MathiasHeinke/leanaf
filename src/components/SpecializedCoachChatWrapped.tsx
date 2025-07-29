import React from 'react';
import { SpecializedCoachChat } from './SpecializedCoachChat';
import { ChatLayout } from './layouts/ChatLayout';
import { CoachDropdownHeader } from './CoachDropdownHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, History, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface CoachProfile {
  id: string;
  name: string;
  age: number;
  role: string;
  avatar: string;
  icon: any;
  imageUrl?: string;
  personality: string;
  description: string;
  expertise: string[];
  color: string;
  accentColor: string;
  quickActions: Array<{
    text: string;
    prompt: string;
  }>;
}

interface SpecializedCoachChatWrappedProps {
  coach: CoachProfile;
  onBack: () => void;
  todaysTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  dailyGoals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  } | null;
  averages: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  historyData: any[];
  trendData: any;
  weightHistory: any[];
  sleepData?: any[];
  bodyMeasurements?: any[];
  workoutData?: any[];
  profileData?: any;
  progressPhotos?: string[];
}

export const SpecializedCoachChatWrapped: React.FC<SpecializedCoachChatWrappedProps> = (props) => {
  const { coach, onBack } = props;
  
  const getCoachColors = (color: string) => {
    switch (color) {
      case 'blue':
        return 'from-blue-500 to-blue-600';
      case 'purple':
        return 'from-purple-500 to-purple-600';
      case 'green':
        return 'from-green-500 to-green-600';
      case 'orange':
        return 'from-orange-500 to-orange-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const handleClearHistory = () => {
    // TODO: Implement clear history functionality
    console.log('Clear history for coach:', coach.name);
  };

  const handleViewHistory = () => {
    // TODO: Implement view history functionality
    console.log('View history for coach:', coach.name);
  };

  return (
    <ChatLayout 
      header={
        <CoachDropdownHeader
          name={coach.name}
          image={coach.imageUrl || '/placeholder.svg'}
          onClearHistory={handleClearHistory}
          onViewHistory={handleViewHistory}
        />
      }
    >
      <SpecializedCoachChat {...props} />
    </ChatLayout>
  );
};