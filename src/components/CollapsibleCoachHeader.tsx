import React, { useState } from 'react';
import { ChevronDown, ArrowLeft, History, Trash2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNavigate } from 'react-router-dom';

interface CollapsibleCoachHeaderProps {
  coach: {
    name: string;
    imageUrl?: string;
    specialization?: string;
  };
  onHistoryClick?: () => void;
  onDeleteChat?: () => void;
  onCollapseChange?: (collapsed: boolean) => void;
}

export const CollapsibleCoachHeader = ({ 
  coach, 
  onHistoryClick, 
  onDeleteChat,
  onCollapseChange 
}: CollapsibleCoachHeaderProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();

  // Coach-specific suggestions based on specialization
  const getCoachSuggestions = () => {
    const coachName = coach.name?.toLowerCase();
    
    if (coachName?.includes('markus') || coach.specialization?.includes('Kraft')) {
      return [
        "Wie kann ich meine Bankdrück-Leistung verbessern?",
        "Welche Supplements empfiehlst du für Muskelaufbau?",
        "Zeig mir einen Trainingsplan für mehr Kraft",
        "Wie tracke ich meine Fortschritte richtig?"
      ];
    } else if (coachName?.includes('lucy') || coach.specialization?.includes('Ganzheitlich')) {
      return [
        "Wie erstelle ich einen gesunden Ernährungsplan?",
        "Was sind die besten Übungen für Anfänger?",
        "Wie motiviere ich mich langfristig?",
        "Welche Entspannungstechniken empfiehlst du?"
      ];
    } else {
      return [
        "Wie kann ich meine Ziele erreichen?",
        "Was empfiehlst du für heute?",
        "Zeig mir meinen Fortschritt",
        "Welche Tipps hast du für mich?"
      ];
    }
  };

  const handleBack = () => {
    navigate('/coach');
  };

  const toggleCollapse = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    onCollapseChange?.(newCollapsed);
  };

  return (
    <>
      {/* Coach Banner mit Glass-Effekt */}
      <header 
        id="coachBanner"
        className={`
          fixed left-0 right-0 h-16 px-4 
          flex items-center gap-3 
          backdrop-blur-md bg-background/70 border-b border-border/20
          shadow-md
          transition-transform duration-300 ease-out z-40
          ${collapsed ? '-translate-y-full' : 'translate-y-0'}
        `}
        style={{ 
          top: 'var(--global-header-height)',
          willChange: 'transform'
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
        </div>
        
        <div className="flex items-center gap-2">
          {/* Suggestions Dropdown */}
          <Popover open={showSuggestions} onOpenChange={setShowSuggestions}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 h-10 w-10 hover-scale"
                aria-label="Vorschläge"
              >
                <MessageSquare className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2" align="end">
              <div className="space-y-1">
                <div className="text-sm font-medium px-2 py-1 text-muted-foreground">
                  Vorschläge für {coach.name}
                </div>
                {getCoachSuggestions().map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left p-2 h-auto whitespace-normal"
                    onClick={() => {
                      // Here you would trigger sending the suggestion
                      setShowSuggestions(false);
                      // onSendSuggestion?.(suggestion);
                    }}
                  >
                    "{suggestion}"
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

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
            absolute left-1/2 -translate-x-1/2 -bottom-3
            w-6 h-6 rounded-full
            backdrop-blur-md bg-background/70 border border-border/20
            shadow-lg
            flex items-center justify-center
            transition-all duration-300 ease-out
            hover-scale z-[9999]
          `}
          aria-label={collapsed ? 'Coach-Banner ausklappen' : 'Coach-Banner einklappen'}
        >
          <ChevronDown size={14} className={`text-foreground transition-transform duration-300 ${collapsed ? 'rotate-0' : 'rotate-180'}`} />
        </button>
      </header>
    </>
  );
};