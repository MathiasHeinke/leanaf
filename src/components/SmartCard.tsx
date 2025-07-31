import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SmartCardProps {
  tool: 'supplement' | 'plan' | 'meal' | 'exercise' | 'mindset';
  icon: string;
  title: string;
  children: React.ReactNode;
  actions?: Array<{
    label: string;
    variant: 'confirm' | 'reject';
    onClick: () => void;
  }>;
  defaultCollapsed?: boolean;
  onDoubleClick?: () => void;
}

export const SmartCard = ({ 
  tool, 
  icon, 
  title, 
  children, 
  actions,
  defaultCollapsed = false,
  onDoubleClick 
}: SmartCardProps) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const toolBorderColors = {
    supplement: 'border-teal-400',
    plan: 'border-blue-500', 
    meal: 'border-amber-400',
    exercise: 'border-green-500',
    mindset: 'border-purple-500'
  };

  return (
    <div 
      className={`smartcard w-full rounded-xl border backdrop-blur shadow-md overflow-hidden ${toolBorderColors[tool]} ${collapsed ? 'collapsed' : ''}`}
      data-tool={tool}
      onDoubleClick={onDoubleClick}
    >
      {/* Header Row */}
      <div className="sc-header flex items-center gap-2 px-3 py-2 bg-white/30 dark:bg-black/30 backdrop-blur-sm">
        <span className="sc-icon text-lg">{icon}</span>
        <span className="sc-title font-medium flex-1">{title}</span>
        <button 
          className="sc-toggle p-1 rounded-full hover:bg-white/20 dark:hover:bg-black/20 transition-colors"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Body (scroll-container, max-height 220px) */}
      {!collapsed && (
        <div className="sc-body px-3 py-2 max-h-[220px] overflow-y-auto text-sm">
          {children}
        </div>
      )}

      {/* Action Row (optional) */}
      {!collapsed && actions && actions.length > 0 && (
        <div className="sc-actions flex justify-end gap-2 px-3 py-2 bg-white/20 dark:bg-black/20">
          {actions.map((action, index) => (
            <Button
              key={index}
              size="sm"
              variant={action.variant === 'confirm' ? 'default' : 'destructive'}
              onClick={action.onClick}
              className="text-xs px-3 py-1"
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};