import React, { useState } from 'react';
import { ChevronDown, ArrowLeft, Clock, Trash2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNavigate } from 'react-router-dom';
import { DailyResetDialog } from './DailyResetDialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentDateString } from '@/utils/dateHelpers';

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
    navigate('/coach');
  };

  const toggleCollapse = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    onCollapseChange?.(newCollapsed);
  };

  const getCoachInfo = () => {
    const coachId = coach.id?.toLowerCase() || coach.name.toLowerCase();
    
    if (coachId === 'ares') {
      return {
        title: 'ARES - Ultimate Performance Coach',
        description: 'Der ultimative Performance-Coach mit Zugriff auf alle Trainingsdaten, Ernährungsanalysen und fortschrittliche Tools.',
        expertise: [
          'Cross-Domain Training & Nutrition Mastery',
          'Advanced Performance Analytics',
          'Hormone & Recovery Optimization',
          'Strength & Hypertrophy Periodization',
          'Mental Toughness & Mindset'
        ],
        tools: [
          'Complete User Database Access',
          'Advanced Workout Planning',
          'Nutrition Tracking & Analysis',
          'Progress Photo Analysis',
          'Performance Metrics Tracking',
          'Recovery & Sleep Analysis'
        ],
        specialties: [
          'Maximaler Muskelaufbau',
          'Kraftsteigerung',
          'Hormonoptimierung',
          'Wettkampfvorbereitung'
        ]
      };
    } else {
      return {
        title: 'FREYA - Holistic Wellness Coach',
        description: 'Deine ganzheitliche Wellness-Expertin mit Fokus auf weibliche Gesundheit und nachhaltigen Lifestyle.',
        expertise: [
          'Female Health & Cycle Optimization',
          'Holistic Nutrition & Wellness',
          'Sustainable Lifestyle Design',
          'Mind-Body Connection',
          'Hormonal Balance'
        ],
        tools: [
          'Complete User Database Access',
          'Cycle-Based Training Plans',
          'Nutrition & Meal Planning',
          'Progress Tracking',
          'Wellness Analytics',
          'Lifestyle Assessments'
        ],
        specialties: [
          'Zyklusbasiertes Training',
          'Hormonelle Balance',
          'Nachhaltiger Lifestyle',
          'Ganzheitliches Wohlbefinden'
        ]
      };
    }
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
          {/* Coach Info Button */}
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
              <div className="space-y-4">
                {(() => {
                  const info = getCoachInfo();
                  return (
                    <>
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{info.title}</h3>
                        <p className="text-sm text-muted-foreground">{info.description}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm mb-2">Expertise</h4>
                        <ul className="text-xs space-y-1">
                          {info.expertise.map((item, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-primary rounded-full" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm mb-2">Verfügbare Tools</h4>
                        <ul className="text-xs space-y-1">
                          {info.tools.map((tool, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-accent rounded-full" />
                              {tool}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm mb-2">Spezialgebiete</h4>
                        <div className="flex flex-wrap gap-1">
                          {info.specialties.map((specialty, index) => (
                            <span key={index} className="text-xs bg-accent/50 px-2 py-1 rounded">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
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
                        // Navigate to specific chat date
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