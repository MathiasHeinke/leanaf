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
  theme?: 'blue' | 'indigo' | 'cyan' | 'sky' | 'teal' | 'violet' | 'purple' | 'emerald' | 'jade';
  completedText?: string;
}

const themeStyles = {
  blue: {
    header: "hover:bg-muted/60",
    headerCompleted: "bg-blue-50/40 dark:bg-blue-950/30 border-blue-200/50 dark:border-blue-800/50",
    icon: "bg-blue-500 dark:bg-blue-600",
    iconCompleted: "bg-blue-600 dark:bg-blue-500",
    completedText: "text-blue-700 dark:text-blue-300",
    completedDot: "bg-blue-500 dark:bg-blue-400"
  },
  indigo: {
    header: "hover:bg-muted/60",
    headerCompleted: "bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-200/50 dark:border-indigo-800/50",
    icon: "bg-indigo-500 dark:bg-indigo-600",
    iconCompleted: "bg-indigo-600 dark:bg-indigo-500",
    completedText: "text-indigo-700 dark:text-indigo-300",
    completedDot: "bg-indigo-500 dark:bg-indigo-400"
  },
  violet: {
    header: "hover:bg-muted/60",
    headerCompleted: "bg-violet-50/40 dark:bg-violet-950/30 border-violet-200/50 dark:border-violet-800/50",
    icon: "bg-violet-500 dark:bg-violet-600",
    iconCompleted: "bg-violet-600 dark:bg-violet-500",
    completedText: "text-violet-700 dark:text-violet-300",
    completedDot: "bg-violet-500 dark:bg-violet-400"
  },
  purple: {
    header: "hover:bg-muted/60",
    headerCompleted: "bg-purple-50/40 dark:bg-purple-950/30 border-purple-200/50 dark:border-purple-800/50",
    icon: "bg-purple-500 dark:bg-purple-600",
    iconCompleted: "bg-purple-600 dark:bg-purple-500",
    completedText: "text-purple-700 dark:text-purple-300",
    completedDot: "bg-purple-500 dark:bg-purple-400"
  },
  cyan: {
    header: "hover:bg-muted/60",
    headerCompleted: "bg-cyan-50/40 dark:bg-cyan-950/30 border-cyan-200/50 dark:border-cyan-800/50",
    icon: "bg-cyan-500 dark:bg-cyan-600",
    iconCompleted: "bg-cyan-600 dark:bg-cyan-500",
    completedText: "text-cyan-700 dark:text-cyan-300",
    completedDot: "bg-cyan-500 dark:bg-cyan-400"
  },
  sky: {
    header: "hover:bg-muted/60",
    headerCompleted: "bg-sky-50/40 dark:bg-sky-950/30 border-sky-200/50 dark:border-sky-800/50",
    icon: "bg-sky-500 dark:bg-sky-600",
    iconCompleted: "bg-sky-600 dark:bg-sky-500",
    completedText: "text-sky-700 dark:text-sky-300",
    completedDot: "bg-sky-500 dark:bg-sky-400"
  },
  teal: {
    header: "hover:bg-muted/60",
    headerCompleted: "bg-teal-50/40 dark:bg-teal-950/30 border-teal-200/50 dark:border-teal-800/50",
    icon: "bg-teal-500 dark:bg-teal-600",
    iconCompleted: "bg-teal-600 dark:bg-teal-500",
    completedText: "text-teal-700 dark:text-teal-300",
    completedDot: "bg-teal-500 dark:bg-teal-400"
  },
  emerald: {
    header: "hover:bg-muted/60",
    headerCompleted: "bg-emerald-50/40 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/50",
    icon: "bg-emerald-500 dark:bg-emerald-600",
    iconCompleted: "bg-emerald-600 dark:bg-emerald-500",
    completedText: "text-emerald-700 dark:text-emerald-300",
    completedDot: "bg-emerald-500 dark:bg-emerald-400"
  },
  jade: {
    header: "hover:bg-muted/60",
    headerCompleted: "bg-emerald-50/40 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/50",
    icon: "bg-green-600 dark:bg-emerald-500",
    iconCompleted: "bg-emerald-600 dark:bg-green-500",
    completedText: "text-emerald-700 dark:text-emerald-300",
    completedDot: "bg-emerald-500 dark:bg-green-400"
  }
};

export const CollapsibleQuickInput = ({
  title,
  icon,
  isCompleted = false,
  children,
  defaultOpen = false,
  className,
  theme = 'blue',
  completedText
}: CollapsibleQuickInputProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const styles = themeStyles[theme];

  return (
    <div className={cn(
      "rounded-2xl border transition-all duration-200",
      isCompleted ? cn("border-border/40", styles.headerCompleted) : "border-border/30",
      className
    )}>
      <Button
        variant="ghost"
        className={cn(
          "w-full h-auto p-4 justify-between transition-colors rounded-2xl",
          isCompleted ? "" : styles.header
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-8 w-8 rounded-xl flex items-center justify-center transition-colors text-white",
            isCompleted ? styles.iconCompleted : styles.icon
          )}>
            {icon}
          </div>
          <span className="font-medium text-left">{title}</span>
          {isCompleted && (
            <div className={cn("h-2 w-2 rounded-full", styles.completedDot)} />
          )}
        </div>
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <span className={cn("text-xs font-medium", styles.completedText)}>
              {completedText || '✓ Erledigt'}
            </span>
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
        <div className="p-4 border-t border-border/30 bg-background/30 animate-accordion-down">
          {children}
        </div>
      )}
    </div>
  );
};