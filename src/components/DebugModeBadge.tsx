import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wrench } from 'lucide-react';

interface DebugModeBadgeProps {
  visible: boolean;
}

export const DebugModeBadge: React.FC<DebugModeBadgeProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <Badge 
      variant="outline" 
      className="fixed top-20 right-4 z-50 bg-orange-500/20 border-orange-500/40 text-orange-700 dark:text-orange-300 backdrop-blur-sm animate-pulse"
    >
      <Wrench className="w-3 h-3 mr-1" />
      Debug Mode
    </Badge>
  );
};