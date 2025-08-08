import React, { useEffect } from 'react';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { usePlusData } from '@/hooks/usePlusData';
import { StreakLevelHeader } from '@/components/plus/StreakLevelHeader';
import { PlusDeficitRing } from '@/components/plus/PlusDeficitRing';
import { PlusMacroDeltas } from '@/components/plus/PlusMacroDeltas';
import { PlusTrainingSteps } from '@/components/plus/PlusTrainingSteps';
import { PlusSupportTiles } from '@/components/plus/PlusSupportTiles';
import { NextBestActionCard } from '@/components/plus/NextBestActionCard';
import { MiniJournalQuick } from '@/components/plus/MiniJournalQuick';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { QuickAddFAB } from '@/components/quick/QuickAddFAB';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

const MomentumBoard: React.FC = () => {
  const { isEnabled, loading: flagsLoading } = useFeatureFlags();
  const enabled = isEnabled('feature_plus_dashboard');
  const data = usePlusData();

  // Tagesmission Dynamik aus Daten ableiten
  const macrosDone = typeof (data as any)?.proteinDelta === 'number' ? ((data as any).proteinDelta <= 0) : false;
  const sleepLogged = Boolean((data as any)?.sleepLoggedToday || (((data as any)?.sleepDurationToday ?? 0) > 0));
  const supplementsLogged = Boolean((data as any)?.supplementsLoggedToday);
  const stepsToday = (data as any)?.stepsToday ?? 0;
  const stepsTarget = (data as any)?.stepsTarget ?? 7000;
  const workoutLogged = Boolean((data as any)?.workoutLoggedToday || stepsToday >= stepsTarget);
  const hydrationLogged = (((data as any)?.hydrationMlToday ?? 0) >= 1500);
  const missionCompletedCount = [macrosDone, sleepLogged, supplementsLogged, workoutLogged, hydrationLogged].filter(Boolean).length;

  // Page-level SEO: title, description, canonical
  useEffect(() => {
    document.title = 'Momentum-Board – Defizit, Protein, Schritte | GetLeanAI+';
    const desc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (desc) desc.content = 'Dein tägliches Momentum: Kalorien-Defizit, Protein-Delta, Carb-Budget und mehr – inklusive 7‑Tage‑Trend.';
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) canonical.href = `${window.location.origin}/plus`;
  }, []);

  if (flagsLoading) {
    return (
      <div className="container mx-auto px-4 pt-0 pb-6 max-w-5xl space-y-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="container mx-auto px-4 pt-0 pb-6 max-w-5xl space-y-6">
        <Card>
          <CardContent className="py-10 text-center">
            <div className="text-xl font-semibold">Momentum‑Board (Beta)</div>
            <div className="text-muted-foreground mt-2">Dieses Feature ist noch nicht freigeschaltet.</div>
          </CardContent>
        </Card>
      </div>
    );
  }

    <ErrorBoundary>
      <main className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-primary/20 via-background to-background blur-2xl" />
        <div className="container mx-auto px-4 md:px-4 lg:px-4 pt-0 pb-6 max-w-5xl font-display">
          <header className="board-hero animate-fade-in mt-2 mb-5">
            <h1 className="text-3xl md:text-4xl">Momentum-Board</h1>
            <p className="text-muted-foreground mt-1">Dein tägliches Momentum: Defizit, Protein, Schritte & mehr.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-border/40 px-2.5 py-1 text-xs bg-secondary/60">🔥 {missionCompletedCount >= 3 ? 'Tagesmission erfüllt' : 'Tagesmission aktiv'} ({missionCompletedCount}/5)</span>
              <span className="inline-flex items-center rounded-full border border-border/40 px-2.5 py-1 text-xs">Level & Rewards</span>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-5 md:gap-6 lg:gap-8 animate-fade-in">
            <div><StreakLevelHeader /></div>
            <div><NextBestActionCard data={data} /></div>
            <div><PlusDeficitRing data={data} /></div>
            <div><PlusMacroDeltas data={data} /></div>
            <div><PlusTrainingSteps data={data} /></div>
            <div><PlusSupportTiles data={data} /></div>
            <div><MiniJournalQuick /></div>
          </div>
        </div>
        <QuickAddFAB />
      </main>
    </ErrorBoundary>
};

export default MomentumBoard;
