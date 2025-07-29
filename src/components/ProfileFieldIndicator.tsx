import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileFieldIndicatorProps {
  isComplete: boolean;
  className?: string;
}

export const ProfileFieldIndicator = ({ isComplete, className }: ProfileFieldIndicatorProps) => {
  return (
    <div className={cn(
      "absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center text-xs z-10",
      isComplete 
        ? "bg-green-500 text-white" 
        : "bg-red-500 text-white animate-pulse",
      className
    )}>
      {isComplete ? (
        <Check className="w-2.5 h-2.5" />
      ) : (
        <span className="w-2 h-2 bg-white rounded-full" />
      )}
    </div>
  );
};