/**
 * PeptideLogger - Peptide injection tracking with site selection
 * Now with smart site rotation suggestions
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Syringe, ChevronDown, Info, ArrowRight } from 'lucide-react';
import { useProtocols } from '@/hooks/useProtocols';
import { useIntakeLog, type InjectionSite } from '@/hooks/useIntakeLog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PeptideLoggerProps {
  onClose: () => void;
}

const INJECTION_SITES: { id: InjectionSite; label: string; short: string }[] = [
  { id: 'abdomen_left', label: 'Bauch L', short: 'BL' },
  { id: 'abdomen_right', label: 'Bauch R', short: 'BR' },
  { id: 'thigh_left', label: 'Obersch. L', short: 'OL' },
  { id: 'thigh_right', label: 'Obersch. R', short: 'OR' },
  { id: 'deltoid_left', label: 'Schulter L', short: 'SL' },
  { id: 'deltoid_right', label: 'Schulter R', short: 'SR' },
];

const TIMING_LABELS: Record<string, string> = {
  morning_fasted: 'Morgens (nüchtern)',
  evening_fasted: 'Abends (nüchtern)',
  pre_workout: 'Pre-Workout',
  post_workout: 'Post-Workout',
  bedtime: 'Vor dem Schlaf',
};

const SITE_LABELS: Record<string, string> = {
  abdomen_left: 'Bauch Links',
  abdomen_right: 'Bauch Rechts',
  thigh_left: 'Oberschenkel Links',
  thigh_right: 'Oberschenkel Rechts',
  deltoid_left: 'Schulter Links',
  deltoid_right: 'Schulter Rechts',
};

export const PeptideLogger: React.FC<PeptideLoggerProps> = ({ onClose }) => {
  const { protocols, loading: protocolsLoading } = useProtocols();
  const { logIntake, isPeptideTakenToday, getNextSuggestedSite, loading: intakeLoading } = useIntakeLog();

  const [expandedProtocol, setExpandedProtocol] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<Record<string, InjectionSite>>({});
  const [suggestedSites, setSuggestedSites] = useState<Record<string, { suggested: InjectionSite; lastUsed: InjectionSite | null }>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const activeProtocols = protocols.filter(p => p.is_active);

  // Load site suggestion when protocol is expanded
  useEffect(() => {
    if (expandedProtocol && !suggestedSites[expandedProtocol]) {
      getNextSuggestedSite(expandedProtocol).then(suggestion => {
        setSuggestedSites(prev => ({ ...prev, [expandedProtocol]: suggestion }));
        // Pre-select the suggested site
        if (!selectedSite[expandedProtocol]) {
          setSelectedSite(prev => ({ ...prev, [expandedProtocol]: suggestion.suggested }));
        }
      });
    }
  }, [expandedProtocol, getNextSuggestedSite, suggestedSites, selectedSite]);

  const handleInject = async (protocolId: string) => {
    const protocol = activeProtocols.find(p => p.id === protocolId);
    if (!protocol || protocol.peptides.length === 0) return;

    // If no site selected yet, expand to show site selection
    if (!selectedSite[protocolId]) {
      setExpandedProtocol(protocolId);
      return;
    }

    setSaving(protocolId);
    try {
      const peptide = protocol.peptides[0];
      const site = selectedSite[protocolId];
      const success = await logIntake(
        protocol.id,
        peptide.name,
        peptide.dose,
        peptide.unit,
        protocol.timing || 'evening_fasted',
        site
      );

      if (success) {
        toast.success(`${peptide.name} geloggt`);
        setExpandedProtocol(null);
        // Clear selection for this protocol - need to remove key instead of setting to empty
        setSelectedSite(prev => {
          const next = { ...prev };
          delete next[protocolId];
          return next;
        });
        setSuggestedSites(prev => {
          const next = { ...prev };
          delete next[protocolId];
          return next;
        });
      } else {
        toast.error('Fehler beim Speichern');
      }
    } catch (err) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(null);
    }
  };

  const handleSiteSelect = (protocolId: string, siteId: InjectionSite) => {
    setSelectedSite(prev => ({ ...prev, [protocolId]: siteId }));
  };

  const loading = protocolsLoading || intakeLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activeProtocols.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Syringe className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>Keine aktiven Peptid-Protokolle.</p>
        <p className="text-sm mt-2">Erstelle ein Protokoll unter Protokolle</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
      {/* Info hint */}
      <div className="flex items-start gap-2 px-3 py-2 bg-muted/30 rounded-xl text-xs text-muted-foreground">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span>Wähle nach dem Klick auf "Injiziert" die Injektionsstelle für die Rotation.</span>
      </div>

      {/* Protocol list */}
      {activeProtocols.map((protocol) => {
        const peptide = protocol.peptides[0];
        if (!peptide) return null;

        const isTaken = isPeptideTakenToday(protocol.id, peptide.name);
        const isExpanded = expandedProtocol === protocol.id;
        const isSaving = saving === protocol.id;
        const hasSiteSelected = !!selectedSite[protocol.id];
        const suggestion = suggestedSites[protocol.id];

        return (
          <motion.div
            key={protocol.id}
            layout
            className={cn(
              "rounded-2xl border transition-colors overflow-hidden",
              isTaken ? "bg-green-500/10 border-green-500/30" : "bg-muted/30 border-border"
            )}
          >
            {/* Protocol header */}
            <div className="flex items-center justify-between p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Syringe className={cn("w-4 h-4", isTaken ? "text-green-500" : "text-muted-foreground")} />
                  <span className="font-medium">{peptide.name}</span>
                  {isTaken && <Check className="w-4 h-4 text-green-500" />}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{peptide.dose} {peptide.unit}</span>
                  <span>•</span>
                  <span>{TIMING_LABELS[protocol.timing] || protocol.timing}</span>
                </div>
              </div>

              {!isTaken && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleInject(protocol.id)}
                  disabled={isSaving}
                  className={cn(
                    "px-4 py-2 rounded-xl font-medium text-sm transition-colors",
                    hasSiteSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  )}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : hasSiteSelected ? (
                    <span className="flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Speichern
                    </span>
                  ) : (
                    'Injiziert'
                  )}
                </motion.button>
              )}
            </div>

            {/* Injection site selection (expanded) */}
            <AnimatePresence>
              {isExpanded && !isTaken && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-border"
                >
                  <div className="p-4 space-y-3">
                    {/* Site rotation hint */}
                    {suggestion && (
                      <div className="flex items-center gap-2 text-xs">
                        {suggestion.lastUsed ? (
                          <>
                            <span className="text-muted-foreground">
                              Letzte: {SITE_LABELS[suggestion.lastUsed]}
                            </span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <span className="text-primary font-medium">
                              Vorschlag: {SITE_LABELS[suggestion.suggested]}
                            </span>
                          </>
                        ) : (
                          <span className="text-primary font-medium">
                            Erste Injektion – Vorschlag: {SITE_LABELS[suggestion.suggested]}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <p className="text-sm font-medium text-muted-foreground">Injektionsstelle</p>
                    <div className="grid grid-cols-3 gap-2">
                      {INJECTION_SITES.map((site) => (
                        <button
                          key={site.id}
                          onClick={() => handleSiteSelect(protocol.id, site.id)}
                          className={cn(
                            "px-3 py-2 rounded-xl text-sm font-medium transition-all",
                            selectedSite[protocol.id] === site.id
                              ? "bg-primary text-primary-foreground ring-2 ring-primary/50"
                              : suggestion?.suggested === site.id
                                ? "bg-primary/20 text-primary border border-primary/30"
                                : "bg-muted hover:bg-muted/80 text-foreground"
                          )}
                        >
                          {site.label}
                        </button>
                      ))}
                    </div>

                    {/* Notes (optional) */}
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <ChevronDown className="w-3 h-3" />
                        <span>Notizen hinzufügen</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2">
                        <Input
                          placeholder="Rötung, Gefühl, etc..."
                          value={notes[protocol.id] || ''}
                          onChange={(e) => setNotes(prev => ({ ...prev, [protocol.id]: e.target.value }))}
                          className="text-sm"
                        />
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
};

export default PeptideLogger;
