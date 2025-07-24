
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Target, Heart, Brain } from 'lucide-react';
import { CoachInfoButton } from './CoachInfoButton';

interface CoachProfile {
  id: string;
  name: string;
  age: number;
  role: string;
  avatar: string;
  imageUrl?: string;
  personality: string;
  description: string;
  strengths: string[];
  quote: string;
  color: string;
  accentColor: string;
  coachInfo?: {
    id: string;
    name: string;
    role: string;
    scientificFoundation: string;
    keyMethods: string[];
    ragSpecializations: string[];
    evidence: string[];
    interventions: string[];
    philosophy: string;
    color: string;
  };
}

interface CoachCardProps {
  coach: CoachProfile;
  isSelected: boolean;
  onSelect: (coachId: string) => void;
}

export const CoachCard: React.FC<CoachCardProps> = ({ coach, isSelected, onSelect }) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    console.log(`❌ Failed to load image for ${coach.name}: ${coach.imageUrl}`);
    setImageError(true);
  };

  const handleImageLoad = () => {
    console.log(`✅ Successfully loaded image for ${coach.name}: ${coach.imageUrl}`);
  };

  // Enhanced color mapping for distinctive coach personalities
  const getCoachColors = (color: string) => {
    switch (color) {
      case 'red':
        return {
          badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-800/30',
          quote: 'bg-red-50 border-red-500 dark:bg-red-950/20 dark:border-red-700',
          card: 'border-red-200/50 dark:border-red-800/30',
          icon: 'text-red-600 dark:text-red-400'
        };
      case 'pink':
        return {
          badge: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/20 dark:text-pink-300 dark:border-pink-800/30',
          quote: 'bg-pink-50 border-pink-500 dark:bg-pink-950/20 dark:border-pink-700',
          card: 'border-pink-200/50 dark:border-pink-800/30',
          icon: 'text-pink-600 dark:text-pink-400'
        };
      case 'green':
        return {
          badge: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-300 dark:border-green-800/30',
          quote: 'bg-green-50 border-green-500 dark:bg-green-950/20 dark:border-green-700',
          card: 'border-green-200/50 dark:border-green-800/30',
          icon: 'text-green-600 dark:text-green-400'
        };
      default:
        return {
          badge: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/20 dark:text-gray-300 dark:border-gray-800/30',
          quote: 'bg-gray-50 border-gray-500 dark:bg-gray-950/20 dark:border-gray-700',
          card: 'border-gray-200/50 dark:border-gray-800/30',
          icon: 'text-gray-600 dark:text-gray-400'
        };
    }
  };

  const getCoachIcon = () => {
    switch (coach.id) {
      case 'hart':
        return Target;
      case 'soft':
        return Heart;
      case 'motivierend':
        return Brain;
      default:
        return Target;
    }
  };

  const colors = getCoachColors(coach.color);
  const CoachIcon = getCoachIcon();

  return (
    <Card 
      className={`relative cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg ${colors.card} ${
        isSelected 
          ? 'ring-2 ring-green-500 shadow-lg dark:ring-green-400' 
          : 'hover:shadow-md'
      }`}
      onClick={() => onSelect(coach.id)}
    >
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 dark:bg-green-400 rounded-full flex items-center justify-center z-10">
          <Check className="h-4 w-4 text-white dark:text-green-900" />
        </div>
      )}
      
      <CardContent className="p-6 text-center">
        {/* Avatar with Coach Icon */}
        <div className="relative mb-4">
          {coach.imageUrl && !imageError ? (
            <div className="w-24 h-24 mx-auto rounded-full overflow-hidden shadow-lg relative">
              <img 
                src={coach.imageUrl} 
                alt={coach.name}
                className="w-full h-full object-cover"
                onError={handleImageError}
                onLoad={handleImageLoad}
              />
              <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br ${coach.accentColor} flex items-center justify-center shadow-lg`}>
                <CoachIcon className="h-4 w-4 text-white" />
              </div>
            </div>
          ) : (
            <div className={`w-24 h-24 mx-auto rounded-full bg-gradient-to-br ${coach.accentColor} flex items-center justify-center text-white text-2xl font-bold shadow-lg relative`}>
              {coach.avatar}
              <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center`}>
                <CoachIcon className="h-4 w-4 text-white" />
              </div>
            </div>
          )}
        </div>

        {/* Name & Role with Info Button */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <h3 className="text-xl font-bold text-foreground">{coach.name}</h3>
          {coach.coachInfo && (
            <CoachInfoButton coach={coach.coachInfo} />
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-1">{coach.age} Jahre</p>
        <p className="text-sm font-medium text-primary mb-3">{coach.role}</p>

        {/* Personality Badge */}
        <Badge variant="secondary" className={`mb-3 ${colors.badge}`}>
          {coach.personality}
        </Badge>

        {/* Description */}
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          {coach.description}
        </p>

        {/* Strengths */}
        <div className="mb-4">
          <p className="text-xs font-medium mb-2 text-foreground">Stärken:</p>
          <div className="flex flex-wrap gap-1 justify-center">
            {coach.strengths.map((strength, index) => (
              <Badge key={index} variant="outline" className="text-xs py-0 px-2">
                {strength}
              </Badge>
            ))}
          </div>
        </div>

        {/* Quote */}
        <div className={`${colors.quote} rounded-lg p-3 border-l-4 transition-colors`}>
          <p className="text-xs italic text-muted-foreground">
            "{coach.quote}"
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
