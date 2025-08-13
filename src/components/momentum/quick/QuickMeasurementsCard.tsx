import React, { useState } from 'react';
import { QuickCardShell } from './QuickCardShell';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { BodyMeasurements } from '@/components/BodyMeasurements';
import { Ruler, TrendingUp } from 'lucide-react';


interface QuickMeasurementsCardProps {
  todaysMeasurements?: any;
  onMeasurementsAdded?: () => void;
}

export const QuickMeasurementsCard: React.FC<QuickMeasurementsCardProps> = ({
  todaysMeasurements,
  onMeasurementsAdded
}) => {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const hasMeasurements = todaysMeasurements && todaysMeasurements.id;

  // Create summary text for closed mode
  const getSummaryText = () => {
    if (!hasMeasurements) return 'Noch nicht gemessen';
    
    const parts = [];
    if (todaysMeasurements.waist) parts.push(`Taille: ${todaysMeasurements.waist}cm`);
    if (todaysMeasurements.belly) parts.push(`Bauch: ${todaysMeasurements.belly}cm`);
    if (todaysMeasurements.hips) parts.push(`Hüfte: ${todaysMeasurements.hips}cm`);
    
    return parts.length > 0 ? parts.slice(0, 2).join(' • ') : 'Maße erfasst';
  };

  return (
    <>
      <QuickCardShell
        title="Körpermaße"
        icon={<Ruler className="h-4 w-4" />}
        status={getSummaryText()}
        statusIcon={hasMeasurements ? <TrendingUp className="h-3 w-3" /> : undefined}
        quickActions={hasMeasurements ? [] : [
          {
            label: 'Jetzt messen',
            onClick: () => setDetailsOpen(true),
            variant: 'default'
          }
        ]}
        detailsAction={{
          label: 'Details',
          onClick: () => setDetailsOpen(true)
        }}
        dataState={hasMeasurements ? 'done' : 'empty'}
        progressPercent={hasMeasurements ? 100 : 0}
        showStateDecorations={false}
      >
        {hasMeasurements ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Zusammenfassung:</span>
              <span className="font-medium">{getSummaryText()}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
              {todaysMeasurements?.neck && (
                <div><strong>Hals:</strong> {todaysMeasurements.neck}cm</div>
              )}
              {todaysMeasurements?.chest && (
                <div><strong>Brust:</strong> {todaysMeasurements.chest}cm</div>
              )}
              {todaysMeasurements?.waist && (
                <div><strong>Taille:</strong> {todaysMeasurements.waist}cm</div>
              )}
              {todaysMeasurements?.belly && (
                <div><strong>Bauch:</strong> {todaysMeasurements.belly}cm</div>
              )}
              {todaysMeasurements?.hips && (
                <div><strong>Hüfte:</strong> {todaysMeasurements.hips}cm</div>
              )}
              {todaysMeasurements?.arms && (
                <div><strong>Arme:</strong> {todaysMeasurements.arms}cm</div>
              )}
              {todaysMeasurements?.thigh && (
                <div><strong>Oberschenkel:</strong> {todaysMeasurements.thigh}cm</div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">📏 Warum Körpermaße wichtig sind</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Körperumfänge sind oft bessere Indikatoren für deine Fortschritte als nur das Gewicht.
              </p>
              <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground">
                <div>• <strong>Taille & Bauch:</strong> Zeigen Fettabbau am Körpermitte</div>
                <div>• <strong>Arme & Brust:</strong> Reflektieren Muskelaufbau</div>
                <div>• <strong>Wöchentlich messen:</strong> Für beste Trend-Erkennung</div>
              </div>
            </div>
          </div>
        )}
      </QuickCardShell>

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Körpermaße Details</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <BodyMeasurements 
              onMeasurementsAdded={() => {
                onMeasurementsAdded?.();
                setDetailsOpen(false);
              }} 
              todaysMeasurements={todaysMeasurements} 
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};