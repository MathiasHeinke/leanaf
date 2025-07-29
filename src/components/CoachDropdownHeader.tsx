import React from 'react';
import { ArrowLeft, History, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';

interface CoachDropdownHeaderProps {
  coachName: string;
  coachAvatar?: string;
  coachSpecialty?: string;
  onHistory?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
}

export const CoachDropdownHeader: React.FC<CoachDropdownHeaderProps> = ({
  coachName,
  coachAvatar,
  coachSpecialty,
  onHistory,
  onDelete,
  onBack
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/coach');
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-background/95 backdrop-blur-sm border-b border-border/30 animate-slide-in-down">
      {/* Left: Back Button + Coach Info */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="h-8 w-8 p-0 hover:bg-accent/60"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 border border-border/50">
            <AvatarImage src={coachAvatar} alt={coachName} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {coachName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">{coachName}</span>
            {coachSpecialty && (
              <span className="text-xs text-muted-foreground">{coachSpecialty}</span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-2">
        {onHistory && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onHistory}
            className="h-8 w-8 p-0 hover:bg-accent/60"
            title="Chat-Verlauf"
          >
            <History className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
        
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
            title="Gespräch löschen"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};