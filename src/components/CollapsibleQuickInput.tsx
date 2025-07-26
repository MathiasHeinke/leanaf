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
  theme?: 'blue' | 'indigo' | 'cyan' | 'sky' | 'teal';
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
  indigo: {
    header: "bg-gradient-to-r from-indigo-500/10 to-indigo-600/10 backdrop-blur-sm border border-indigo-200/20 hover:from-indigo-500/15 hover:to-indigo-600/15 dark:from-indigo-400/10 dark:to-indigo-500/10 dark:border-indigo-700/20 dark:hover:from-indigo-400/15 dark:hover:to-indigo-500/15",
    headerCompleted: "bg-gradient-to-r from-indigo-600/15 to-indigo-700/15 backdrop-blur-sm border border-indigo-300/25 dark:from-indigo-500/15 dark:to-indigo-600/15 dark:border-indigo-600/25",
    icon: "bg-indigo-500 dark:bg-indigo-600",
    iconCompleted: "bg-indigo-600 dark:bg-indigo-500",
    completedText: "text-indigo-700 dark:text-indigo-300",
    completedDot: "bg-indigo-500 dark:bg-indigo-400"
  },
  cyan: {
    header: "bg-gradient-to-r from-cyan-500/10 to-cyan-600/10 backdrop-blur-sm border border-cyan-200/20 hover:from-cyan-500/15 hover:to-cyan-600/15 dark:from-cyan-400/10 dark:to-cyan-500/10 dark:border-cyan-700/20 dark:hover:from-cyan-400/15 dark:hover:to-cyan-500/15",
    headerCompleted: "bg-gradient-to-r from-cyan-600/15 to-cyan-700/15 backdrop-blur-sm border border-cyan-300/25 dark:from-cyan-500/15 dark:to-cyan-600/15 dark:border-cyan-600/25",
    icon: "bg-cyan-500 dark:bg-cyan-600",
    iconCompleted: "bg-cyan-600 dark:bg-cyan-500",
    completedText: "text-cyan-700 dark:text-cyan-300",
    completedDot: "bg-cyan-500 dark:bg-cyan-400"
  },
  sky: {
    header: "bg-gradient-to-r from-sky-500/10 to-sky-600/10 backdrop-blur-sm border border-sky-200/20 hover:from-sky-500/15 hover:to-sky-600/15 dark:from-sky-400/10 dark:to-sky-500/10 dark:border-sky-700/20 dark:hover:from-sky-400/15 dark:hover:to-sky-500/15",
    headerCompleted: "bg-gradient-to-r from-sky-600/15 to-sky-700/15 backdrop-blur-sm border border-sky-300/25 dark:from-sky-500/15 dark:to-sky-600/15 dark:border-sky-600/25",
    icon: "bg-sky-500 dark:bg-sky-600",
    iconCompleted: "bg-sky-600 dark:bg-sky-500",
    completedText: "text-sky-700 dark:text-sky-300",
    completedDot: "bg-sky-500 dark:bg-sky-400"
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