
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
    specializations: string[];
    evidence: string;
    interventions: string[];
    philosophy: string;
    color: string;
  };
}

interface CoachCardProps {
  coach: CoachProfile;
  isSelected: boolean;
  onSelect: (coachId: string) => void;
  disabled?: boolean;
  requiresPremium?: boolean;
}

export const CoachCard: React.FC<CoachCardProps> = ({ 
  coach, 
  isSelected, 
  onSelect, 
  disabled = false, 
  requiresPremium = false 
}) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    console.error(`Image load error for coach ${coach.name}:`, coach.imageUrl);
    setImageError(true);
  };

  const handleImageLoad = () => {
    console.log(`Image loaded successfully for coach ${coach.name}:`, coach.imageUrl);
    setImageError(false);
  };

  const handleCardClick = () => {
    if (!disabled) {
      onSelect(coach.id);
    }
  };

  // Uniform color mapping for consistent card appearance
  const getCoachColors = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-800/30',
          quote: 'bg-blue-50 border-blue-500 dark:bg-blue-950/20 dark:border-blue-700',
          card: 'border-blue-200/50 dark:border-blue-800/30',
          icon: 'text-blue-600 dark:text-blue-400'
        };
      case 'green':
        return {
          badge: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-300 dark:border-green-800/30',
          quote: 'bg-green-50 border-green-500 dark:bg-green-950/20 dark:border-green-700',
          card: 'border-green-200/50 dark:border-green-800/30',
          icon: 'text-green-600 dark:text-green-400'
        };
      case 'purple':
        return {
          badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-800/30',
          quote: 'bg-purple-50 border-purple-500 dark:bg-purple-950/20 dark:border-purple-700',
          card: 'border-purple-200/50 dark:border-purple-800/30',
          icon: 'text-purple-600 dark:text-purple-400'
        };
      default:
        return {
          badge: 'bg-muted text-muted-foreground border-muted',
          quote: 'bg-muted border-muted',
          card: 'border-muted',
          icon: 'text-muted-foreground'
        };
    }
  };

  const getCoachIcon = () => {
    switch (coach.id) {
      case 'sascha':
        return Target;
      case 'lucy':
        return Heart;
      case 'kai':
        return Brain;
      default:
        return Target;
    }
  };

  const colors = getCoachColors(coach.color);
  const CoachIcon = getCoachIcon();

  return (
    <Card 
      className={`relative transition-all duration-300 ${
        disabled 
          ? 'opacity-50 cursor-not-allowed grayscale' 
          : 'cursor-pointer hover:scale-105 hover:shadow-lg'
      } ${colors.card} ${
        isSelected 
          ? 'ring-2 ring-green-500 shadow-lg dark:ring-green-400' 
          : !disabled ? 'hover:shadow-md' : ''
      }`}
      onClick={handleCardClick}
    >
      {isSelected && !disabled && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 dark:bg-green-400 rounded-full flex items-center justify-center z-10">
          <Check className="h-4 w-4 text-white dark:text-green-900" />
        </div>
      )}

      {requiresPremium && disabled && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg">
            👑 Pro
          </Badge>
        </div>
      )}

      {disabled && (
        <div className="absolute inset-0 bg-black/10 dark:bg-white/10 rounded-lg flex items-center justify-center z-20">
          <div className="bg-black/80 dark:bg-white/80 text-white dark:text-black px-3 py-2 rounded-lg text-sm font-medium">
            {requiresPremium ? 'Pro Feature' : 'Nicht verfügbar'}
          </div>
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
          {coach.coachInfo && !disabled && (
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

        {/* Premium Upgrade Hint */}
        {requiresPremium && disabled && (
          <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800/30">
            <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">
              👑 Upgrade zu Pro für Zugang zu allen Experten-Coaches
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
