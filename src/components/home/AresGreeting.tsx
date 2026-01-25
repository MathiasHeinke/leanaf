/**
 * AresGreeting - Time-based personalized greeting
 * Shows date, greeting, username with gradient, and optional streak
 */

import React from 'react';
import { Flame } from 'lucide-react';

interface AresGreetingProps {
  userName?: string;
  streak?: number;
}

export const AresGreeting: React.FC<AresGreetingProps> = ({ 
  userName = 'Warrior',
  streak 
}) => {
  const now = new Date();
  const hour = now.getHours();
  
  // Time-based greeting
  const getGreeting = () => {
    if (hour < 5) return 'Gute Nacht';
    if (hour < 12) return 'Guten Morgen';
    if (hour < 17) return 'Guten Tag';
    if (hour < 21) return 'Guten Abend';
    return 'Gute Nacht';
  };

  // Format date
  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const dayName = dayNames[now.getDay()];
  const day = now.getDate();
  const month = monthNames[now.getMonth()];

  return (
    <div className="flex flex-col gap-1">
      {/* Date */}
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {dayName}, {day}. {month}
      </p>
      
      {/* Greeting */}
      <h1 className="text-2xl font-bold text-foreground leading-tight">
        {getGreeting()},{' '}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-primary-glow">
          {userName}
        </span>
      </h1>
      
      {/* Streak Badge */}
      {streak && streak >= 3 && (
        <div className="flex items-center gap-1.5 mt-1">
          <Flame className="w-4 h-4 text-destructive" />
          <span className="text-xs font-semibold text-destructive">
            {streak} Tage Streak
          </span>
        </div>
      )}
    </div>
  );
};
