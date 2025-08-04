import React, { useState } from 'react';
import { ChevronDown, ArrowLeft, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNavigate } from 'react-router-dom';
import { DailyResetDialog } from './DailyResetDialog';
import { toast } from 'sonner';

interface CollapsibleCoachHeaderProps {
  coach: {
    name: string;
    imageUrl?: string;
    specialization?: string;
  };
  onHistoryClick?: () => void;
  onDeleteChat?: () => void;
  onCollapseChange?: (collapsed: boolean) => void;
  onDailyReset?: () => void;
}

export const CollapsibleCoachHeader = ({ 
  coach, 
  onHistoryClick, 
  onDeleteChat,
  onCollapseChange,
  onDailyReset 
}: CollapsibleCoachHeaderProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDailyResetDialog, setShowDailyResetDialog] = useState(false);
  const [isDeletingToday, setIsDeletingToday] = useState(false);
  const navigate = useNavigate();

  // Get actual chat history from recent days
  const getChatHistory = () => {
    // Mock chat history data - in real app, fetch from database via Supabase
    return [
      {
        id: "1",
        date: "Heute",
        preview: "Trainingsplan für diese Woche besprochen",
        timestamp: new Date()
      },
      {
        id: "2", 
        date: "Gestern",
        preview: "Ernährungsberatung und Kalorienbedarf",
        timestamp: new Date(Date.now() - 86400000)
      },
      {
        id: "3",
        date: "Vorgestern", 
        preview: "Motivation und Zielsetzung diskutiert",
        timestamp: new Date(Date.now() - 172800000)
      }
    ];
  };

  const handleDailyReset = async () => {
    setIsDeletingToday(true);
    try {
      // Simulate deletion delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success('Heutiger Chat wurde gelöscht');
      onDailyReset?.();
      setShowDailyResetDialog(false);
    } catch (error) {
      console.error('Error deleting today\'s chat:', error);
      toast.error('Fehler beim Löschen des Chats');
    } finally {
      setIsDeletingToday(false);
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
          {/* Chat History Dropdown */}
          <Popover open={showHistory} onOpenChange={setShowHistory}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 h-10 w-10 hover-scale"
                aria-label="Chat-Verlauf"
              >
                <Clock className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2" align="end">
              <div className="space-y-1">
                <div className="text-sm font-medium px-2 py-1 text-muted-foreground">
                  Chat-Verlauf
                </div>
                {getChatHistory().map((chat) => (
                  <Button
                    key={chat.id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left p-2 h-auto whitespace-normal"
                    onClick={() => {
                      // Handle chat history click - would load conversation
                      setShowHistory(false);
                      console.log("Loading chat:", chat.id);
                    }}
                  >
                    <div>
                      <div className="font-medium text-sm">{chat.date}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {chat.preview}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Daily Reset Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDailyResetDialog(true)}
            className="p-2 h-10 w-10 text-destructive hover:text-destructive hover-scale"
            aria-label="Heute löschen"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
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

      {/* Daily Reset Confirmation Dialog */}
      <DailyResetDialog
        open={showDailyResetDialog}
        onOpenChange={setShowDailyResetDialog}
        onConfirm={handleDailyReset}
        isLoading={isDeletingToday}
      />
    </>
  );
};