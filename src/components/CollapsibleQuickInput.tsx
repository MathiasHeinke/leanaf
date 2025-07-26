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
    header: "bg-gradient-to-r from-blue-500/10 to-blue-600/10 backdrop-blur-sm border border-blue-200/20 hover:from-blue-500/15 hover:to-blue-600/15 dark:from-blue-400/10 dark:to-blue-500/10 dark:border-blue-700/20 dark:hover:from-blue-400/15 dark:hover:to-blue-500/15",
    headerCompleted: "bg-gradient-to-r from-blue-600/15 to-blue-700/15 backdrop-blur-sm border border-blue-300/25 dark:from-blue-500/15 dark:to-blue-600/15 dark:border-blue-600/25",
    icon: "bg-blue-500 dark:bg-blue-600",
    iconCompleted: "bg-blue-600 dark:bg-blue-500",
    completedText: "text-blue-700 dark:text-blue-300",
    completedDot: "bg-blue-500 dark:bg-blue-400"
  },
  purple: {
    header: "bg-gradient-to-r from-purple-500/10 to-purple-600/10 backdrop-blur-sm border border-purple-200/20 hover:from-purple-500/15 hover:to-purple-600/15 dark:from-purple-400/10 dark:to-purple-500/10 dark:border-purple-700/20 dark:hover:from-purple-400/15 dark:hover:to-purple-500/15",
    headerCompleted: "bg-gradient-to-r from-purple-600/15 to-purple-700/15 backdrop-blur-sm border border-purple-300/25 dark:from-purple-500/15 dark:to-purple-600/15 dark:border-purple-600/25",
    icon: "bg-purple-500 dark:bg-purple-600",
    iconCompleted: "bg-purple-600 dark:bg-purple-500",
    completedText: "text-purple-700 dark:text-purple-300",
    completedDot: "bg-purple-500 dark:bg-purple-400"
  },
  green: {
    header: "bg-gradient-to-r from-green-500/10 to-green-600/10 backdrop-blur-sm border border-green-200/20 hover:from-green-500/15 hover:to-green-600/15 dark:from-green-400/10 dark:to-green-500/10 dark:border-green-700/20 dark:hover:from-green-400/15 dark:hover:to-green-500/15",
    headerCompleted: "bg-gradient-to-r from-green-600/15 to-green-700/15 backdrop-blur-sm border border-green-300/25 dark:from-green-500/15 dark:to-green-600/15 dark:border-green-600/25",
    icon: "bg-green-500 dark:bg-green-600",
    iconCompleted: "bg-green-600 dark:bg-green-500",
    completedText: "text-green-700 dark:text-green-300",
    completedDot: "bg-green-500 dark:bg-green-400"
  },
  orange: {
    header: "bg-gradient-to-r from-orange-500/10 to-orange-600/10 backdrop-blur-sm border border-orange-200/20 hover:from-orange-500/15 hover:to-orange-600/15 dark:from-orange-400/10 dark:to-orange-500/10 dark:border-orange-700/20 dark:hover:from-orange-400/15 dark:hover:to-orange-500/15",
    headerCompleted: "bg-gradient-to-r from-orange-600/15 to-orange-700/15 backdrop-blur-sm border border-orange-300/25 dark:from-orange-500/15 dark:to-orange-600/15 dark:border-orange-600/25",
    icon: "bg-orange-500 dark:bg-orange-600",
    iconCompleted: "bg-orange-600 dark:bg-orange-500",
    completedText: "text-orange-700 dark:text-orange-300",
    completedDot: "bg-orange-500 dark:bg-orange-400"
  },
  teal: {
    header: "bg-gradient-to-r from-teal-500/10 to-teal-600/10 backdrop-blur-sm border border-teal-200/20 hover:from-teal-500/15 hover:to-teal-600/15 dark:from-teal-400/10 dark:to-teal-500/10 dark:border-teal-700/20 dark:hover:from-teal-400/15 dark:hover:to-teal-500/15",
    headerCompleted: "bg-gradient-to-r from-teal-600/15 to-teal-700/15 backdrop-blur-sm border border-teal-300/25 dark:from-teal-500/15 dark:to-teal-600/15 dark:border-teal-600/25",
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
          {isCompleted ? (
            <span className={cn("text-xs font-medium", styles.completedText)}>✓ Erledigt</span>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">jetzt ausfüllen</span>
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