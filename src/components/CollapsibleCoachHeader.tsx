import React, { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, History, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface CollapsibleCoachHeaderProps {
  coach: {
    name: string;
    imageUrl?: string;
    specialization?: string;
  };
  onHistoryClick?: () => void;
  onDeleteChat?: () => void;
}

export const CollapsibleCoachHeader = ({ 
  coach, 
  onHistoryClick, 
  onDeleteChat 
}: CollapsibleCoachHeaderProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/coach');
  };

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  return (
    <>
      {/* Coach Bar */}
      <div 
        id="coachBar"
        className={`fixed left-0 right-0 h-12 px-3 flex items-center gap-2 transition-all duration-300 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-sm border-b border-border/50 ${
          collapsed 
            ? 'opacity-0 pointer-events-none -translate-y-full' 
            : 'opacity-100 translate-y-0'
        }`}
        style={{ top: 'var(--header-height, 60px)' }}
      >
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleBack}
          className="p-1 h-8 w-8"
          aria-label="Zurück"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        
        {coach.imageUrl && (
          <img 
            src={coach.imageUrl} 
            alt={coach.name}
            className="w-6 h-6 rounded-full object-cover"
          />
        )}
        
        <span className="coach-name font-medium text-sm flex-1 truncate">
          {coach.name}
          {coach.specialization && (
            <span className="text-xs text-muted-foreground block">
              {coach.specialization}
            </span>
          )}
        </span>
        
        <div className="flex items-center gap-1">
          {onHistoryClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onHistoryClick}
              className="p-1 h-8 w-8"
              aria-label="Verlauf"
            >
              <History className="w-4 h-4" />
            </Button>
          )}
          
          {onDeleteChat && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeleteChat}
              className="p-1 h-8 w-8 text-destructive hover:text-destructive"
              aria-label="Chat löschen"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Toggle Arrow - positioned at bottom edge of coach banner */}
      <button
        id="coachToggle"
        onClick={toggleCollapse}
        className={`fixed left-1/2 -translate-x-1/2 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-sm p-1 rounded-full shadow-sm transition-all duration-300 border border-border/50 ${
          collapsed 
            ? 'rotate-180' 
            : ''
        }`}
        style={{ 
          top: collapsed 
            ? 'var(--header-height, 60px)' 
            : 'calc(var(--header-height, 60px) + 48px)'
        }}
        aria-label={collapsed ? 'Coach-Banner ausklappen' : 'Coach-Banner einklappen'}
      >
        {collapsed ? (
          <ArrowDown className="w-4 h-4" />
        ) : (
          <ArrowUp className="w-4 h-4" />
        )}
      </button>

      {/* Spacer to prevent content overlap */}
      <div 
        className={`transition-all duration-300 ${
          collapsed ? 'h-0' : 'h-12'
        }`}
        style={{ marginTop: 'var(--header-height, 60px)' }}
      />
    </>
  );
};