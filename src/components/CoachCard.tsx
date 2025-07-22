
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

interface CoachProfile {
  id: string;
  name: string;
  age: number;
  role: string;
  avatar: string;
  personality: string;
  description: string;
  strengths: string[];
  quote: string;
  color: string;
  accentColor: string;
}

interface CoachCardProps {
  coach: CoachProfile;
  isSelected: boolean;
  onSelect: (coachId: string) => void;
}

export const CoachCard: React.FC<CoachCardProps> = ({ coach, isSelected, onSelect }) => {
  return (
    <Card 
      className={`relative cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg ${
        isSelected 
          ? `ring-2 ring-${coach.color}-500 shadow-lg` 
          : 'hover:shadow-md'
      }`}
      onClick={() => onSelect(coach.id)}
    >
      {isSelected && (
        <div className={`absolute -top-2 -right-2 w-6 h-6 bg-${coach.color}-500 rounded-full flex items-center justify-center z-10`}>
          <Check className="h-4 w-4 text-white" />
        </div>
      )}
      
      <CardContent className="p-6 text-center">
        {/* Avatar */}
        <div className="relative mb-4">
          <div className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${coach.accentColor} flex items-center justify-center text-white text-2xl font-bold shadow-lg`}>
            {coach.avatar}
          </div>
        </div>

        {/* Name & Role */}
        <h3 className="text-xl font-bold mb-1">{coach.name}</h3>
        <p className="text-sm text-muted-foreground mb-1">{coach.age} Jahre</p>
        <p className="text-sm font-medium text-primary mb-3">{coach.role}</p>

        {/* Personality Badge */}
        <Badge variant="secondary" className={`mb-3 bg-${coach.color}-50 text-${coach.color}-700 border-${coach.color}-200`}>
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
        <div className={`bg-${coach.color}-50 rounded-lg p-3 border-l-4 border-${coach.color}-500`}>
          <p className="text-xs italic text-muted-foreground">
            "{coach.quote}"
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
