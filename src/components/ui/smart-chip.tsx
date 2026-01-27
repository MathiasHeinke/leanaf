import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const smartChipVariants = cva(
  [
    // Base styles - unified design
    "inline-flex items-center justify-center",
    "rounded-full border transition-all duration-200",
    "text-xs font-medium cursor-pointer",
    "hover:scale-105 active:scale-95",
    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
    "select-none whitespace-nowrap"
  ],
  {
    variants: {
      size: {
        sm: "h-6 px-2 py-0.5 text-xs gap-1",
        default: "h-7 px-3 py-1 text-xs gap-1.5",
        lg: "h-8 px-4 py-1.5 text-sm gap-2"
      },
      variant: {
        default: [
          "bg-secondary/50 hover:bg-secondary text-secondary-foreground",
          "border-border hover:border-border/80"
        ],
        primary: [
          "bg-primary/10 hover:bg-primary/20 text-primary",
          "border-primary/30 hover:border-primary/50"
        ],
        secondary: [
          "bg-muted/50 hover:bg-muted text-muted-foreground",
          "border-muted-foreground/20 hover:border-muted-foreground/40"
        ],
        accent: [
          "bg-accent/50 hover:bg-accent text-accent-foreground",
          "border-accent-foreground/20 hover:border-accent-foreground/40"
        ],
        timing: [
          "bg-violet-100 hover:bg-violet-200 text-violet-700",
          "border-violet-300 hover:border-violet-400",
          "dark:bg-violet-900/50 dark:hover:bg-violet-900/70",
          "dark:text-violet-300 dark:border-violet-700 dark:hover:border-violet-600"
        ],
        fluid: [
          "bg-blue-100 hover:bg-blue-200 text-blue-700",
          "border-blue-300 hover:border-blue-400",
          "dark:bg-blue-900/50 dark:hover:bg-blue-900/70",
          "dark:text-blue-300 dark:border-blue-700 dark:hover:border-blue-600"
        ],
        mindset: [
          "bg-violet-100 hover:bg-violet-200 text-violet-700",
          "border-violet-300 hover:border-violet-400",
          "dark:bg-violet-900/50 dark:hover:bg-violet-900/70",
          "dark:text-violet-300 dark:border-violet-700 dark:hover:border-violet-600"
        ],
        success: [
          "bg-green-100 hover:bg-green-200 text-green-700",
          "border-green-300 hover:border-green-400",
          "dark:bg-green-900/50 dark:hover:bg-green-900/70",
          "dark:text-green-300 dark:border-green-700 dark:hover:border-green-600"
        ],
        warning: [
          "bg-yellow-100 hover:bg-yellow-200 text-yellow-700",
          "border-yellow-300 hover:border-yellow-400",
          "dark:bg-yellow-900/50 dark:hover:bg-yellow-900/70",
          "dark:text-yellow-300 dark:border-yellow-700 dark:hover:border-yellow-600"
        ],
        favorite: [
          "bg-amber-100 hover:bg-amber-200 text-amber-700",
          "border-amber-300 hover:border-amber-400",
          "dark:bg-amber-900/50 dark:hover:bg-amber-900/70",
          "dark:text-amber-300 dark:border-amber-700 dark:hover:border-amber-600"
        ]
      }
    },
    defaultVariants: {
      size: "default",
      variant: "default"
    }
  }
);

export interface SmartChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof smartChipVariants> {
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children: React.ReactNode;
}

export const SmartChip = React.forwardRef<HTMLButtonElement, SmartChipProps>(
  ({ 
    className, 
    size, 
    variant, 
    icon, 
    iconPosition = 'left',
    children, 
    ...props 
  }, ref) => {
    return (
      <button
        className={cn(smartChipVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {icon && iconPosition === 'left' && (
          <span className={cn(
            "shrink-0",
            size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5'
          )}>
            {icon}
          </span>
        )}
        <span className="truncate max-w-[10rem]">
          {children}
        </span>
        {icon && iconPosition === 'right' && (
          <span className={cn(
            "shrink-0",
            size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5'
          )}>
            {icon}
          </span>
        )}
      </button>
    );
  }
);

SmartChip.displayName = "SmartChip";

export { smartChipVariants };