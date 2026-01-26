/**
 * ChatOverlay - Slide-up chat sheet with context support
 * Opens ARES chat without page navigation
 * Supports initialContext for AI-triggered conversations
 * Now includes Info, History, and Daily Reset features
 */

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Zap, Info, Clock, Trash2, Loader2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { COACH_REGISTRY } from '@/lib/coachRegistry';
import AresChat from '@/components/ares/AresChat';
import { useAuth } from '@/hooks/useAuth';
import { useUserPersona } from '@/hooks/useUserPersona';
import { DailyResetDialog } from '@/components/DailyResetDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChatOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  initialContext?: string | null;
  initialPrompt?: string | null;  // Direct prompt with metrics
}

// Context prompts for AI - triggered by action cards
const CONTEXT_PROMPTS: Record<string, string> = {
  'analyze_recovery_pattern': 'Analysiere meine aktuellen Recovery-Daten und gib mir eine prägnante Handlungsempfehlung basierend auf meinen Schlaf-, Stress- und Trainingsdaten.',
  'sleep_optimization_advice': 'Mein Schlaf war schlecht. Gib mir konkrete, wissenschaftlich fundierte Tipps zur Schlafoptimierung basierend auf meinen Daten.',
  'start_evening_journal': 'Führe mich durch 3 kurze Reflexionsfragen für mein Abend-Journal. Halte es kurz und fokussiert.',
  'log_supplements': 'Erinnere mich an meine Supplement-Routine. Welche Supplements sollte ich basierend auf meinem Profil nehmen?',
  'complete_profile': 'Hilf mir, mein Profil zu vervollständigen. Welche wichtigen Daten fehlen mir noch für optimale Empfehlungen?',
  'hydration_reminder': 'Gib mir einen Motivationsschub zum Trinken. Erkläre kurz, warum Hydration für meine Ziele wichtig ist.'
};

// Dial labels for persona info
const DIAL_LABELS: Record<string, string> = {
  dial_energy: 'Energie',
  dial_directness: 'Direktheit',
  dial_humor: 'Humor',
  dial_warmth: 'Wärme',
  dial_depth: 'Tiefgang',
  dial_challenge: 'Forderung',
  dial_opinion: 'Meinung'
};

interface HistoryItem {
  id: string;
  date: string;
  preview: string;
  timestamp: Date;
}

export const ChatOverlay: React.FC<ChatOverlayProps> = ({ 
  isOpen, 
  onClose, 
  initialContext,
  initialPrompt
}) => {
  const { user } = useAuth();
  const aresCoach = COACH_REGISTRY.ares;
  const { persona: userPersona, loading: personaLoading } = useUserPersona();
  
  // State for header features
  const [showCoachInfo, setShowCoachInfo] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDailyResetDialog, setShowDailyResetDialog] = useState(false);
  const [isDeletingToday, setIsDeletingToday] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Ref to trigger message refresh in AresChat
  const refreshKeyRef = useRef(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Stable close handler
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Format history date
  const formatHistoryDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Heute';
    if (date.toDateString() === yesterday.toDateString()) return 'Gestern';
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  }, []);

  // Fetch chat history
  const getChatHistory = useCallback(async () => {
    if (!user) return [];
    
    try {
      const { data, error } = await supabase
        .from('coach_conversations')
        .select('conversation_date, message_content, created_at')
        .eq('user_id', user.id)
        .eq('coach_personality', 'ares')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Group by date and take first message as preview
      const grouped = data?.reduce((acc, msg) => {
        const date = msg.conversation_date;
        if (!acc[date]) {
          acc[date] = {
            id: date,
            date: formatHistoryDate(date),
            preview: msg.message_content.slice(0, 50) + (msg.message_content.length > 50 ? '...' : ''),
            timestamp: new Date(msg.created_at)
          };
        }
        return acc;
      }, {} as Record<string, HistoryItem>);

      return Object.values(grouped || {});
    } catch (error) {
      console.error('Error fetching chat history:', error);
      return [];
    }
  }, [user, formatHistoryDate]);

  // Handle history click
  const handleHistoryClick = useCallback(async () => {
    setLoadingHistory(true);
    const history = await getChatHistory();
    setHistoryItems(history);
    setLoadingHistory(false);
    setShowHistory(true);
  }, [getChatHistory]);

  // Handle daily reset
  const handleDailyReset = useCallback(async () => {
    if (!user) return;
    
    setIsDeletingToday(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('coach_conversations')
        .delete()
        .eq('user_id', user.id)
        .eq('conversation_date', today)
        .eq('coach_personality', 'ares');

      if (error) throw error;

      toast.success('Heutiger Chat wurde gelöscht');
      setShowDailyResetDialog(false);
      
      // Trigger refresh in AresChat
      refreshKeyRef.current += 1;
      setRefreshKey(refreshKeyRef.current);
    } catch (error) {
      console.error('Error deleting today\'s chat:', error);
      toast.error('Fehler beim Löschen des Chats');
    } finally {
      setIsDeletingToday(false);
    }
  }, [user]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle Escape key and browser back button
  useEffect(() => {
    if (!isOpen) return;

    // Escape key handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    // Browser back button handler (pushes a state, then listens for popstate)
    window.history.pushState({ chatOverlay: true }, '');
    
    const handlePopState = (e: PopStateEvent) => {
      handleClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, handleClose]);

  if (!user) return null;

  // Get the prompt - prefer direct prompt, fallback to context lookup
  const autoStartPrompt = initialPrompt || (initialContext ? CONTEXT_PROMPTS[initialContext] : undefined);
  const hasAutoStart = Boolean(autoStartPrompt);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - z-50 to be above content but clickable */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Sheet - z-[51] to be above backdrop */}
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: "5%" }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 top-0 z-[51] bg-background rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Drag Handle - clickable to close */}
            <div 
              className="absolute top-0 left-0 right-0 h-10 flex items-center justify-center cursor-pointer z-10"
              onClick={handleClose}
            >
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header with Info, History, Reset buttons */}
            <div className="px-5 pt-12 pb-3 flex justify-between items-center border-b border-border/50 bg-background/95 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-border/50">
                  <AvatarImage src={aresCoach.imageUrl} alt="ARES" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                    <Zap className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-base font-semibold text-foreground">ARES</h2>
                  <p className="text-[11px] text-muted-foreground">
                    {hasAutoStart ? 'Hat eine Erkenntnis...' : 'Dein Coach • Online'}
                  </p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                {/* Info Popover */}
                <Popover open={showCoachInfo} onOpenChange={setShowCoachInfo}>
                  <PopoverTrigger asChild>
                    <button 
                      className="p-2 hover:bg-secondary/80 rounded-full transition-colors"
                      aria-label="Coach Info"
                    >
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72" align="end" sideOffset={8}>
                    {personaLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : userPersona ? (
                      <div className="space-y-3">
                        {/* Persona Header */}
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{userPersona.icon}</span>
                          <div>
                            <h3 className="font-semibold">{userPersona.name}</h3>
                            {userPersona.description && (
                              <p className="text-xs text-muted-foreground">{userPersona.description}</p>
                            )}
                          </div>
                        </div>

                        {/* Personality Dials */}
                        <div className="space-y-1.5">
                          {(['dial_energy', 'dial_directness', 'dial_humor', 'dial_warmth'] as const).map(key => {
                            const value = userPersona[key] ?? 5;
                            return (
                              <div key={key} className="flex items-center gap-2">
                                <span className="text-xs w-16">{DIAL_LABELS[key]}</span>
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
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

                        {/* Dialect */}
                        {userPersona.dialect && (
                          <div className="text-xs">
                            <span className="font-medium">Dialekt:</span> {userPersona.dialect}
                          </div>
                        )}

                        {/* Language Style */}
                        {userPersona.language_style && (
                          <div className="text-xs">
                            <span className="font-medium">Stil:</span>{' '}
                            <span className="text-muted-foreground">{userPersona.language_style}</span>
                          </div>
                        )}

                        {/* Typical Phrases */}
                        {userPersona.phrases?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium mb-1">Typische Ausdrücke</h4>
                            <div className="flex flex-wrap gap-1">
                              {userPersona.phrases.slice(0, 3).map((phrase, i) => (
                                <span key={i} className="text-xs bg-accent/50 px-1.5 py-0.5 rounded">
                                  "{phrase}"
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Keine Persona ausgewählt
                      </div>
                    )}
                  </PopoverContent>
                </Popover>

                {/* History Popover */}
                <Popover open={showHistory} onOpenChange={setShowHistory}>
                  <PopoverTrigger asChild>
                    <button 
                      onClick={handleHistoryClick}
                      className="p-2 hover:bg-secondary/80 rounded-full transition-colors"
                      aria-label="Chat History"
                    >
                      {loadingHistory ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" align="end" sideOffset={8}>
                    <h3 className="font-semibold text-sm mb-2">Chat-Verlauf</h3>
                    {historyItems.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {historyItems.map((item) => (
                          <div
                            key={item.id}
                            className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                          >
                            <div className="text-xs font-medium text-primary">{item.date}</div>
                            <div className="text-xs text-muted-foreground truncate">{item.preview}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        Noch keine Gespräche
                      </p>
                    )}
                  </PopoverContent>
                </Popover>

                {/* Daily Reset Button */}
                <button 
                  onClick={() => setShowDailyResetDialog(true)}
                  className="p-2 hover:bg-destructive/10 rounded-full transition-colors"
                  aria-label="Heutigen Chat löschen"
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                </button>

                {/* Close Button */}
                <button 
                  onClick={handleClose} 
                  className="p-2 bg-secondary/80 hover:bg-secondary rounded-full transition-colors ml-1"
                >
                  <ChevronDown className="w-5 h-5 text-foreground" />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <AresChat 
                key={refreshKey}
                userId={user.id}
                coachId="ares"
                autoStartPrompt={autoStartPrompt}
                embedded={true}
                className="h-full"
              />
            </div>
          </motion.div>

          {/* Daily Reset Dialog */}
          <DailyResetDialog
            open={showDailyResetDialog}
            onOpenChange={setShowDailyResetDialog}
            onConfirm={handleDailyReset}
            isLoading={isDeletingToday}
          />
        </>
      )}
    </AnimatePresence>
  );
};
