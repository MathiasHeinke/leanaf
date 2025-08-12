import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  disabled?: boolean;
}

interface DropdownAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface QuickCardShellProps {
  title: string;
  icon: React.ReactNode;
  status?: string;
  statusIcon?: React.ReactNode;
  quickActions?: QuickAction[];
  dropdownActions?: DropdownAction[];
  detailsAction?: {
    label: string;
    onClick: () => void;
  };
  children?: React.ReactNode;
  className?: string;
  // New state system
  dataState?: 'empty' | 'partial' | 'done';
  progressPercent?: number;
  showStateDecorations?: boolean;
}

export const QuickCardShell: React.FC<QuickCardShellProps> = ({
  title,
  icon,
  status,
  statusIcon,
  quickActions = [],
  dropdownActions = [],
  detailsAction,
  children,
  className,
  dataState = 'empty',
  progressPercent = 0,
  showStateDecorations = true
}) => {
  // State-based styling
  const getStateStyles = () => {
    switch (dataState) {
      case 'done':
        return {
          cardClass: 'border-primary/40 bg-primary/5 dark:bg-primary/10 ring-1 ring-primary/30 shadow-[0_0_32px_hsl(var(--primary)/0.25)]',
          iconClass: 'bg-primary/15 text-primary',
          progressClass: 'bg-primary',
          dotClass: 'bg-primary ring-primary/30'
        };
      case 'partial':
        return {
          cardClass: 'border-accent/40 bg-accent/5 dark:bg-accent/10 ring-1 ring-accent/30 shadow-[0_0_28px_hsl(var(--accent)/0.22)]',
          iconClass: 'bg-accent/15 text-accent',
          progressClass: 'bg-accent',
          dotClass: 'bg-accent ring-accent/30'
        };
      default: // empty
        return {
          cardClass: 'border-destructive/30 bg-background ring-1 ring-destructive/20',
          iconClass: 'bg-muted text-muted-foreground',
          progressClass: 'bg-muted',
          dotClass: 'bg-destructive ring-destructive/30'
        };
    }
  };

  const stateStyles = getStateStyles();
  return (
    <Card className={cn(
      "rounded-2xl shadow-sm p-6 animate-fade-in transition-all duration-300 hover:shadow-md",
      showStateDecorations ? stateStyles.cardClass : undefined,
      className
    )}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-8 w-8 rounded-xl flex items-center justify-center transition-all duration-300",
            stateStyles.iconClass
          )}>
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              {showStateDecorations && (
                <span
                  className={cn(
                    "inline-flex h-2.5 w-2.5 rounded-full ring-2",
                    stateStyles.dotClass,
                    "animate-[pulse_3s_ease-in-out_infinite]"
                  )}
                  aria-hidden
                />
              )}
              <h3 className="font-semibold text-foreground">{title}</h3>
            </div>
            {status && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                {statusIcon}
                <span>{status}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Actions */}
          {quickActions.map((action, index) => (
            <Button
              key={index}
              size="sm"
              variant={action.variant || 'secondary'}
              onClick={action.onClick}
              disabled={action.disabled}
              className="hover-scale"
            >
              {action.label}
            </Button>
          ))}

          {/* Dropdown Menu */}
          {dropdownActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="z-50 bg-white dark:bg-neutral-950 border border-border shadow-lg"
              >
                {dropdownActions.map((action, index) => (
                  <DropdownMenuItem
                    key={index}
                    onClick={action.onClick}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    {action.icon}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Details Action */}
          {detailsAction && (
            <Button
              size="sm"
              variant="outline"
              onClick={detailsAction.onClick}
              className="hover-scale"
            >
              {detailsAction.label}
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar (if progressPercent > 0) */}
      {progressPercent > 0 && (
        <div className="mb-4">
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all duration-500", stateStyles.progressClass)}
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />
          </div>
        </div>
      )}

      {/* Body */}
      {children && (
        <div className="space-y-3">
          {children}
        </div>
      )}
    </Card>
  );
};