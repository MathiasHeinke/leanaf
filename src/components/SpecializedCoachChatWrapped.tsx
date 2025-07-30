import React from 'react';
import { SpecializedCoachChat } from './SpecializedCoachChat';
import { ChatLayout } from './layouts/ChatLayout';
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

  // Coach Banner Component
  const CoachBanner = () => (
    <div className="flex items-center justify-between bg-card/80 backdrop-blur-sm rounded-lg p-3">
      <div className="flex items-center space-x-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center space-x-3">
          {coach.imageUrl ? (
            <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg flex-shrink-0">
              <img 
                src={coach.imageUrl} 
                alt={coach.name}
                className="w-full h-full object-cover aspect-square"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getCoachColors(coach.color)} flex items-center justify-center text-white text-lg font-bold shadow-lg hidden flex-shrink-0`}>
                {coach.avatar}
              </div>
            </div>
          ) : (
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getCoachColors(coach.color)} flex items-center justify-center text-white text-lg font-bold shadow-lg flex-shrink-0`}>
              {coach.avatar}
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold">{coach.name}</h2>
            <Badge variant="outline" className="text-xs">
              {coach.role}
            </Badge>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm">
          <History className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <ChatLayout coachBanner={<CoachBanner />}>
      <SpecializedCoachChat {...props} />
    </ChatLayout>
  );
};