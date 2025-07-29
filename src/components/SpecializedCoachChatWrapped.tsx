import React, { useState } from 'react';
import { SpecializedCoachChat } from './SpecializedCoachChat';
import { ChatLayout } from './layouts/ChatLayout';
import { CoachHeader } from './CoachHeader';
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
  const [showHistory, setShowHistory] = useState(false);
  
  const handleDelete = () => {
    // TODO: Add confirmation dialog and delete logic
    console.log('Delete conversation');
  };

  return (
    <ChatLayout 
      coachBanner={
        <CoachHeader
          name={coach.name}
          avatarUrl={coach.imageUrl}
          tag={coach.expertise[0]}
          onBack={onBack}
          onHistory={() => setShowHistory(true)}
          onDelete={handleDelete}
        />
      }
    >
      <SpecializedCoachChat {...props} />
    </ChatLayout>
  );
};