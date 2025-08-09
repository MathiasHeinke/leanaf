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
  className
}) => {
  return (
    <Card className={cn(
      "bg-white dark:bg-neutral-950 border border-border/40 rounded-2xl shadow-sm p-6 animate-fade-in",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            {status && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                {statusIcon}
                <span>{status}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
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

      {/* Body */}
      {children && (
        <div className="space-y-3">
          {children}
        </div>
      )}
    </Card>
  );
};