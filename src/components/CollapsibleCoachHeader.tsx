import React, { useState } from 'react';
import { ChevronUp, ArrowLeft, History, Trash2 } from 'lucide-react';
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
  onOpenChange?: (open: boolean) => void;
}

export const CollapsibleCoachHeader = ({ 
  coach, 
  onHistoryClick, 
  onDeleteChat,
  onOpenChange 
}: CollapsibleCoachHeaderProps) => {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/coach');
  };

  const handleToggle = () => {
    const newOpen = !open;
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  return (
    <header 
      className={`fixed top-14 left-0 right-0 z-40 coach-banner ${open ? '' : 'closed'} flex items-center gap-3 px-4`}
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

        {/* Chevron-Kerbe */}
        <button
          onClick={handleToggle}
          aria-label={open ? 'Ausblenden' : 'Einblenden'}
          className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-[9px] 
                     w-8 h-8 flex items-center justify-center
                     rounded-full bg-background/80 backdrop-blur
                     border border-border/20 shadow transition-transform hover:scale-105"
        >
          <ChevronUp className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
    </header>
  );
};