import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Activity, Database, User, AlertTriangle } from 'lucide-react';

interface DebugStatusBadgeProps {
  visible: boolean;
  user?: any;
  bootstrapComplete: boolean;
  mealCount?: number;
  errorFlags?: string[];
  route?: string;
  creditsError?: boolean;
  plusDataError?: boolean;
}

export const DebugStatusBadge: React.FC<DebugStatusBadgeProps> = ({ 
  visible, 
  user, 
  bootstrapComplete, 
  mealCount = 0, 
  errorFlags = [], 
  route = '/',
  creditsError = false,
  plusDataError = false
}) => {
  if (!visible) return null;

  const hasErrors = errorFlags.length > 0 || creditsError || plusDataError;
  const variant = hasErrors ? "destructive" : bootstrapComplete ? "default" : "outline";

  return (
    <Badge 
      variant={variant}
      className="fixed top-24 right-4 z-50 bg-background/80 border border-border/40 backdrop-blur-sm animate-none max-w-xs"
    >
      <div className="flex items-center gap-1 text-xs">
        <User className="w-3 h-3" />
        <span className="truncate">{user?.id?.slice(-6) || 'none'}</span>
        
        <Database className="w-3 h-3 ml-1" />
        <span className={bootstrapComplete ? 'text-green-600' : 'text-yellow-600'}>
          {bootstrapComplete ? '✓' : '...'}
        </span>
        
        <Activity className="w-3 h-3 ml-1" />
        <span>{mealCount}m</span>
        
        {hasErrors && (
          <>
            <AlertTriangle className="w-3 h-3 ml-1 text-destructive" />
            <span className="text-destructive">{errorFlags.length + (creditsError ? 1 : 0) + (plusDataError ? 1 : 0)}</span>
          </>
        )}
        
        <span className="ml-1 opacity-60 text-xs">{route}</span>
      </div>
    </Badge>
  );
};