/**
 * SupplementsLogger - Supplement tracking with timing groups
 * Beginner: "Log All" for current timing
 * Expert: Individual checkboxes, ungeplantes hinzufügen accordion
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Sunrise, Sun, Moon, Dumbbell, ChevronDown, Loader2, Search, Plus } from 'lucide-react';
import { useSupplementData } from '@/hooks/useSupplementData';
import { useAuth } from '@/hooks/useAuth';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SupplementsLoggerProps {
  onClose: () => void;
}

const TIMING_ICONS: Record<string, React.ElementType> = {
  morning: Sunrise,
  noon: Sun,
  evening: Moon,
  bedtime: Moon,
  pre_workout: Dumbbell,
  post_workout: Dumbbell,
};

const TIMING_LABELS: Record<string, string> = {
  morning: 'Morgens',
  noon: 'Mittags',
  evening: 'Abends',
  bedtime: 'Vor dem Schlafen',
  pre_workout: 'Pre-Workout',
  post_workout: 'Post-Workout',
};

// Chronological order for timing groups
const TIMING_ORDER: string[] = [
  'morning',      // 05:00 - 11:59
  'noon',         // 12:00 - 16:59  
  'evening',      // 17:00 - 20:59
  'bedtime',      // 21:00 - 04:59
  'pre_workout',  // Dynamic
  'post_workout', // Dynamic
];

// Determine current timing based on hour
const getCurrentTiming = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'noon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'bedtime'; // 21:00 - 04:59
};

export const SupplementsLogger: React.FC<SupplementsLoggerProps> = ({ onClose }) => {
  const { user } = useAuth();
  const {
    groupedSupplements,
    loading,
    markSupplementTaken,
    markTimingGroupTaken,
  } = useSupplementData();

  const [loggingAll, setLoggingAll] = useState(false);
  const [expandedTiming, setExpandedTiming] = useState<string | null>(null);
  const [adHocOpen, setAdHocOpen] = useState(false);
  const [adHocSearch, setAdHocSearch] = useState('');
  const [adHocResults, setAdHocResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loggingAdHoc, setLoggingAdHoc] = useState<string | null>(null);

  const currentTiming = getCurrentTiming();
  
  // Sort timings chronologically
  const sortedTimings = Object.keys(groupedSupplements).sort(
    (a, b) => TIMING_ORDER.indexOf(a) - TIMING_ORDER.indexOf(b)
  );

  // Calculate overall stats
  const totalScheduled = Object.values(groupedSupplements).reduce((sum, g) => sum + g.total, 0);
  const totalTaken = Object.values(groupedSupplements).reduce((sum, g) => sum + g.taken, 0);

  const handleLogAll = async () => {
    setLoggingAll(true);
    try {
      await markTimingGroupTaken(currentTiming, true);
      toast.success(`Alle ${TIMING_LABELS[currentTiming]} Supplements geloggt`);
    } catch (err) {
      toast.error('Fehler beim Speichern');
    } finally {
      setLoggingAll(false);
    }
  };

  const handleToggleSupplement = async (supplementId: string, timing: string, currentlyTaken: boolean) => {
    await markSupplementTaken(supplementId, timing, !currentlyTaken);
  };

  // Debounced search for ad-hoc supplements
  useEffect(() => {
    if (!adHocSearch.trim()) {
      setAdHocResults([]);
      return;
    }
    
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      const { data } = await supabase
        .from('supplement_database')
        .select('id, name, category, default_dosage, default_unit')
        .ilike('name', `%${adHocSearch}%`)
        .limit(5);
      setAdHocResults(data || []);
      setSearchLoading(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [adHocSearch]);

  // Log ad-hoc supplement (one-time intake without adding to stack)
  const handleLogAdHoc = async (supplement: any) => {
    if (!user) return;
    setLoggingAdHoc(supplement.id);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('supplement_intake_log')
        .insert({
          user_id: user.id,
          user_supplement_id: null, // Ad-hoc, not linked to user_supplements
          timing: getCurrentTiming(),
          taken: true,
          date: today,
          notes: `Ad-hoc: ${supplement.name} ${supplement.default_dosage || ''}${supplement.default_unit || ''}`
        });
      
      if (error) throw error;
      toast.success(`${supplement.name} geloggt`);
      setAdHocSearch('');
      setAdHocResults([]);
    } catch (err) {
      console.error('Error logging ad-hoc supplement:', err);
      toast.error('Fehler beim Loggen');
    } finally {
      setLoggingAdHoc(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sortedTimings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Keine aktiven Supplements konfiguriert.</p>
        <p className="text-sm mt-2">Gehe zu Einstellungen → Supplements</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
      {/* Progress summary */}
      <div className="flex items-center justify-between px-2 py-2 bg-muted/50 rounded-xl">
        <span className="text-sm text-muted-foreground">Heute</span>
        <span className="text-sm font-medium">
          {totalTaken} / {totalScheduled}
          {totalTaken === totalScheduled && totalScheduled > 0 && (
            <Check className="inline w-4 h-4 ml-1 text-green-500" />
          )}
        </span>
      </div>

      {/* Timing Groups - Chronologically sorted */}
      {sortedTimings.map((timing) => {
        const group = groupedSupplements[timing];
        const Icon = TIMING_ICONS[timing] || Sun;
        const label = TIMING_LABELS[timing] || timing;
        const isComplete = group.taken === group.total && group.total > 0;
        const isExpanded = expandedTiming === timing;
        const isCurrent = timing === currentTiming;

        return (
          <Collapsible
            key={timing}
            open={isExpanded}
            onOpenChange={(open) => setExpandedTiming(open ? timing : null)}
          >
            <CollapsibleTrigger className="w-full">
              <div
                className={cn(
                  "flex items-center justify-between w-full px-4 py-3 rounded-xl transition-colors",
                  isComplete ? "bg-green-500/10" : "bg-muted/50 hover:bg-muted",
                  isCurrent && !isComplete && "ring-2 ring-primary/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("w-5 h-5", isComplete ? "text-green-500" : "text-muted-foreground")} />
                  <span className="font-medium">{label}</span>
                  {isCurrent && !isComplete && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                      Jetzt
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm",
                    isComplete ? "text-green-500" : "text-muted-foreground"
                  )}>
                    {group.taken}/{group.total}
                  </span>
                  {isComplete ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <ChevronDown className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform",
                      isExpanded && "rotate-180"
                    )} />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent className="pt-2 pl-4 pr-2 space-y-2">
              {group.supplements.map((supp) => {
                const intake = group.intakes.find(i => i.user_supplement_id === supp.id);
                const isTaken = intake?.taken ?? false;

                return (
                  <div
                    key={`${supp.id}-${timing}`}
                    className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <Checkbox
                      checked={isTaken}
                      onCheckedChange={() => handleToggleSupplement(supp.id, timing, isTaken)}
                      className="w-5 h-5"
                    />
                    <div className="flex-1">
                      <span className={cn(
                        "text-sm",
                        isTaken && "text-muted-foreground line-through"
                      )}>
                        {supp.supplement_name}
                      </span>
                      {supp.dosage && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {supp.dosage}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      {/* Log All Button for current timing */}
      {groupedSupplements[currentTiming] && groupedSupplements[currentTiming].taken < groupedSupplements[currentTiming].total && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleLogAll}
          disabled={loggingAll}
          className={cn(
            "w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-colors",
            "bg-primary text-primary-foreground",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {loggingAll ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Check className="w-5 h-5" />
              Alle {TIMING_LABELS[currentTiming]} nehmen
            </>
          )}
        </motion.button>
      )}

      {/* Ad-hoc Supplements Accordion (Expert) */}
      <Collapsible open={adHocOpen} onOpenChange={setAdHocOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 bg-muted/30 rounded-xl text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
          <span>Ungeplantes hinzufügen</span>
          <ChevronDown className={cn(
            "w-4 h-4 transition-transform",
            adHocOpen && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Medikament oder Supplement suchen..."
              value={adHocSearch}
              onChange={(e) => setAdHocSearch(e.target.value)}
              className="w-full pl-9"
            />
          </div>
          
          {/* Search Results */}
          {searchLoading ? (
            <div className="flex justify-center py-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : adHocResults.length > 0 ? (
            <div className="space-y-1">
              {adHocResults.map((supp) => (
                <button
                  key={supp.id}
                  onClick={() => handleLogAdHoc(supp)}
                  disabled={loggingAdHoc === supp.id}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium">{supp.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {supp.default_dosage}{supp.default_unit} • {supp.category}
                    </p>
                  </div>
                  {loggingAdHoc === supp.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          ) : adHocSearch.trim() ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              Keine Ergebnisse für "{adHocSearch}"
            </p>
          ) : null}
          
          <p className="text-xs text-muted-foreground px-1">
            Für einmalige Einnahmen (z.B. Kopfschmerztablette)
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default SupplementsLogger;
