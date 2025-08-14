import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { RadioButtonCheckbox } from './ui/radio-button-checkbox';
import { Pill, ChevronDown, ChevronUp, Check, Clock, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSupplementData, TIMING_OPTIONS, getTimingOption } from '@/hooks/useSupplementData';
import { SupplementEditModal } from '@/components/SupplementEditModal';

function formatNumber(n: number) {
  return Math.max(0, Math.round(n));
}

function TimingChip({ timing, taken, total, onClick }: { timing: string; taken: number; total: number; onClick?: () => void }) {
  const timingInfo = getTimingOption(timing);
  const isComplete = taken === total && total > 0;
  
  return (
    <button
      type="button"
      onClick={onClick}
      title={timingInfo.tip}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors",
        isComplete 
          ? "bg-primary/10 border-primary/20 text-primary" 
          : "bg-secondary/50 hover:bg-secondary border-border"
      )}
    >
      <span className="mr-1.5">{timingInfo.icon}</span>
      <span className="truncate max-w-[8rem]">{timingInfo.label}</span>
      {total > 0 && (
        <span className="ml-1.5 font-medium">
          {taken}/{total}
        </span>
      )}
      <div className="ml-2">
        <RadioButtonCheckbox checked={isComplete} />
      </div>
    </button>
  );
}

function SupplementRow({ 
  supplement, 
  timing, 
  intake, 
  onToggle 
}: { 
  supplement: any; 
  timing: string; 
  intake?: any; 
  onToggle: (supplementId: string, timing: string, taken: boolean) => void;
}) {
  const timingInfo = getTimingOption(timing);
  const isTaken = intake?.taken || false;
  
  return (
    <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
      <div className="flex items-center gap-3 min-w-0">
        <RadioButtonCheckbox
          checked={isTaken}
          onCheckedChange={(checked) => onToggle(supplement.id, timing, !!checked)}
        />
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">
            {supplement.custom_name || supplement.name || supplement.supplement_database?.name || 'Supplement'}
          </div>
          <div className="text-xs text-muted-foreground">
            {supplement.dosage} {supplement.unit}
          </div>
        </div>
      </div>
      {isTaken && (
        <Badge variant="secondary" className="text-xs">
          <Check className="h-3 w-3 mr-1" />
          Genommen
        </Badge>
      )}
    </div>
  );
}

function TimingSection({ 
  timing, 
  group, 
  onToggleSupplement, 
  onToggleGroup,
  onEditTiming 
}: { 
  timing: string; 
  group: any; 
  onToggleSupplement: (supplementId: string, timing: string, taken: boolean) => void;
  onToggleGroup: (timing: string, taken: boolean) => void;
  onEditTiming: (timing: string, supplements: any[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const timingInfo = getTimingOption(timing);
  const isComplete = group.taken === group.total && group.total > 0;
  const hasSupplements = group.supplements.length > 0;
  
  if (!hasSupplements) return null;
  
  return (
    <div className="border rounded-md">
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50"
        onClick={() => setOpen(!open)}
      >
        {/* Links: Icon + Text */}
        <div className="flex items-center gap-3">
          <span className="text-base">{timingInfo.icon}</span>
          <div className="text-left">
            <div className="text-sm font-medium">{timingInfo.label}</div>
            <div className="text-xs text-muted-foreground">{timingInfo.tip}</div>
          </div>
        </div>
        
        {/* Rechts: Badge + Controls */}
        <div className="flex items-center gap-3">
          <Badge variant={isComplete ? "default" : "secondary"} className="text-xs">
            {group.taken}/{group.total}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleGroup(timing, !isComplete);
            }}
            className="h-8 w-8 p-0"
            title={isComplete ? 'Alle entfernen' : 'Alle abhaken'}
          >
            <RadioButtonCheckbox checked={isComplete} />
          </Button>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <div className="flex justify-end mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditTiming(timing, group.supplements)}
              className="h-8 px-2"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
          {group.supplements.map((supplement: any) => {
            const intake = group.intakes.find((i: any) => i.user_supplement_id === supplement.id);
            console.log('Supplement object:', supplement); // Debug log
            return (
              <SupplementRow
                key={supplement.id}
                supplement={supplement}
                timing={timing}
                intake={intake}
                onToggle={onToggleSupplement}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

interface QuickSupplementInputProps {
  onSupplementUpdate?: () => void;
  currentDate?: Date;
}

export const QuickSupplementInput: React.FC<QuickSupplementInputProps> = ({ onSupplementUpdate, currentDate }) => {
  const {
    groupedSupplements,
    totalScheduled,
    totalTaken,
    completionPercent,
    loading,
    error,
    markSupplementTaken,
    markTimingGroupTaken
  } = useSupplementData(currentDate);
  
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [editingTiming, setEditingTiming] = useState<{ timing: string; supplements: any[] } | null>(null);

  const handleSupplementToggle = async (supplementId: string, timing: string, taken: boolean) => {
    await markSupplementTaken(supplementId, timing, taken);
  };

  const handleGroupToggle = async (timing: string, taken: boolean) => {
    await markTimingGroupTaken(timing, taken);
  };

  const handleEditTiming = (timing: string, supplements: any[]) => {
    setEditingTiming({ timing, supplements });
  };

  const handleCloseEdit = () => {
    setEditingTiming(null);
    onSupplementUpdate?.();
  };

  // Get smart chips for timing groups (show top 3 with supplements)
  const smartChips = Object.entries(groupedSupplements)
    .filter(([_, group]) => group.total > 0)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 3)
    .map(([timing, group]) => ({
      timing,
      taken: group.taken,
      total: group.total,
      action: () => handleGroupToggle(timing, group.taken < group.total)
    }));

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold">Supplemente</h2>
        </div>
        <div className="mt-3 text-sm text-muted-foreground">Lade Supplemente...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold">Supplemente</h2>
        </div>
        <div className="mt-3 text-sm text-destructive">Fehler: {error}</div>
      </Card>
    );
  }

  return (
    <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
      <Card className="p-4">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between hover:bg-muted/50 rounded-md p-2 -m-2"
          >
            <div className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">Supplemente</h2>
            </div>
            <div className="text-muted-foreground hover:text-foreground">
              {!isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Collapsed summary when card is closed */}
        {isCollapsed && (
          <div className="mt-3 space-y-1 text-sm">
            {totalScheduled > 0 ? (
              <>
                <div className="flex items-center gap-3">
              <div className="font-medium">
                {formatNumber(totalTaken)} / {formatNumber(totalScheduled)} genommen
              </div>
                  <Progress
                    className="h-2 w-24 md:w-32"
                    value={completionPercent}
                    aria-label="Supplement-Fortschritt"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
                  <span>
                    {Object.keys(groupedSupplements).length} Tageszeiten · {totalScheduled} Supplemente
                  </span>
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">Keine Supplemente konfiguriert</div>
            )}
          </div>
        )}

        {/* Smart Chips for timing groups - visible in both collapsed and expanded states */}
        {smartChips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {smartChips.map((chip) => (
              <TimingChip
                key={chip.timing}
                timing={chip.timing}
                taken={chip.taken}
                total={chip.total}
                onClick={chip.action}
              />
            ))}
          </div>
        )}

        <CollapsibleContent>
          {/* Header numbers */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Genommen / Geplant</div>
              <div className="text-lg font-medium">{formatNumber(totalTaken)} / {formatNumber(totalScheduled)}</div>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Fortschritt</div>
              <div className="text-lg font-medium">{formatNumber(completionPercent)}%</div>
            </div>
          </div>

          {/* Supplements by timing */}
          <div className="mt-4">
            {Object.keys(groupedSupplements).length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Keine aktiven Supplemente gefunden. Verwende die Chat-Funktion, um Supplemente hinzuzufügen.
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(groupedSupplements)
                  .sort(([a], [b]) => {
                    const orderA = TIMING_OPTIONS.findIndex(t => t.value === a);
                    const orderB = TIMING_OPTIONS.findIndex(t => t.value === b);
                    return orderA - orderB;
                  })
                  .map(([timing, group]) => (
                    <TimingSection
                      key={timing}
                      timing={timing}
                      group={group}
                      onToggleSupplement={handleSupplementToggle}
                      onToggleGroup={handleGroupToggle}
                      onEditTiming={handleEditTiming}
                    />
                  ))}
              </div>
            )}
          </div>
        </CollapsibleContent>

        {editingTiming && (
          <SupplementEditModal
            isOpen={!!editingTiming}
            onClose={handleCloseEdit}
            timing={editingTiming.timing}
            supplements={editingTiming.supplements}
            onUpdate={handleCloseEdit}
          />
        )}
      </Card>
    </Collapsible>
  );
};
