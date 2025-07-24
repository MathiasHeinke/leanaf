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
  theme?: 'blue' | 'purple' | 'green' | 'orange' | 'teal';
}

const themeStyles = {
  blue: {
    header: "bg-blue-50 border-blue-200 hover:bg-blue-100/50 dark:bg-blue-950/50 dark:border-blue-800 dark:hover:bg-blue-900/50",
    headerCompleted: "bg-blue-100 border-blue-300 dark:bg-blue-900/70 dark:border-blue-700",
    icon: "bg-blue-500 dark:bg-blue-600",
    iconCompleted: "bg-blue-600 dark:bg-blue-500",
    completedText: "text-blue-700 dark:text-blue-300",
    completedDot: "bg-blue-500 dark:bg-blue-400"
  },
  purple: {
    header: "bg-purple-50 border-purple-200 hover:bg-purple-100/50 dark:bg-purple-950/50 dark:border-purple-800 dark:hover:bg-purple-900/50",
    headerCompleted: "bg-purple-100 border-purple-300 dark:bg-purple-900/70 dark:border-purple-700",
    icon: "bg-purple-500 dark:bg-purple-600",
    iconCompleted: "bg-purple-600 dark:bg-purple-500",
    completedText: "text-purple-700 dark:text-purple-300",
    completedDot: "bg-purple-500 dark:bg-purple-400"
  },
  green: {
    header: "bg-green-50 border-green-200 hover:bg-green-100/50 dark:bg-green-950/50 dark:border-green-800 dark:hover:bg-green-900/50",
    headerCompleted: "bg-green-100 border-green-300 dark:bg-green-900/70 dark:border-green-700",
    icon: "bg-green-500 dark:bg-green-600",
    iconCompleted: "bg-green-600 dark:bg-green-500",
    completedText: "text-green-700 dark:text-green-300",
    completedDot: "bg-green-500 dark:bg-green-400"
  },
  orange: {
    header: "bg-orange-50 border-orange-200 hover:bg-orange-100/50 dark:bg-orange-950/50 dark:border-orange-800 dark:hover:bg-orange-900/50",
    headerCompleted: "bg-orange-100 border-orange-300 dark:bg-orange-900/70 dark:border-orange-700",
    icon: "bg-orange-500 dark:bg-orange-600",
    iconCompleted: "bg-orange-600 dark:bg-orange-500",
    completedText: "text-orange-700 dark:text-orange-300",
    completedDot: "bg-orange-500 dark:bg-orange-400"
  },
  teal: {
    header: "bg-teal-50 border-teal-200 hover:bg-teal-100/50 dark:bg-teal-950/50 dark:border-teal-800 dark:hover:bg-teal-900/50",
    headerCompleted: "bg-teal-100 border-teal-300 dark:bg-teal-900/70 dark:border-teal-700",
    icon: "bg-teal-500 dark:bg-teal-600",
    iconCompleted: "bg-teal-600 dark:bg-teal-500",
    completedText: "text-teal-700 dark:text-teal-300",
    completedDot: "bg-teal-500 dark:bg-teal-400"
  }
};

export const CollapsibleQuickInput = ({
  title,
  icon,
  isCompleted = false,
  children,
  defaultOpen = false,
  className,
  theme = 'blue'
}: CollapsibleQuickInputProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const styles = themeStyles[theme];

  return (
    <div className={cn("border rounded-lg overflow-hidden transition-all duration-200", className)}>
      <Button
        variant="ghost"
        className={cn(
          "w-full h-auto p-4 justify-between transition-colors",
          isCompleted ? styles.headerCompleted : styles.header
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center transition-colors text-white",
            isCompleted ? styles.iconCompleted : styles.icon
          )}>
            {icon}
          </div>
          <span className="font-medium text-left">{title}</span>
          {isCompleted && (
            <div className={cn("h-2 w-2 rounded-full animate-pulse", styles.completedDot)} />
          )}
        </div>
        <div className="flex items-center gap-2">
          {isCompleted && (
            <span className={cn("text-xs font-medium", styles.completedText)}>✓ Erledigt</span>
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