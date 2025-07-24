import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CollapsibleQuickInputProps {
  title: string;
  icon: React.ReactNode;
  isCompleted?: boolean;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export const CollapsibleQuickInput = ({
  title,
  icon,
  isCompleted = false,
  children,
  defaultOpen = false,
  className
}: CollapsibleQuickInputProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("border rounded-lg overflow-hidden transition-all duration-200", className)}>
      <Button
        variant="ghost"
        className={cn(
          "w-full h-auto p-4 justify-between hover:bg-muted/50 transition-colors",
          isCompleted && "bg-green-50 border-green-200"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
            isCompleted ? "bg-green-500" : "bg-primary"
          )}>
            {icon}
          </div>
          <span className="font-medium text-left">{title}</span>
          {isCompleted && (
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {isCompleted && (
            <span className="text-xs text-green-600 font-medium">✓ Erledigt</span>
          )}
          {isOpen ? (
            <ChevronDown className="h-4 w-4 transition-transform" />
          ) : (
            <ChevronRight className="h-4 w-4 transition-transform" />
          )}
        </div>
      </Button>
      
      {isOpen && (
        <div className="p-4 border-t bg-background/50 animate-accordion-down">
          {children}
        </div>
      )}
    </div>
  );
};