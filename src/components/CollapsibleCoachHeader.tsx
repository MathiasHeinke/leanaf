import React, { useState } from 'react';
import { ChevronDown, ArrowLeft, History, Trash2 } from 'lucide-react';
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
  const [collapsed, setCollapsed] = useState(false); // Default open
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/coach');
  };

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  return (
    <>
      {/* Coach Banner mit Glass-Effekt */}
      <header 
        id="coachBanner"
        className={`
          fixed left-0 right-0 h-16 px-4 
          flex items-center gap-3 
          glass-bg
          shadow-md rounded-b-xl border-b border-border/30
          transition-transform duration-300 ease-out z-30
          ${collapsed ? '-translate-y-[calc(64px+4px)]' : 'translate-y-0'}
        `}
        style={{ 
          top: 'var(--header-height, 60px)',
          '--coach-h': '64px'
        } as React.CSSProperties}
      >
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleBack}
          className="p-2 h-10 w-10 hover-scale"
          aria-label="Zurück"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        {coach.imageUrl && (
          <img 
            src={coach.imageUrl} 
            alt={coach.name}
            className="w-8 h-8 rounded-full object-cover shadow-sm"
          />
        )}
        
        <div className="coach-info flex-1 min-w-0">
          <h2 className="font-semibold text-base truncate">
            {coach.name}
          </h2>
          {coach.specialization && (
            <p className="text-sm text-muted-foreground truncate">
              {coach.specialization}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {onHistoryClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onHistoryClick}
              className="p-2 h-10 w-10 hover-scale"
              aria-label="Chat-Verlauf"
            >
              <History className="w-5 h-5" />
            </Button>
          )}
          
          {onDeleteChat && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeleteChat}
              className="p-2 h-10 w-10 text-destructive hover:text-destructive hover-scale"
              aria-label="Chat löschen"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Pfeil-Button klebt unten am Banner und wandert mit */}
        <button
          onClick={toggleCollapse}
          className={`
            absolute left-1/2 -translate-x-1/2 -bottom-4
            w-8 h-8 rounded-full
            glass-bg shadow-lg border border-border/20
            flex items-center justify-center
            transition-transform duration-300 ease-out
            hover-scale z-50
            ${collapsed ? 'rotate-180' : 'rotate-0'}
          `}
          aria-label={collapsed ? 'Coach-Banner ausklappen' : 'Coach-Banner einklappen'}
        >
          <ChevronDown size={18} className="text-foreground" />
        </button>
      </header>

      {/* Spacer für Content-Offset */}
      <div 
        className={`
          transition-all duration-300 ease-out
          ${collapsed ? 'h-0' : 'h-16'}
        `}
        style={{ marginTop: 'var(--header-height, 60px)' }}
      />
      
      {/* Pointer-Events sperren wenn collapsed */}
      {collapsed && (
        <style>{`
          .coach-body { pointer-events: none; }
        `}</style>
      )}
    </>
  );
};