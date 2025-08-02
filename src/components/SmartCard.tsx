import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SmartCardProps {
  tool: 'supplement' | 'plan' | 'meal' | 'exercise' | 'mindset' | 'trainingsplan' | 'gewicht' | 'uebung' | 'quickworkout' | 'foto' | 'chat';
  icon: string;
  title: string;
  children: React.ReactNode;
  actions?: Array<{
    label: string;
    variant?: 'confirm' | 'reject';
    action?: string;
    target?: string;
    onClick?: () => void;
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
  const [showOverlay, setShowOverlay] = useState(false);

  const toolBorderColors: Record<string, string> = {
    supplement: 'border-teal-400',
    plan: 'border-blue-500', 
    meal: 'border-amber-400',
    exercise: 'border-green-500',
    mindset: 'border-purple-500',
    trainingsplan: 'border-blue-600',
    gewicht: 'border-purple-600',
    uebung: 'border-green-600',
    quickworkout: 'border-emerald-500',
    foto: 'border-pink-500',
    chat: 'border-gray-400'
  };

  const handleDoubleClick = () => {
    if (onDoubleClick) {
      onDoubleClick();
    } else {
      setShowOverlay(true);
    }
  };

  return (
    <>
      <div 
        className={`smartcard w-full rounded-xl border backdrop-blur shadow-md overflow-hidden ${toolBorderColors[tool] || 'border-gray-400'} ${collapsed ? 'collapsed' : ''}`}
        data-tool={tool}
        onDoubleClick={handleDoubleClick}
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

      {/* Overlay */}
      {showOverlay && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setShowOverlay(false)}>
          <div 
            className="fixed inset-4 md:inset-8 bg-background rounded-xl border shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white/30 dark:bg-black/30 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="text-xl">{icon}</span>
                <h2 className="font-semibold">{title}</h2>
              </div>
              <button
                onClick={() => setShowOverlay(false)}
                className="p-2 rounded-full hover:bg-white/20 dark:hover:bg-black/20 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-4 h-[calc(100%-64px)] overflow-y-auto">
              {children}
              
              {/* Actions in overlay */}
              {actions && actions.length > 0 && (
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                  {actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        action.onClick();
                        setShowOverlay(false);
                      }}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        action.variant === 'confirm' 
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};