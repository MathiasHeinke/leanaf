/**
 * PeptidesSheet - Layer 2 Manager for peptide protocols
 * Tabs: Plan (Today's schedule) + Inventory (Vial management)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { 
  X, Syringe, Check, Clock, AlertTriangle, 
  Package, RefreshCw, ChevronRight, Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProtocols } from '@/hooks/useProtocols';
import { useIntakeLog, type InjectionSite } from '@/hooks/useIntakeLog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { toast } from 'sonner';

interface PeptidesSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'plan' | 'inventory';

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

// Timing display labels
const TIMING_LABELS: Record<string, { label: string; time: string }> = {
  morning_fasted: { label: 'Morgens (nüchtern)', time: '08:00' },
  evening_fasted: { label: 'Abends (nüchtern)', time: '20:00' },
  pre_workout: { label: 'Pre-Workout', time: '16:00' },
  post_workout: { label: 'Post-Workout', time: '17:00' },
  bedtime: { label: 'Schlafenszeit', time: '22:00' },
};

// Injection site labels
const SITE_LABELS: Record<string, string> = {
  abdomen_left: 'Bauch Links',
  abdomen_right: 'Bauch Rechts',
  thigh_left: 'Oberschenkel Links',
  thigh_right: 'Oberschenkel Rechts',
  deltoid_left: 'Schulter Links',
  deltoid_right: 'Schulter Rechts',
};

const SITES: InjectionSite[] = [
  'abdomen_left', 'abdomen_right',
  'thigh_left', 'thigh_right', 
  'deltoid_left', 'deltoid_right'
];

export const PeptidesSheet: React.FC<PeptidesSheetProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabId>('plan');
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<Record<string, InjectionSite>>({});
  const [siteSuggestions, setSiteSuggestions] = useState<Record<string, { suggested: InjectionSite; lastUsed: InjectionSite | null }>>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState<Set<string>>(new Set());

  const { protocols, loading: protocolsLoading, refillVial, refetch } = useProtocols();
  const { 
    logIntake, 
    isPeptideTakenToday, 
    getNextSuggestedSite,
    loading: logsLoading 
  } = useIntakeLog();

  const activeProtocols = useMemo(() => 
    protocols.filter(p => p.is_active && p.peptides.length > 0),
    [protocols]
  );

  // Group by timing for Plan tab
  const scheduleGroups = useMemo(() => {
    const grouped = new Map<string, typeof activeProtocols>();
    
    activeProtocols.forEach(protocol => {
      const timing = protocol.timing || 'evening_fasted';
      if (!grouped.has(timing)) {
        grouped.set(timing, []);
      }
      grouped.get(timing)!.push(protocol);
    });

    return Array.from(grouped.entries())
      .map(([timing, prots]) => ({
        timing,
        ...TIMING_LABELS[timing] || { label: timing, time: '20:00' },
        protocols: prots,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [activeProtocols]);

  // Load site suggestions when popover opens
  const loadSiteSuggestion = async (protocolId: string) => {
    if (siteSuggestions[protocolId]) return;
    
    setLoadingSuggestions(prev => new Set(prev).add(protocolId));
    try {
      const suggestion = await getNextSuggestedSite(protocolId);
      setSiteSuggestions(prev => ({ ...prev, [protocolId]: suggestion }));
      // Pre-select suggested site
      setSelectedSite(prev => ({ ...prev, [protocolId]: suggestion.suggested }));
    } finally {
      setLoadingSuggestions(prev => {
        const next = new Set(prev);
        next.delete(protocolId);
        return next;
      });
    }
  };

  const handleLog = async (protocolId: string, peptideName: string, dose: number, unit: string, timing: string) => {
    const site = selectedSite[protocolId];
    if (!site) {
      toast.error('Bitte Injektionsstelle wählen');
      return;
    }

    setLoggingId(protocolId);
    try {
      const success = await logIntake(protocolId, peptideName, dose, unit, timing, site);
      if (success) {
        toast.success(`${peptideName} geloggt! +25 XP`);
        // Clear state for this protocol
        setSelectedSite(prev => {
          const next = { ...prev };
          delete next[protocolId];
          return next;
        });
        setSiteSuggestions(prev => {
          const next = { ...prev };
          delete next[protocolId];
          return next;
        });
        await refetch();
      }
    } finally {
      setLoggingId(null);
    }
  };

  const handleRefill = async (protocolId: string) => {
    await refillVial(protocolId, 20);
  };

  const handleDragEnd = (_: any, info: { offset: { y: number }; velocity: { y: number } }) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

  const loading = protocolsLoading || logsLoading;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm"
          />
          
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springConfig}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="fixed inset-x-0 bottom-0 z-[71] bg-background rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col"
          >
            {/* Handle Bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <Syringe className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Peptide Protokoll</h2>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(), 'd. MMMM yyyy', { locale: de })}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                aria-label="Schließen"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-5 pb-4">
              <div className="flex gap-2 p-1 bg-muted rounded-xl">
                {(['plan', 'inventory'] as TabId[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all",
                      activeTab === tab 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab === 'plan' ? 'Plan' : 'Inventar'}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-6">
              {loading ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : activeTab === 'plan' ? (
                /* ===== PLAN TAB ===== */
                <div className="space-y-6">
                  {scheduleGroups.length === 0 ? (
                    <div className="text-center py-12">
                      <Syringe className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground">Keine aktiven Protokolle</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Erstelle ein Protokoll unter Einstellungen
                      </p>
                    </div>
                  ) : (
                    scheduleGroups.map(group => (
                      <div key={group.timing}>
                        {/* Time Header */}
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">
                            {group.time} – {group.label}
                          </span>
                        </div>

                        {/* Protocols in this time slot */}
                        <div className="space-y-3">
                          {group.protocols.map(protocol => {
                            const peptide = protocol.peptides[0];
                            if (!peptide) return null;
                            
                            const isTaken = isPeptideTakenToday(protocol.id, peptide.name);
                            const suggestion = siteSuggestions[protocol.id];
                            const isLoadingSuggestion = loadingSuggestions.has(protocol.id);
                            const currentSite = selectedSite[protocol.id];

                            return (
                              <div 
                                key={protocol.id}
                                className={cn(
                                  "p-4 rounded-2xl border transition-colors",
                                  isTaken 
                                    ? "bg-emerald-500/10 border-emerald-500/30"
                                    : "bg-muted/30 border-border"
                                )}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{peptide.name}</span>
                                      {protocol.isLowInventory && (
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                      )}
                                      {isTaken && <Check className="w-4 h-4 text-emerald-500" />}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {peptide.dose} {peptide.unit}
                                    </p>
                                    
                                    {/* Vial status */}
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Vial: {protocol.vial_remaining_doses}/{protocol.vial_total_doses} Dosen
                                    </p>
                                  </div>

                                  {!isTaken && (
                                    <Popover onOpenChange={(open) => open && loadSiteSuggestion(protocol.id)}>
                                      <PopoverTrigger asChild>
                                        <Button size="sm" variant="default" className="rounded-xl">
                                          Log
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent 
                                        className="w-72 p-4" 
                                        align="end"
                                        side="top"
                                      >
                                        <div className="space-y-4">
                                          {/* Header */}
                                          <div>
                                            <h4 className="font-medium text-sm">{peptide.name} loggen</h4>
                                            {isLoadingSuggestion ? (
                                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                Lade Vorschlag...
                                              </p>
                                            ) : suggestion ? (
                                              <p className="text-xs text-muted-foreground mt-1">
                                                {suggestion.lastUsed ? (
                                                  <>Letzte: {SITE_LABELS[suggestion.lastUsed]} → <span className="text-primary font-medium">Vorschlag: {SITE_LABELS[suggestion.suggested]}</span></>
                                                ) : (
                                                  <>Erste Injektion – Vorschlag: <span className="text-primary font-medium">{SITE_LABELS[suggestion.suggested]}</span></>
                                                )}
                                              </p>
                                            ) : null}
                                          </div>

                                          {/* Site Selection Grid */}
                                          <div className="grid grid-cols-2 gap-2">
                                            {SITES.map(site => (
                                              <button
                                                key={site}
                                                onClick={() => setSelectedSite(prev => ({ ...prev, [protocol.id]: site }))}
                                                className={cn(
                                                  "px-3 py-2 rounded-xl text-xs font-medium transition-all text-left",
                                                  currentSite === site
                                                    ? "bg-primary text-primary-foreground ring-2 ring-primary/50"
                                                    : suggestion?.suggested === site
                                                      ? "bg-primary/20 text-primary border border-primary/30"
                                                      : "bg-muted hover:bg-muted/80 text-foreground"
                                                )}
                                              >
                                                {SITE_LABELS[site]}
                                              </button>
                                            ))}
                                          </div>

                                          {/* Confirm Button */}
                                          <Button
                                            onClick={() => handleLog(
                                              protocol.id,
                                              peptide.name,
                                              peptide.dose,
                                              peptide.unit,
                                              protocol.timing
                                            )}
                                            disabled={!currentSite || loggingId === protocol.id}
                                            className="w-full rounded-xl"
                                          >
                                            {loggingId === protocol.id ? (
                                              <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                              <>
                                                <Check className="w-4 h-4 mr-2" />
                                                Speichern
                                              </>
                                            )}
                                          </Button>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* ===== INVENTORY TAB ===== */
                <div className="space-y-4">
                  {activeProtocols.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground">Keine Protokolle</p>
                    </div>
                  ) : (
                    activeProtocols.map(protocol => {
                      const peptide = protocol.peptides[0];
                      if (!peptide) return null;
                      
                      const percentage = (protocol.vial_remaining_doses / protocol.vial_total_doses) * 100;
                      
                      return (
                        <div 
                          key={protocol.id}
                          className="p-4 rounded-2xl border border-border bg-card"
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <h4 className="font-medium">{peptide.name}</h4>
                              <p className="text-xs text-muted-foreground">
                                {peptide.dose} {peptide.unit} • {TIMING_LABELS[protocol.timing]?.label || protocol.timing}
                              </p>
                            </div>
                            {protocol.isLowInventory && (
                              <span className="text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Niedrig
                              </span>
                            )}
                          </div>

                          {/* Vial Progress */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Vial Status</span>
                              <span className={cn(
                                "font-medium tabular-nums",
                                protocol.isLowInventory ? "text-amber-500" : "text-foreground"
                              )}>
                                {protocol.vial_remaining_doses} / {protocol.vial_total_doses} Dosen
                              </span>
                            </div>
                            <Progress 
                              value={percentage} 
                              className={cn(
                                "h-2.5",
                                protocol.isLowInventory && "[&>div]:bg-amber-500"
                              )}
                            />
                          </div>

                          {/* Refill Button */}
                          <Button
                            onClick={() => handleRefill(protocol.id)}
                            variant="outline"
                            size="sm"
                            className="w-full mt-4 rounded-xl"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Neues Vial (20 Dosen)
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PeptidesSheet;
