import React, { useState } from 'react';
import { ChevronDown, ArrowLeft, Clock, Trash2, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNavigate } from 'react-router-dom';
import { DailyResetDialog } from './DailyResetDialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentDateString } from '@/utils/dateHelpers';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useUserPersona } from '@/hooks/useUserPersona';

interface CollapsibleCoachHeaderProps {
  coach: {
    name: string;
    imageUrl?: string;
    specialization?: string;
    id?: string;
  };
  onHistoryClick?: () => void;
  onDeleteChat?: () => void;
  onCollapseChange?: (collapsed: boolean) => void;
  onDailyReset?: () => void;
}

const DIAL_LABELS: Record<string, string> = {
  dial_energy: 'Energie',
  dial_directness: 'Direktheit',
  dial_humor: 'Humor',
  dial_warmth: 'Wärme',
  dial_depth: 'Tiefe',
  dial_challenge: 'Fordernd',
  dial_opinion: 'Meinung',
};

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
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showCoachInfo, setShowCoachInfo] = useState(false);
  const navigate = useNavigate();
  const { state } = useSidebar();
  const isSidebarCollapsed = state === "collapsed";
  
  // Dynamic persona from DB
  const { persona: userPersona, loading: personaLoading } = useUserPersona();

  // Get actual chat history from Supabase
  const getChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('coach_conversations')
        .select('conversation_date, message_content, created_at')
        .eq('coach_personality', coach.name.toLowerCase())
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Group by date and take first message as preview
      const grouped = data?.reduce((acc, msg) => {
        const date = msg.conversation_date;
        if (!acc[date]) {
          acc[date] = {
            id: date,
            date: formatHistoryDate(date),
            preview: msg.message_content.slice(0, 50) + '...',
            timestamp: new Date(msg.created_at)
          };
        }
        return acc;
      }, {} as Record<string, any>);

      return Object.values(grouped || {});
    } catch (error) {
      console.error('Error fetching chat history:', error);
      return [];
    }
  };

  const formatHistoryDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Heute';
    if (date.toDateString() === yesterday.toDateString()) return 'Gestern';
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  const handleDailyReset = async () => {
    setIsDeletingToday(true);
    try {
      const today = getCurrentDateString();
      
      const { error } = await supabase
        .from('coach_conversations')
        .delete()
        .eq('conversation_date', today)
        .eq('coach_personality', coach.name.toLowerCase());

      if (error) throw error;

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
    navigate('/');
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
        className={cn(
          "fixed right-0 h-16 px-4 flex items-center gap-3 backdrop-blur-md bg-background/70 border-b border-border/20 shadow-md transition-all duration-300 ease-out z-40",
          collapsed ? '-translate-y-full' : 'translate-y-0',
          isSidebarCollapsed 
            ? "left-0 md:left-[--sidebar-width-icon]" 
            : "left-0 md:left-[--sidebar-width]"
        )}
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
          {/* Coach Info Button - Dynamic Persona */}
          <Popover open={showCoachInfo} onOpenChange={setShowCoachInfo}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 h-10 w-10 hover-scale"
                aria-label="Coach-Informationen"
              >
                <Info className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-4" align="end">
              {personaLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : userPersona ? (
                <div className="space-y-4">
                  {/* Header mit Icon */}
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{userPersona.icon || '🤖'}</span>
                    <div>
                      <h3 className="font-semibold text-lg">{userPersona.name}</h3>
                      <p className="text-sm text-muted-foreground">{userPersona.description}</p>
                    </div>
                  </div>

                  {/* Personality Dials Visualisierung */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Persönlichkeit</h4>
                    {(['dial_energy', 'dial_directness', 'dial_humor', 'dial_warmth', 'dial_depth', 'dial_challenge', 'dial_opinion'] as const).map((key) => {
                      const value = userPersona[key] ?? 5;
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-xs w-20">{DIAL_LABELS[key]}</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${value * 10}%` }}
                            />
                          </div>
                          <span className="text-xs w-4 text-muted-foreground">{value}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dialekt (wenn vorhanden) */}
                  {userPersona.dialect && (
                    <div className="text-sm">
                      <span className="font-medium">Dialekt:</span> {userPersona.dialect}
                    </div>
                  )}

                  {/* Sprachstil */}
                  {userPersona.language_style && (
                    <div className="text-sm">
                      <span className="font-medium">Stil:</span> <span className="text-muted-foreground">{userPersona.language_style}</span>
                    </div>
                  )}

                  {/* Typische Phrasen */}
                  {userPersona.phrases?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Typische Ausdrücke</h4>
                      <div className="flex flex-wrap gap-1">
                        {userPersona.phrases.slice(0, 4).map((phrase, i) => (
                          <span key={i} className="text-xs bg-accent/50 px-2 py-1 rounded">
                            "{phrase}"
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Keine Persona ausgewählt
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Chat History Dropdown */}
          <Popover open={showHistory} onOpenChange={async (open) => {
            setShowHistory(open);
            if (open && historyItems.length === 0) {
              setLoadingHistory(true);
              const history = await getChatHistory();
              setHistoryItems(history);
              setLoadingHistory(false);
            }
          }}>
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
                {loadingHistory ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Lade Verlauf...
                  </div>
                ) : historyItems.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Keine früheren Chats
                  </div>
                ) : (
                  historyItems.map((chat) => (
                    <Button
                      key={chat.id}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left p-2 h-auto whitespace-normal"
                      onClick={() => {
                        setShowHistory(false);
                        navigate(`/coach/${coach.name.toLowerCase()}?date=${chat.id}`);
                      }}
                    >
                      <div>
                        <div className="font-medium text-sm">{chat.date}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {chat.preview}
                        </div>
                      </div>
                    </Button>
                  ))
                )}
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
