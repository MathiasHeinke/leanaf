import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ProactiveTooltipProps {
  message: string;
  onDismiss: () => void;
  children: React.ReactNode;
  className?: string;
}

export const ProactiveTooltip = ({ message, onDismiss, children, className }: ProactiveTooltipProps) => {
  return (
    <TooltipProvider>
      <Tooltip open={true}>
        <TooltipTrigger asChild>
          <div className={cn("relative", className)}>
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-xs p-3 bg-primary text-primary-foreground border-primary shadow-lg animate-in fade-in-0 slide-in-from-bottom-2"
          sideOffset={8}
        >
          <div className="flex items-start gap-2">
            <p className="text-sm font-medium flex-1">{message}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-5 w-5 p-0 hover:bg-primary-foreground/20 text-primary-foreground"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-primary"></div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};