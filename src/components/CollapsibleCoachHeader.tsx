import React, { useState } from 'react';
import { ArrowLeft, History, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';

interface CollapsibleCoachHeaderProps {
  name: string;
  imageUrl?: string;
  specialization?: string;
  onHistoryClick?: () => void;
  onDeleteChat?: () => void;
}

export const CollapsibleCoachHeader = ({ 
  name,
  imageUrl,
  specialization,
  onHistoryClick, 
  onDeleteChat 
}: CollapsibleCoachHeaderProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const navigate = useNavigate();

  console.log('CollapsibleCoachHeader rendered, isOpen state:', isOpen);

  const handleBack = () => {
    navigate('/coach');
  };

  const toggleCollapse = () => {
    console.log('Toggle collapse clicked, current isOpen state:', isOpen);
    setIsOpen(!isOpen);
  };

  const Chevron = ({ open }: { open: boolean }) => (
    <svg
      className={`w-5 h-5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
      fill="none" 
      stroke="currentColor" 
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <>
      {/* Coach banner with notch */}
      <header 
        className={`coach-banner fixed top-0 left-0 right-0 z-50 h-[56px] transition-transform duration-300 ${
          isOpen ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 h-full">
          {/* Left: Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Button>

          {/* Center: Coach info */}
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={imageUrl} alt={name} />
              <AvatarFallback>{name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h1 className="text-lg font-semibold">{name}</h1>
              <p className="text-sm text-muted-foreground">{specialization}</p>
            </div>
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-2">
            {onHistoryClick && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onHistoryClick}
                className="flex items-center gap-2"
              >
                <History className="w-4 h-4" />
                Verlauf
              </Button>
            )}
            {onDeleteChat && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDeleteChat}
                className="flex items-center gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
                Löschen
              </Button>
            )}
          </div>
        </div>

        {/* Chevron in notch */}
        <button
          onClick={toggleCollapse}
          className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-[9px] z-10
                     flex items-center justify-center w-8 h-8 rounded-full
                     bg-background/70 backdrop-blur border border-border/20 shadow"
        >
          <Chevron open={isOpen} />
        </button>
      </header>

      {/* Spacer for fixed header when open */}
      {isOpen && <div className="h-[56px]" />}
    </>
  );
};